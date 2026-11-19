const FeePolicy = require('../models/FeePolicy');
const FeeObligation = require('../models/FeeObligation');
const FeeConcession = require('../models/FeeConcession');
const SchoolFeeReceipt = require('../models/SchoolFeeReceipt');
const Transaction = require('../models/Transaction');
const Student = require('../models/Student');
const SchoolClass = require('../models/SchoolClass');
const AcademicSession = require('../models/AcademicSession');
const Franchise = require('../models/SchoolCampus');

const getTenantFranchiseId = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

// ==========================================
// 1. CLASS-WISE FEE STRUCTURES
// ==========================================

exports.getFeeStructures = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchiseId(req);
    const query = { scope: 'school_class' };
    if (franchiseId) query.franchise = franchiseId;

    if (req.query.schoolClass) query.schoolClass = req.query.schoolClass;
    if (req.query.academicSession) query.academicSession = req.query.academicSession;

    const policies = await FeePolicy.find(query)
      .populate('schoolClass', 'name code order')
      .populate('academicSession', 'sessionName isCurrent')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: policies.length,
      data: policies
    });
  } catch (error) {
    next(error);
  }
};

exports.saveFeeStructure = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchiseId(req);
    if (!franchiseId) {
      return res.status(400).json({ success: false, message: 'School/School ID is required' });
    }

    const {
      schoolClass,
      academicSession,
      frequency,
      components,
      installments,
      lateFine,
      effectiveFrom
    } = req.body;

    if (!schoolClass) {
      return res.status(400).json({ success: false, message: 'Class selection is required' });
    }

    let policy = await FeePolicy.findOne({
      franchise: franchiseId,
      schoolClass,
      academicSession: academicSession || null
    });

    if (policy) {
      policy.frequency = frequency || policy.frequency;
      policy.components = components || policy.components;
      policy.installments = installments || policy.installments;
      policy.lateFine = lateFine || policy.lateFine;
      policy.effectiveFrom = effectiveFrom || policy.effectiveFrom;
      await policy.save();
    } else {
      policy = await FeePolicy.create({
        scope: 'school_class',
        franchise: franchiseId,
        schoolClass,
        academicSession,
        frequency: frequency || 'monthly',
        components: components || {},
        installments: installments || [],
        lateFine: lateFine || { graceDays: 10, fineType: 'fixed', amount: 50 },
        createdBy: req.user._id
      });
    }

    const populated = await FeePolicy.findById(policy._id)
      .populate('schoolClass', 'name code')
      .populate('academicSession', 'sessionName');

    res.status(200).json({
      success: true,
      message: 'School fee structure saved successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. STUDENT FEE DUES & OBLIGATIONS
// ==========================================

exports.getStudentFees = async (req, res, next) => {
  try {
    const studentId = req.params.studentId;
    const student = await Student.findById(studentId)
      .populate('schoolClass', 'name code')
      .populate('section', 'name')
      .populate('academicSession', 'sessionName');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Role security check
    if (req.user.role === 'student' && student.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied to other student fees' });
    }
    if (req.user.role === 'parent') {
      const isParentLinked =
        (student.parent && student.parent.toString() === req.user._id.toString()) ||
        (Array.isArray(req.user.linkedStudents) && req.user.linkedStudents.map((id) => id.toString()).includes(student._id.toString())) ||
        (student.guardianInfo?.mobile === req.user.mobile);
      if (!isParentLinked) {
        return res.status(403).json({ success: false, message: 'Access denied: not authorized parent' });
      }
    }

    const obligations = await FeeObligation.find({ student: student._id })
      .sort({ dueDate: 1, createdAt: 1 });

    const receipts = await SchoolFeeReceipt.find({ student: student._id })
      .sort({ paidAt: -1 });

    const concessions = await FeeConcession.find({ student: student._id, status: 'approved' });

    const totalDue = obligations.reduce((acc, o) => acc + (o.amountDue || 0), 0);
    const totalPaid = obligations.reduce((acc, o) => acc + (o.amountPaid || 0), 0);
    const totalPending = obligations.reduce((acc, o) => acc + (o.amountPending || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        student: {
          _id: student._id,
          fullName: student.fullName,
          studentId: student.studentId,
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber,
          schoolClass: student.schoolClass,
          section: student.section,
          academicSession: student.academicSession
        },
        summary: {
          totalDue,
          totalPaid,
          totalPending
        },
        obligations,
        receipts,
        concessions
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. COLLECT FEE PAYMENT & GENERATE RECEIPT
// ==========================================

exports.collectFee = async (req, res, next) => {
  try {
    const {
      studentId,
      amount,
      paymentMethod,
      breakdown,
      remarks,
      gatewayPaymentId,
      applyLateFine
    } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount required' });
    }

    const franchiseId = student.franchise;
    const year = new Date().getFullYear();

    // Generate Unique Receipt Number
    const lastReceipt = await SchoolFeeReceipt.findOne({ receiptNumber: { $regex: `^REC-${year}-` } })
      .sort({ receiptNumber: -1 })
      .select('receiptNumber');

    let nextSeq = 1;
    if (lastReceipt && lastReceipt.receiptNumber) {
      const parts = lastReceipt.receiptNumber.split('-');
      if (parts.length === 3) nextSeq = parseInt(parts[2], 10) + 1;
    }
    const receiptNumber = `REC-${year}-${String(nextSeq).padStart(4, '0')}`;

    // 1. Create Transaction in Unified Ledger
    const lastTx = await Transaction.findOne({ transactionNumber: { $regex: `^TXN-${year}-` } })
      .sort({ transactionNumber: -1 })
      .select('transactionNumber');
    let txSeq = 1;
    if (lastTx && lastTx.transactionNumber) {
      const parts = lastTx.transactionNumber.split('-');
      if (parts.length === 3) txSeq = parseInt(parts[2], 10) + 1;
    }
    const transactionNumber = `TXN-${year}-${String(txSeq).padStart(4, '0')}`;

    const transaction = await Transaction.create({
      transactionNumber,
      direction: 'inflow',
      category: 'student_course_fee',
      amount: paymentAmount,
      currency: 'INR',
      status: 'completed',
      franchise: franchiseId,
      party: {
        type: 'student',
        id: student._id,
        name: student.fullName
      },
      references: {
        student: student._id
      },
      paymentMethod: paymentMethod || 'cash',
      receiptNumber,
      paidAt: new Date(),
      collectedBy: req.user._id,
      description: `School Fee Collection: ${student.fullName} (${receiptNumber})`,
      remarks: remarks || 'Fee collected at counter'
    });

    // 2. Distribute payment across open obligations
    let remainingToAllocate = paymentAmount;
    const openObligations = await FeeObligation.find({
      student: student._id,
      status: { $in: ['open', 'partial', 'overdue'] }
    }).sort({ dueDate: 1, createdAt: 1 });

    for (const ob of openObligations) {
      if (remainingToAllocate <= 0) break;
      const payableOnThis = Math.min(remainingToAllocate, ob.amountPending);
      ob.amountPaid = (ob.amountPaid || 0) + payableOnThis;
      ob.amountPending = Math.max(0, ob.amountDue - ob.amountPaid);
      ob.status = ob.amountPending === 0 ? 'paid' : 'partial';
      ob.receiptNumber = receiptNumber;
      await ob.save();
      remainingToAllocate -= payableOnThis;
    }

    // 3. Update Student total fee tracking
    student.fees.paidAmount = (student.fees.paidAmount || 0) + paymentAmount;
    student.fees.pendingAmount = Math.max(0, (student.fees.totalFees || 0) - student.fees.paidAmount);
    student.fees.lastPaymentDate = new Date();
    await student.save();

    // 4. Create Fee Receipt
    const receipt = await SchoolFeeReceipt.create({
      receiptNumber,
      student: student._id,
      franchise: franchiseId,
      schoolClass: student.schoolClass,
      academicSession: student.academicSession,
      amount: paymentAmount,
      paymentMethod: paymentMethod || 'cash',
      transaction: transaction._id,
      gatewayPaymentId,
      breakdown: breakdown || [{ component: 'Tuition & Academic Fees', amount: paymentAmount }],
      lateFinePaid: applyLateFine ? Number(applyLateFine) : 0,
      collectedBy: req.user._id,
      remarks
    });

    res.status(201).json({
      success: true,
      message: 'Fee payment successfully recorded and receipt generated',
      data: {
        receipt,
        transaction,
        updatedStudentFees: student.fees
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. FEE DEFAULTERS REGISTER
// ==========================================

exports.getDefaulters = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchiseId(req);
    const query = {
      status: { $in: ['open', 'partial', 'overdue'] }
    };
    if (franchiseId) query.franchise = franchiseId;

    if (req.query.schoolClass) query.schoolClass = req.query.schoolClass;

    const overdueObligations = await FeeObligation.find(query)
      .populate({
        path: 'student',
        select: 'studentId admissionNumber rollNumber personalInfo contactInfo guardianInfo schoolClass section',
        populate: [
          { path: 'schoolClass', select: 'name code' },
          { path: 'section', select: 'name' }
        ]
      })
      .sort({ dueDate: 1 });

    // Group overdue obligations by student
    const defaultersMap = {};
    for (const ob of overdueObligations) {
      if (!ob.student) continue;
      const sid = ob.student._id.toString();
      if (!defaultersMap[sid]) {
        defaultersMap[sid] = {
          student: ob.student,
          totalPending: 0,
          pendingComponents: [],
          earliestDueDate: ob.dueDate,
          daysOverdue: 0
        };
      }
      defaultersMap[sid].totalPending += ob.amountPending || 0;
      defaultersMap[sid].pendingComponents.push({
        component: ob.component,
        amountDue: ob.amountDue,
        amountPending: ob.amountPending,
        dueDate: ob.dueDate
      });
      if (ob.dueDate && new Date(ob.dueDate) < new Date(defaultersMap[sid].earliestDueDate)) {
        defaultersMap[sid].earliestDueDate = ob.dueDate;
      }
    }

    const now = new Date();
    const defaultersList = Object.values(defaultersMap).map((item) => {
      if (item.earliestDueDate) {
        const diffDays = Math.floor((now - new Date(item.earliestDueDate)) / (1000 * 60 * 60 * 24));
        item.daysOverdue = Math.max(0, diffDays);
      }
      return item;
    }).sort((a, b) => b.totalPending - a.totalPending);

    res.status(200).json({
      success: true,
      count: defaultersList.length,
      data: defaultersList
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. FEE CONCESSIONS & SCHOLARSHIPS
// ==========================================

exports.createConcession = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchiseId(req);
    const {
      student,
      concessionType,
      value,
      applicableComponent,
      category,
      reason
    } = req.body;

    const targetStudent = await Student.findById(student);
    if (!targetStudent) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const concession = await FeeConcession.create({
      student,
      franchise: franchiseId || targetStudent.franchise,
      schoolClass: targetStudent.schoolClass,
      academicSession: targetStudent.academicSession,
      concessionType: concessionType || 'percentage',
      value: Number(value),
      applicableComponent: applicableComponent || 'tuition',
      category: category || 'merit_scholarship',
      reason,
      approvedBy: req.user._id,
      status: 'approved'
    });

    res.status(201).json({
      success: true,
      message: 'Concession / Scholarship successfully approved and applied',
      data: concession
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. DAILY COLLECTION REPORT
// ==========================================

exports.getDailyCollectionReport = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchiseId(req);
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const startDate = new Date(`${dateStr}T00:00:00.000Z`);
    const endDate = new Date(`${dateStr}T23:59:59.999Z`);

    const query = {
      paidAt: { $gte: startDate, $lte: endDate }
    };
    if (franchiseId) query.franchise = franchiseId;

    const receipts = await SchoolFeeReceipt.find(query)
      .populate('student', 'personalInfo.firstName personalInfo.lastName studentId admissionNumber rollNumber')
      .populate('schoolClass', 'name code')
      .populate('collectedBy', 'name');

    const totalCollected = receipts.reduce((acc, r) => acc + (r.amount || 0), 0);

    const byPaymentMethod = {};
    for (const r of receipts) {
      const mode = r.paymentMethod || 'cash';
      byPaymentMethod[mode] = (byPaymentMethod[mode] || 0) + r.amount;
    }

    res.status(200).json({
      success: true,
      date: dateStr,
      totalCollected,
      count: receipts.length,
      byPaymentMethod,
      receipts
    });
  } catch (error) {
    next(error);
  }
};
