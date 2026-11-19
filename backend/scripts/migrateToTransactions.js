/**
 * Migration script: copy legacy financial records into unified Transaction ledger
 *
 * Usage:
 *   node scripts/migrateToTransactions.js
 *   node scripts/migrateToTransactions.js --dry-run
 *   node scripts/migrateToTransactions.js --obligations
 *   node scripts/migrateToTransactions.js --fee-policies
 *
 * Safe to re-run (idempotent) — skips records already migrated via metadata.legacyId
 */

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../config/db');
const Payment = require('../models/Payment');
const StaffSalary = require('../models/StaffSalary');
const AdvancePayment = require('../models/AdvancePayment');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Transaction = require('../models/Transaction');
const FeePolicy = require('../models/FeePolicy');
const FeeObligation = require('../models/FeeObligation');
const {
  syncFromPayment,
  syncFromStaffSalary,
  syncFromAdvancePayment,
  getOrCreateFeePolicyForCourse,
  createObligationsFromEnrollment
} = require('../utils/transactionService');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ONLY_OBLIGATIONS = args.includes('--obligations');
const ONLY_FEE_POLICIES = args.includes('--fee-policies');
const SKIP_PAYMENTS = args.includes('--skip-payments');

const log = (msg) => console.log(`[migrate] ${msg}`);

const migratePayments = async () => {
  const payments = await Payment.find({}).sort('createdAt');
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const payment of payments) {
    try {
      const existing = await Transaction.findOne({
        'metadata.legacyModel': 'Payment',
        'metadata.legacyId': payment._id
      });

      if (existing && !DRY_RUN) {
        const student = await Student.findById(payment.student).select('personalInfo');
        await syncFromPayment(payment, { student });
        updated++;
        continue;
      }

      if (DRY_RUN) {
        log(`Would migrate Payment ${payment._id} (${payment.receiptNumber}) ₹${payment.amount}`);
        created++;
        continue;
      }

      const student = await Student.findById(payment.student).select('personalInfo');
      await syncFromPayment(payment, {
        student,
        metadata: {
          legacyModel: 'Payment',
          legacyId: payment._id,
          migratedAt: new Date()
        }
      });
      created++;
    } catch (err) {
      errors++;
      console.error(`Payment ${payment._id} error:`, err.message);
    }
  }

  return { total: payments.length, created, updated, skipped, errors };
};

const migrateStaffSalaries = async () => {
  const salaries = await StaffSalary.find({ status: 'paid' });
  let created = 0;
  let errors = 0;

  for (const salary of salaries) {
    try {
      const existing = await Transaction.findOne({
        'references.staffSalary': salary._id
      });

      if (existing) {
        if (!DRY_RUN) await syncFromStaffSalary(salary, salary.paidBy);
        continue;
      }

      if (DRY_RUN) {
        log(`Would migrate StaffSalary ${salary._id} ₹${salary.netSalary}`);
        created++;
        continue;
      }

      const tx = await syncFromStaffSalary(salary, salary.paidBy);
      if (tx) {
        tx.metadata = {
          legacyModel: 'StaffSalary',
          legacyId: salary._id,
          migratedAt: new Date()
        };
        await tx.save();
        created++;
      }
    } catch (err) {
      errors++;
      console.error(`StaffSalary ${salary._id} error:`, err.message);
    }
  }

  return { total: salaries.length, created, errors };
};

const migrateAdvances = async () => {
  const advances = await AdvancePayment.find({ status: 'paid' });
  let created = 0;
  let errors = 0;

  for (const advance of advances) {
    try {
      const existing = await Transaction.findOne({
        'references.advancePayment': advance._id
      });

      if (existing) continue;

      if (DRY_RUN) {
        log(`Would migrate AdvancePayment ${advance._id} ₹${advance.amount}`);
        created++;
        continue;
      }

      const tx = await syncFromAdvancePayment(advance);
      if (tx) {
        tx.metadata = {
          legacyModel: 'AdvancePayment',
          legacyId: advance._id,
          migratedAt: new Date()
        };
        await tx.save();
        created++;
      }
    } catch (err) {
      errors++;
      console.error(`AdvancePayment ${advance._id} error:`, err.message);
    }
  }

  return { total: advances.length, created, errors };
};

const migrateFeePolicies = async () => {
  const courses = await Course.find({});
  let created = 0;

  for (const course of courses) {
    const exists = await FeePolicy.findOne({ course: course._id, franchise: null });
    if (exists) continue;

    if (DRY_RUN) {
      log(`Would create FeePolicy for course ${course.title}`);
      created++;
      continue;
    }

    await getOrCreateFeePolicyForCourse(course, null, null);
    created++;
  }

  return { total: courses.length, created };
};

