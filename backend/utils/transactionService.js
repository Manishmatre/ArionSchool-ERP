const Transaction = require('../models/Transaction');
const FeeObligation = require('../models/FeeObligation');
const FeePolicy = require('../models/FeePolicy');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');

const PAYMENT_TYPE_TO_CATEGORY = {
  registration: 'student_registration',
  course_fee: 'student_course_fee',
  installment: 'student_installment',
  exam_fee: 'student_exam_fee',
  certificate_fee: 'student_certificate_fee',
  other: 'student_other'
};

const PAYMENT_STATUS_TO_TX_STATUS = {
  pending: 'pending',
  completed: 'completed',
  failed: 'failed',
  refunded: 'refunded'
};

const COMPONENT_FROM_PAYMENT_TYPE = {
  registration: 'registration',
  course_fee: 'course_fee',
  installment: 'course_fee',
  exam_fee: 'exam_fee',
  certificate_fee: 'certificate_fee',
  other: 'other'
};

const generateTransactionNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `TXN-${year}-`;
  const last = await Transaction.findOne({
    transactionNumber: new RegExp(`^${prefix}`)
  }).sort({ transactionNumber: -1 }).select('transactionNumber');

  let seq = 1;
  if (last?.transactionNumber) {
    const parts = last.transactionNumber.split('-');
    seq = parseInt(parts[2], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(6, '0')}`;
};

const mapPaymentToTransaction = (payment, studentDoc) => {
  const studentName = studentDoc?.personalInfo
    ? `${studentDoc.personalInfo.firstName || ''} ${studentDoc.personalInfo.lastName || ''}`.trim()
    : '';

  return {
    direction: 'inflow',
    category: PAYMENT_TYPE_TO_CATEGORY[payment.paymentType] || 'student_other',
    amount: payment.amount,
    currency: 'INR',
    status: PAYMENT_STATUS_TO_TX_STATUS[payment.paymentStatus] || 'pending',
    franchise: payment.franchise,
    party: {
      type: 'student',
      id: payment.student,
      name: studentName
    },
    references: {
      student: payment.student,
      course: payment.course,
      payment: payment._id
    },
    paymentMethod: payment.paymentMethod || 'cash',
    gateway: {
      provider: payment.paymentMethod === 'online' ? 'razorpay' : 'manual',
      orderId: payment.transactionDetails?.razorpayOrderId,
      paymentId: payment.transactionDetails?.razorpayPaymentId,
      signature: payment.transactionDetails?.razorpaySignature
    },
    bankDetails: {
      chequeNumber: payment.transactionDetails?.chequeNumber,
      bankName: payment.transactionDetails?.bankName,
      upiId: payment.transactionDetails?.upiId,
      transactionRef: payment.transactionDetails?.transactionId
    },
    receiptNumber: payment.receiptNumber,
    receiptUrl: payment.receiptPDF || undefined,
    dueDate: payment.dueDate,
    paidAt: payment.paymentStatus === 'completed' ? (payment.paymentDate || payment.createdAt) : undefined,
    collectedBy: payment.collectedBy,
    description: payment.description,
    remarks: payment.remarks
  };
};

const syncFromPayment = async (payment, options = {}) => {
  if (!payment?._id) return null;

  const existing = await Transaction.findOne({
    'references.payment': payment._id
  });

  let studentDoc = options.student;
  if (!studentDoc && payment.student) {
    studentDoc = await Student.findById(payment.student).select('personalInfo');
  }

  const payload = mapPaymentToTransaction(payment, studentDoc);

  if (existing) {
    Object.assign(existing, payload);
    if (!existing.transactionNumber) {
      existing.transactionNumber = await generateTransactionNumber();
    }
    await existing.save();
    if (payload.status === 'completed') {
      await allocateInflowToObligations(existing);
    }
    return existing;
  }

  const transaction = await Transaction.create({
    transactionNumber: await generateTransactionNumber(),
    ...payload,
    metadata: options.metadata || undefined
  });

  if (payload.status === 'completed') {
    await allocateInflowToObligations(transaction);
  }

  return transaction;
};

const syncFromStaffSalary = async (salary, paidBy) => {
  if (!salary?._id) return null;

  const existing = await Transaction.findOne({
    'references.staffSalary': salary._id
  });

  const staff = await Staff.findById(salary.staff).select('personalInfo staffId');
  const staffName = staff?.personalInfo
    ? `${staff.personalInfo.firstName || ''} ${staff.personalInfo.lastName || ''}`.trim()
    : '';

  const payload = {
    direction: 'outflow',
    category: 'staff_salary',
    amount: salary.netSalary,
    currency: 'INR',
    status: salary.status === 'paid' ? 'completed' : 'pending',
    franchise: salary.franchise,
    party: {
      type: 'staff',
      id: salary.staff,
      name: staffName
    },
    references: {
      staff: salary.staff,
      staffSalary: salary._id
    },
    paymentMethod: salary.paymentMode || 'bank_transfer',
    bankDetails: {
      transactionRef: salary.transactionId
    },
    paidAt: salary.paidAt || salary.paymentDate,
    paidBy,
    description: `Salary for ${salary.month}/${salary.year}`,
    remarks: salary.remarks
  };

  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return existing;
  }

  return Transaction.create({
    transactionNumber: await generateTransactionNumber(),
    ...payload
  });
};

const syncFromAdvancePayment = async (advance) => {
  if (!advance?._id || advance.status !== 'paid') return null;

  const existing = await Transaction.findOne({
    'references.advancePayment': advance._id
  });

  const staff = await Staff.findById(advance.staff).select('personalInfo');
  const staffName = staff?.personalInfo
    ? `${staff.personalInfo.firstName || ''} ${staff.personalInfo.lastName || ''}`.trim()
    : '';

  const payload = {
    direction: 'outflow',
    category: 'staff_advance',
    amount: advance.amount,
    currency: 'INR',
    status: 'completed',
    franchise: advance.franchise,
    party: {
      type: 'staff',
      id: advance.staff,
      name: staffName
    },
    references: {
      staff: advance.staff,
      advancePayment: advance._id
    },
    paymentMethod: advance.paymentMode || 'cash',
    bankDetails: {
      transactionRef: advance.transactionId
    },
    paidAt: advance.paidDate || advance.updatedAt,
    description: advance.reason || 'Staff advance payment',
    remarks: advance.remarks
  };

  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return existing;
  }

  return Transaction.create({
    transactionNumber: await generateTransactionNumber(),
    ...payload
  });
};

const allocateInflowToObligations = async (transaction) => {
  if (!transaction || transaction.direction !== 'inflow' || transaction.status !== 'completed') {
    return;
  }

  const studentId = transaction.references?.student;
  if (!studentId) return;

  let remaining = transaction.amount;
  const component = COMPONENT_FROM_PAYMENT_TYPE[
    Object.keys(PAYMENT_TYPE_TO_CATEGORY).find(
      (k) => PAYMENT_TYPE_TO_CATEGORY[k] === transaction.category
    )
  ] || 'other';

  const obligations = await FeeObligation.find({
    student: studentId,
    status: { $in: ['open', 'partial', 'overdue'] },
    ...(transaction.references?.course ? { course: transaction.references.course } : {}),
    component: { $in: [component, 'total', 'other'] }
  }).sort({ dueDate: 1, createdAt: 1 });

  for (const obligation of obligations) {
    if (remaining <= 0) break;
    const apply = Math.min(remaining, obligation.amountPending);
    if (apply <= 0) continue;

    obligation.amountPaid += apply;
    obligation.recalculate();
    await obligation.save();
    remaining -= apply;
  }
};

const getOrCreateFeePolicyForCourse = async (course, franchiseId, createdBy) => {
  let policy = await FeePolicy.findOne({
    course: course._id,
    franchise: franchiseId || null,
    isActive: true
  });

  if (!policy) {
    policy = await FeePolicy.findOne({
      course: course._id,
      franchise: null,
      isActive: true
    });
  }

  if (!policy) {
    policy = await FeePolicy.create({
      scope: franchiseId ? 'franchise' : 'course',
      franchise: franchiseId || undefined,
      course: course._id,
      components: {
        registrationFee: course.registrationFee || 0,
        courseFee: course.discountedFee || course.regularFee || course.price || 0,
        examFee: course.examFee || 0,
        certificateFee: course.certificateFee || 0,
        otherFees: 0
      },
      isActive: true,
      createdBy
    });
  }

  return policy;
};

const createObligationsFromEnrollment = async (studentId, courseId, franchiseId, createdBy, customCourseFee) => {
  const Course = require('../models/Course');
  const course = await Course.findById(courseId);
  if (!course) return [];

  const policy = await getOrCreateFeePolicyForCourse(course, franchiseId, createdBy);
  const courseFeeAmount = (customCourseFee !== undefined && customCourseFee !== null && !isNaN(Number(customCourseFee)))
    ? Number(customCourseFee)
    : policy.components.courseFee;

  const components = [
    { component: 'registration', amount: policy.components.registrationFee },
    { component: 'course_fee', amount: courseFeeAmount },
    { component: 'exam_fee', amount: policy.components.examFee },
    { component: 'certificate_fee', amount: policy.components.certificateFee }
  ].filter((c) => c.amount > 0);

  const created = [];
  for (const item of components) {
    const existing = await FeeObligation.findOne({
      student: studentId,
      course: courseId,
      component: item.component,
      status: { $nin: ['cancelled', 'waived'] }
    });

    if (existing) {
      if (item.component === 'course_fee' && customCourseFee !== undefined && customCourseFee !== null && !isNaN(Number(customCourseFee))) {
        existing.amountDue = courseFeeAmount;
        existing.recalculate();
        await existing.save();
      }
      created.push(existing);
      continue;
    }

    const obligation = await FeeObligation.create({
      student: studentId,
      franchise: franchiseId,
      course: courseId,
      feePolicy: policy._id,
      component: item.component,
      amountDue: item.amount,
      amountPaid: 0,
      amountPending: item.amount,
      status: 'open',
      source: 'enrollment',
      description: `${item.component} for ${course.title}`
    });
    created.push(obligation);
  }

  return created;
};

const getFinancialStats = async (franchiseFilter = {}) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const baseMatch = { ...franchiseFilter, status: 'completed' };

  const [
    totalInflow,
    totalOutflow,
    monthlyInflow,
    monthlyOutflow,
    pendingInflow,
    pendingOutflow,
    byCategory
  ] = await Promise.all([
    Transaction.aggregate([
      { $match: { ...baseMatch, direction: 'inflow' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Transaction.aggregate([
      { $match: { ...baseMatch, direction: 'outflow' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Transaction.aggregate([
      { $match: { ...baseMatch, direction: 'inflow', paidAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Transaction.aggregate([
      { $match: { ...baseMatch, direction: 'outflow', paidAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Transaction.countDocuments({ ...franchiseFilter, direction: 'inflow', status: 'pending' }),
    Transaction.countDocuments({ ...franchiseFilter, direction: 'outflow', status: 'pending' }),
    Transaction.aggregate([
      { $match: baseMatch },
      { $group: { _id: { direction: '$direction', category: '$category' }, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
  ]);

  const income = totalInflow[0]?.total || 0;
  const expenses = totalOutflow[0]?.total || 0;
  const monthIncome = monthlyInflow[0]?.total || 0;
  const monthExpenses = monthlyOutflow[0]?.total || 0;

  const receivables = await FeeObligation.aggregate([
    { $match: { ...franchiseFilter, status: { $in: ['open', 'partial', 'overdue'] } } },
    { $group: { _id: null, total: { $sum: '$amountPending' }, count: { $sum: 1 } } }
  ]);

  return {
    totalIncome: income,
    totalExpenses: expenses,
    netRevenue: income - expenses,
    monthlyIncome: monthIncome,
    monthlyExpenses: monthExpenses,
    monthlyNetRevenue: monthIncome - monthExpenses,
    pendingInflowCount: pendingInflow,
    pendingOutflowCount: pendingOutflow,
    outstandingReceivables: receivables[0]?.total || 0,
    outstandingReceivableCount: receivables[0]?.count || 0,
    byCategory
  };
};

const normalizeFranchiseId = (franchiseId) => {
  if (franchiseId == null || franchiseId === '') return null;
  const raw = typeof franchiseId === 'object' && franchiseId._id != null
    ? franchiseId._id
    : franchiseId;
  if (!mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(String(raw));
};

const buildFranchiseFilter = (franchiseId) => {
  const id = normalizeFranchiseId(franchiseId);
  return id ? { franchise: id } : {};
};

/**
 * Single source of truth for franchise financials — merges ledger + legacy payments.
 */
const getFranchiseFinancialSummary = async (franchiseId) => {
  const filter = buildFranchiseFilter(franchiseId);
  const franchiseObjectId = filter.franchise;

  if (!franchiseObjectId) {
    const ledgerStats = await getFinancialStats({});
    const totalIncome = ledgerStats.totalIncome || 0;
    const totalExpenses = ledgerStats.totalExpenses || 0;
    return {
      ...ledgerStats,
      totalRevenue: totalIncome,
      netRevenue: totalIncome - totalExpenses
    };
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [ledgerStats, paymentIncomeResult, paymentMonthlyResult] = await Promise.all([
    getFinancialStats(filter),
    Payment.aggregate([
      { $match: { franchise: franchiseObjectId, paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Payment.aggregate([
      {
        $match: {
          franchise: franchiseObjectId,
          paymentStatus: 'completed',
          paymentDate: { $gte: startOfMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);

  const paymentIncome = paymentIncomeResult[0]?.total || 0;
  const paymentMonthly = paymentMonthlyResult[0]?.total || 0;
  const ledgerIncome = ledgerStats.totalIncome || 0;
  const ledgerMonthly = ledgerStats.monthlyIncome || 0;
  const totalExpenses = ledgerStats.totalExpenses || 0;
  const monthlyExpenses = ledgerStats.monthlyExpenses || 0;

  const totalIncome = Math.max(ledgerIncome, paymentIncome);
  const monthlyIncome = Math.max(ledgerMonthly, paymentMonthly);
  const netRevenue = totalIncome - totalExpenses;
  const monthlyNetRevenue = monthlyIncome - monthlyExpenses;

  return {
    ...ledgerStats,
    totalIncome,
    totalRevenue: totalIncome,
    totalExpenses,
    monthlyIncome,
    monthlyExpenses,
    netRevenue,
    monthlyNetRevenue,
    ledgerIncome,
    paymentIncome
  };
};

const paymentToTransactionView = (payment) => ({
  _id: payment._id,
  transactionNumber: payment.receiptNumber,
  direction: 'inflow',
  category: PAYMENT_TYPE_TO_CATEGORY[payment.paymentType] || 'student_other',
  amount: payment.amount,
  status: PAYMENT_STATUS_TO_TX_STATUS[payment.paymentStatus],
  franchise: payment.franchise,
  references: { student: payment.student, course: payment.course, payment: payment._id },
  paymentMethod: payment.paymentMethod,
  receiptNumber: payment.receiptNumber,
  dueDate: payment.dueDate,
  paidAt: payment.paymentDate,
  description: payment.description,
  student: payment.student,
  course: payment.course,
  collectedBy: payment.collectedBy,
  paymentType: payment.paymentType,
  paymentStatus: payment.paymentStatus,
  isLegacyPayment: true
});

module.exports = {
  PAYMENT_TYPE_TO_CATEGORY,
  PAYMENT_STATUS_TO_TX_STATUS,
  generateTransactionNumber,
  mapPaymentToTransaction,
  syncFromPayment,
  syncFromStaffSalary,
  syncFromAdvancePayment,
  allocateInflowToObligations,
  getOrCreateFeePolicyForCourse,
  createObligationsFromEnrollment,
  getFinancialStats,
  normalizeFranchiseId,
  buildFranchiseFilter,
  getFranchiseFinancialSummary,
  paymentToTransactionView
};
