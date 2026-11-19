const AdvancePayment = require('../models/AdvancePayment');
const { isSchoolTenantUser } = require('../utils/tenantAccess');
const Staff = require('../models/Staff');
const { syncFromAdvancePayment } = require('../utils/transactionService');

// @desc    Request advance payment
// @route   POST /api/advance-payment
// @access  Private
exports.requestAdvance = async (req, res, next) => {
  try {
    const { staffId, amount, reason, installments } = req.body;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const advance = await AdvancePayment.create({
      staff: staffId,
      franchise: staff.franchise,
      amount,
      reason,
      deductionSchedule: {
        startMonth: currentMonth,
        startYear: currentYear,
        installments: installments || 1,
        amountPerInstallment: amount / (installments || 1)
      },
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Advance payment request submitted',
      data: advance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all advance payments
// @route   GET /api/advance-payment
// @access  Private
exports.getAllAdvances = async (req, res, next) => {
  try {
    let query = {};

    if (isSchoolTenantUser(req.user)) {
      query.franchise = req.user.franchise;
    }

    if (req.query.status) query.status = req.query.status;
    if (req.query.staff) query.staff = req.query.staff;

    const advances = await AdvancePayment.find(query)
      .populate('staff', 'staffId personalInfo contactInfo')
      .populate('franchise', 'name code')
      .populate('approvedBy', 'name')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: advances.length,
      data: advances
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single advance payment
// @route   GET /api/advance-payment/:id
// @access  Private
exports.getAdvance = async (req, res, next) => {
  try {
    const advance = await AdvancePayment.findById(req.params.id)
      .populate('staff')
      .populate('franchise')
      .populate('approvedBy', 'name')
      .populate('deductions.salaryId');

    if (!advance) {
      return res.status(404).json({
        success: false,
        message: 'Advance payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: advance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/Reject advance payment
// @route   PUT /api/advance-payment/:id/approve
// @access  Private
exports.approveAdvance = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;

    const advance = await AdvancePayment.findById(req.params.id);

    if (!advance) {
      return res.status(404).json({
        success: false,
        message: 'Advance payment not found'
      });
    }

    if (advance.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Advance payment already processed'
      });
    }

    advance.status = status;
    advance.approvedBy = req.user._id;
    advance.approvedDate = new Date();
    advance.remarks = remarks;

    await advance.save();

    res.status(200).json({
      success: true,
      message: `Advance payment ${status}`,
      data: advance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Pay advance
// @route   PUT /api/advance-payment/:id/pay
// @access  Private
exports.payAdvance = async (req, res, next) => {
  try {
    const { paymentMode, transactionId } = req.body;

    const advance = await AdvancePayment.findById(req.params.id);

    if (!advance) {
      return res.status(404).json({
        success: false,
        message: 'Advance payment not found'
      });
    }

    if (advance.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Advance payment must be approved first'
      });
    }

    advance.status = 'paid';
    advance.paidDate = new Date();
    advance.paymentMode = paymentMode;
    advance.transactionId = transactionId;

    await advance.save();

    await syncFromAdvancePayment(advance);

    res.status(200).json({
      success: true,
      message: 'Advance payment paid successfully',
      data: advance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get advance stats
// @route   GET /api/advance-payment/stats
// @access  Private
exports.getAdvanceStats = async (req, res, next) => {
  try {
    let query = {};

    if (isSchoolTenantUser(req.user)) {
      query.franchise = req.user.franchise;
    }

    const totalPending = await AdvancePayment.countDocuments({ ...query, status: 'pending' });
    const totalApproved = await AdvancePayment.countDocuments({ ...query, status: 'approved' });
    const totalPaid = await AdvancePayment.countDocuments({ ...query, status: 'paid' });

    const stats = await AdvancePayment.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalPending,
        totalApproved,
        totalPaid,
        stats
      }
    });
  } catch (error) {
    next(error);
  }
};
