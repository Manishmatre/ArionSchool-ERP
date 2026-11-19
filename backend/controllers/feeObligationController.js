const FeeObligation = require('../models/FeeObligation');
const { isSchoolTenantUser } = require('../utils/tenantAccess');
const Student = require('../models/Student');
const {
  createObligationsFromEnrollment,
  allocateInflowToObligations
} = require('../utils/transactionService');

exports.getStudentObligations = async (req, res, next) => {
  try {
    let studentId = req.params.studentId;
    const student = await Student.findOne({ user: studentId }) || await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (req.user.role === 'student' && student.user?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view these obligations' });
    }

    studentId = student._id;

    const obligations = await FeeObligation.find({ student: studentId })
      .populate('course', 'title')
      .populate('franchise', 'name code')
      .sort('dueDate createdAt');

    const summary = obligations.reduce(
      (acc, o) => {
        acc.totalDue += o.amountDue;
        acc.totalPaid += o.amountPaid;
        acc.totalPending += o.amountPending;
        return acc;
      },
      { totalDue: 0, totalPaid: 0, totalPending: 0 }
    );

    res.status(200).json({
      success: true,
      count: obligations.length,
      summary,
      data: obligations
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllObligations = async (req, res, next) => {
  try {
    const query = {};
    if (isSchoolTenantUser(req.user)) {
      query.franchise = req.user.franchise;
    } else if (req.query.franchise) {
      query.franchise = req.query.franchise;
    }
    if (req.query.status) query.status = req.query.status;

    const obligations = await FeeObligation.find(query)
      .populate('student', 'studentId personalInfo')
      .populate('course', 'title')
      .populate('franchise', 'name code')
      .sort('-amountPending -dueDate');

    res.status(200).json({ success: true, count: obligations.length, data: obligations });
  } catch (error) {
    next(error);
  }
};

exports.generateFromEnrollment = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.body;
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const obligations = await createObligationsFromEnrollment(
      studentId,
      courseId,
      student.franchise,
      req.user._id
    );

    res.status(201).json({
      success: true,
      message: 'Fee obligations created',
      data: obligations
    });
  } catch (error) {
    next(error);
  }
};

exports.waiveObligation = async (req, res, next) => {
  try {
    const obligation = await FeeObligation.findById(req.params.id);
    if (!obligation) {
      return res.status(404).json({ success: false, message: 'Obligation not found' });
    }

    obligation.status = 'waived';
    obligation.amountPending = 0;
    await obligation.save();

    res.status(200).json({ success: true, data: obligation });
  } catch (error) {
    next(error);
  }
};

exports.reconcileStudent = async (req, res, next) => {
  try {
    const studentId = req.params.studentId;
    const Transaction = require('../models/Transaction');

    const completedInflows = await Transaction.find({
      'references.student': studentId,
      direction: 'inflow',
      status: 'completed'
    });

    for (const tx of completedInflows) {
      await allocateInflowToObligations(tx);
    }

    const obligations = await FeeObligation.find({ student: studentId });
    res.status(200).json({
      success: true,
      message: 'Student obligations reconciled from transaction ledger',
      data: obligations
    });
  } catch (error) {
    next(error);
  }
};