const migrateObligations = async () => {
  const students = await Student.find({}).populate({
    path: 'enrolledCourses',
    select: 'course',
    model: Enrollment
  });
  let created = 0;
  let errors = 0;

  for (const student of students) {
    try {
      const courseIds = new Set();

      for (const enrollment of student.enrolledCourses || []) {
        const courseId = enrollment?.course || enrollment;
        if (courseId) courseIds.add(String(courseId));
      }

      const paymentCourses = await Payment.find({ student: student._id }).distinct('course');
      paymentCourses.forEach((id) => id && courseIds.add(String(id)));

      for (const courseId of courseIds) {

        const existing = await FeeObligation.findOne({
          student: student._id,
          course: courseId,
          source: { $ne: 'migration' }
        });

        if (existing) continue;

        if (DRY_RUN) {
          log(`Would create obligations for student ${student._id} course ${courseId}`);
          created++;
          continue;
        }

        await createObligationsFromEnrollment(
          student._id,
          courseId,
          student.franchise,
          null
        );
        created++;
      }

      // Backfill paid amounts from student.fees if obligations exist
      if (!DRY_RUN && student.fees?.paidAmount > 0) {
        const obligations = await FeeObligation.find({
          student: student._id,
          status: { $in: ['open', 'partial', 'overdue'] }
        }).sort('createdAt');

        let remaining = student.fees.paidAmount;
        for (const ob of obligations) {
          if (remaining <= 0) break;
          const apply = Math.min(remaining, ob.amountDue - ob.amountPaid);
          if (apply <= 0) continue;
          ob.amountPaid += apply;
          ob.recalculate();
          ob.source = ob.source || 'migration';
          await ob.save();
          remaining -= apply;
        }
      }
    } catch (err) {
      errors++;
      console.error(`Student ${student._id} obligation error:`, err.message);
    }
  }

  return { total: students.length, created, errors };
};

const printValidation = async () => {
  const [paymentTotal, txInflow, txOutflow, obligationPending] = await Promise.all([
    Payment.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    Transaction.aggregate([
      { $match: { direction: 'inflow', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    Transaction.aggregate([
      { $match: { direction: 'outflow', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    FeeObligation.aggregate([
      { $match: { status: { $in: ['open', 'partial', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$amountPending' } } }
    ])
  ]);

  log('--- Validation Summary ---');
  log(`Legacy completed payments: ${paymentTotal[0]?.count || 0} records, ₹${paymentTotal[0]?.total || 0}`);
  log(`Transaction inflow (completed): ${txInflow[0]?.count || 0} records, ₹${txInflow[0]?.total || 0}`);
  log(`Transaction outflow (completed): ${txOutflow[0]?.count || 0} records, ₹${txOutflow[0]?.total || 0}`);
  log(`Net revenue: ₹${(txInflow[0]?.total || 0) - (txOutflow[0]?.total || 0)}`);
  log(`Outstanding receivables (obligations): ₹${obligationPending[0]?.total || 0}`);
};

const run = async () => {
  log(DRY_RUN ? 'DRY RUN — no writes' : 'LIVE RUN — writing to database');
  await connectDB();

  const results = {};

  if (!ONLY_OBLIGATIONS && !ONLY_FEE_POLICIES && !SKIP_PAYMENTS) {
    log('Migrating Payments → Transactions...');
    results.payments = await migratePayments();
    log(`Payments: ${JSON.stringify(results.payments)}`);

    log('Migrating paid StaffSalary → Transactions...');
    results.salaries = await migrateStaffSalaries();
    log(`Salaries: ${JSON.stringify(results.salaries)}`);

    log('Migrating paid AdvancePayment → Transactions...');
    results.advances = await migrateAdvances();
    log(`Advances: ${JSON.stringify(results.advances)}`);
  }

  if (!ONLY_FEE_POLICIES && !SKIP_PAYMENTS) {
    log('Syncing FeePolicies from courses...');
    results.feePolicies = await migrateFeePolicies();
    log(`FeePolicies: ${JSON.stringify(results.feePolicies)}`);

    log('Creating FeeObligations from student enrollments...');
    results.obligations = await migrateObligations();
    log(`Obligations: ${JSON.stringify(results.obligations)}`);
  }

  if (ONLY_FEE_POLICIES) {
    log('Syncing FeePolicies from courses...');
    results.feePolicies = await migrateFeePolicies();
    log(`FeePolicies: ${JSON.stringify(results.feePolicies)}`);
  }

  if (ONLY_OBLIGATIONS) {
    log('Creating FeeObligations from student enrollments...');
    results.obligations = await migrateObligations();
    log(`Obligations: ${JSON.stringify(results.obligations)}`);
  }

  if (!DRY_RUN) {
    await printValidation();
  }

  log('Migration complete.');
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
