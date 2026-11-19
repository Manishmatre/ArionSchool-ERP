const StaffSalary = require('../models/StaffSalary');
const { isSchoolTenantUser } = require('../utils/tenantAccess');
const AdvancePayment = require('../models/AdvancePayment');
const StaffAttendance = require('../models/StaffAttendance');
const Staff = require('../models/Staff');
const { syncFromStaffSalary } = require('../utils/transactionService');

// @desc    Generate salary for a staff member
// @route   POST /api/staff-salary/generate
// @access  Private
exports.generateSalary = async (req, res, next) => {
  try {
    const { staffId, month, year } = req.body;

    // Check if salary already generated
    const existingSalary = await StaffSalary.findOne({ staff: staffId, month, year });
    if (existingSalary) {
      return res.status(400).json({
        success: false,
        message: 'Salary already generated for this month'
      });
    }

    // Get staff details
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }

    // Get attendance for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const attendance = await StaffAttendance.find({
      staff: staffId,
      date: { $gte: startDate, $lte: endDate }
    });

    // Calculate attendance
    const totalDays = endDate.getDate();
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const absentDays = attendance.filter(a => a.status === 'absent').length;
    const halfDays = attendance.filter(a => a.status === 'half-day').length;
    const leaves = attendance.filter(a => a.status === 'leave').length;
    const holidays = attendance.filter(a => a.status === 'holiday').length;

    // Get pending advance payments
    const pendingAdvances = await AdvancePayment.find({
      staff: staffId,
      status: { $in: ['approved', 'paid'] },
      remainingAmount: { $gt: 0 }
    });

    let totalAdvanceDeduction = 0;
    const advancePaymentIds = [];

    for (const advance of pendingAdvances) {
      if (advance.deductionSchedule && advance.deductionSchedule.amountPerInstallment) {
        totalAdvanceDeduction += advance.deductionSchedule.amountPerInstallment;
        advancePaymentIds.push(advance._id);
      }
    }

    // Create salary record
    const salary = await StaffSalary.create({
      staff: staffId,
      franchise: staff.franchise,
      month,
      year,
      basicSalary: staff.salary?.basicSalary || 0,
      allowances: {
        hra: staff.salary?.allowances?.hra || 0,
        ta: staff.salary?.allowances?.ta || 0,
        da: staff.salary?.allowances?.da || 0,
        other: staff.salary?.allowances?.other || 0
      },
      deductions: {
        pf: staff.salary?.deductions?.pf || 0,
        esi: staff.salary?.deductions?.esi || 0,
        tax: staff.salary?.deductions?.tax || 0,
        other: staff.salary?.deductions?.other || 0
      },
      attendance: {
        totalDays,
        presentDays,
        absentDays,
        halfDays,
        leaves,
        holidays
      },
      advanceDeduction: totalAdvanceDeduction,
      advancePayments: advancePaymentIds,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Salary generated successfully',
      data: salary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all salaries
// @route   GET /api/staff-salary
// @access  Private
exports.getAllSalaries = async (req, res, next) => {
  try {
    let query = {};

    if (isSchoolTenantUser(req.user)) {
      query.franchise = req.user.franchise;
    }

    if (req.query.month) query.month = req.query.month;
    if (req.query.year) query.year = req.query.year;
    if (req.query.status) query.status = req.query.status;
    if (req.query.staff) query.staff = req.query.staff;

    const salaries = await StaffSalary.find(query)
      .populate('staff', 'staffId personalInfo contactInfo')
      .populate('franchise', 'name code')
      .sort('-year -month -createdAt');

    res.status(200).json({
      success: true,
      count: salaries.length,
      data: salaries
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single salary
// @route   GET /api/staff-salary/:id
// @access  Private
exports.getSalary = async (req, res, next) => {
  try {
    const salary = await StaffSalary.findById(req.params.id)
      .populate('staff')
      .populate('franchise')
      .populate('advancePayments')
      .populate('paidBy', 'name');

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: salary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Pay salary
// @route   PUT /api/staff-salary/:id/pay
// @access  Private
exports.paySalary = async (req, res, next) => {
  try {
    const { paymentMode, transactionId, remarks } = req.body;

    const salary = await StaffSalary.findById(req.params.id);

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }

    if (salary.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Salary already paid'
      });
    }

    // Update salary status
    salary.status = 'paid';
    salary.paymentDate = new Date();
    salary.paymentMode = paymentMode;
    salary.transactionId = transactionId;
    salary.remarks = remarks;
    salary.paidBy = req.user._id;
    salary.paidAt = new Date();

    await salary.save();

    await syncFromStaffSalary(salary, req.user._id);

    // Update advance payments
    if (salary.advancePayments && salary.advancePayments.length > 0) {
      for (const advanceId of salary.advancePayments) {
        const advance = await AdvancePayment.findById(advanceId);
        if (advance && advance.deductionSchedule) {
          const deductionAmount = advance.deductionSchedule.amountPerInstallment;
          
          advance.deductedAmount += deductionAmount;
          advance.deductions.push({
            salaryId: salary._id,
            amount: deductionAmount,
            month: salary.month,
            year: salary.year,
            deductedAt: new Date()
          });

          if (advance.deductedAmount >= advance.amount) {
            advance.status = 'deducted';
          }

          await advance.save();
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Salary paid successfully',
      data: salary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get salary stats
// @route   GET /api/staff-salary/stats
// @access  Private
exports.getSalaryStats = async (req, res, next) => {
  try {
    let query = {};

    if (isSchoolTenantUser(req.user)) {
      query.franchise = req.user.franchise;
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const totalPending = await StaffSalary.countDocuments({ ...query, status: 'pending' });
    const totalPaid = await StaffSalary.countDocuments({ ...query, status: 'paid' });
    
    const monthlyStats = await StaffSalary.aggregate([
      { $match: { ...query, month: currentMonth, year: currentYear } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$netSalary' },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$netSalary', 0]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$netSalary', 0]
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalPending,
        totalPaid,
        monthlyStats: monthlyStats[0] || { totalAmount: 0, paidAmount: 0, pendingAmount: 0 }
      }
    });
  } catch (error) {
    next(error);
  }
};
