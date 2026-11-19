const StaffAttendance = require('../models/StaffAttendance');
const { isSchoolTenantUser } = require('../utils/tenantAccess');
const Staff = require('../models/Staff');

// @desc    Mark attendance
// @route   POST /api/staff-attendance
// @access  Private
exports.markAttendance = async (req, res, next) => {
  try {
    const { staffId, date, status, checkIn, checkOut, remarks } = req.body;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }

    // Check if attendance already marked
    const existingAttendance = await StaffAttendance.findOne({
      staff: staffId,
      date: new Date(date)
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this date'
      });
    }

    // Calculate working hours
    let workingHours = 0;
    if (checkIn && checkOut) {
      const inTime = new Date(`2000-01-01 ${checkIn}`);
      const outTime = new Date(`2000-01-01 ${checkOut}`);
      workingHours = (outTime - inTime) / (1000 * 60 * 60);
    }

    const attendance = await StaffAttendance.create({
      staff: staffId,
      franchise: staff.franchise,
      date: new Date(date),
      status,
      checkIn,
      checkOut,
      workingHours,
      remarks,
      markedBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance
// @route   GET /api/staff-attendance
// @access  Private
exports.getAttendance = async (req, res, next) => {
  try {
    let query = {};

    if (isSchoolTenantUser(req.user)) {
      query.franchise = req.user.franchise;
    }

    if (req.query.staff) query.staff = req.query.staff;
    if (req.query.status) query.status = req.query.status;
    
    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      query.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.date) {
      query.date = new Date(req.query.date);
    }

    const attendance = await StaffAttendance.find(query)
      .populate('staff', 'staffId personalInfo')
      .populate('markedBy', 'name')
      .sort('-date');

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update attendance
// @route   PUT /api/staff-attendance/:id
// @access  Private
exports.updateAttendance = async (req, res, next) => {
  try {
    const { status, checkIn, checkOut, remarks } = req.body;

    let attendance = await StaffAttendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Calculate working hours
    let workingHours = attendance.workingHours;
    if (checkIn && checkOut) {
      const inTime = new Date(`2000-01-01 ${checkIn}`);
      const outTime = new Date(`2000-01-01 ${checkOut}`);
      workingHours = (outTime - inTime) / (1000 * 60 * 60);
    }

    attendance.status = status || attendance.status;
    attendance.checkIn = checkIn || attendance.checkIn;
    attendance.checkOut = checkOut || attendance.checkOut;
    attendance.workingHours = workingHours;
    attendance.remarks = remarks || attendance.remarks;

    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully',
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance summary
// @route   GET /api/staff-attendance/summary
// @access  Private
exports.getAttendanceSummary = async (req, res, next) => {
  try {
    const { staffId, month, year } = req.query;

    if (!staffId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID, month, and year are required'
      });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendance = await StaffAttendance.find({
      staff: staffId,
      date: { $gte: startDate, $lte: endDate }
    });

    const summary = {
      totalDays: endDate.getDate(),
      presentDays: attendance.filter(a => a.status === 'present').length,
      absentDays: attendance.filter(a => a.status === 'absent').length,
      halfDays: attendance.filter(a => a.status === 'half-day').length,
      leaves: attendance.filter(a => a.status === 'leave').length,
      holidays: attendance.filter(a => a.status === 'holiday').length,
      totalWorkingHours: attendance.reduce((sum, a) => sum + (a.workingHours || 0), 0)
    };

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};
