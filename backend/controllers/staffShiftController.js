const StaffShift = require('../models/StaffShift');
const StaffAttendance = require('../models/StaffAttendance');
const Staff = require('../models/Staff');

const getTenantFranchise = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

// ==========================================
// 1. STAFF SHIFT CONFIGURATION
// ==========================================
exports.getShifts = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = { isActive: true };
    if (franchiseId) query.franchise = franchiseId;

    const shifts = await StaffShift.find(query).sort({ startTime: 1 });
    res.status(200).json({ success: true, count: shifts.length, data: shifts });
  } catch (error) {
    next(error);
  }
};

exports.createShift = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const shift = await StaffShift.create({
      ...req.body,
      franchise: franchiseId
    });
    res.status(201).json({ success: true, message: 'Shift schedule created', data: shift });
  } catch (error) {
    next(error);
  }
};

exports.deleteShift = async (req, res, next) => {
  try {
    const shift = await StaffShift.findByIdAndUpdate(req.params.id, { isActive: false });
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });
    res.status(200).json({ success: true, message: 'Shift removed' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. STAFF CHECK-IN / CHECK-OUT WITH LATE TRACKING
// ==========================================
exports.recordStaffPunch = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const { staffId, type = 'check_in', time, remarks } = req.body;

    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ success: false, message: 'Staff member not found' });

    const now = time ? new Date(time) : new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let attendance = await StaffAttendance.findOne({
      staff: staffId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (type === 'check_in') {
      if (!attendance) {
        attendance = await StaffAttendance.create({
          staff: staffId,
          franchise: franchiseId,
          date: now,
          status: 'present',
          checkIn: timeString,
          remarks: remarks || 'Biometric / App Check-in',
          markedBy: req.user._id
        });
      } else {
        attendance.checkIn = timeString;
        attendance.status = 'present';
        if (remarks) attendance.remarks = remarks;
        await attendance.save();
      }
    } else {
      // check_out
      if (!attendance) {
        attendance = await StaffAttendance.create({
          staff: staffId,
          franchise: franchiseId,
          date: now,
          status: 'present',
          checkOut: timeString,
          remarks: remarks || 'Check-out',
          markedBy: req.user._id
        });
      } else {
        attendance.checkOut = timeString;
        // Calculate working hours if checkIn exists
        if (attendance.checkIn) {
          const [inH, inM] = attendance.checkIn.split(':').map(Number);
          const [outH, outM] = timeString.split(':').map(Number);
          const totalHours = (outH + outM / 60) - (inH + inM / 60);
          attendance.workingHours = Math.max(0, Number(totalHours.toFixed(2)));
        }
        await attendance.save();
      }
    }

    res.status(200).json({
      success: true,
      message: `Staff ${type === 'check_in' ? 'Check-in' : 'Check-out'} recorded for ${staff.personalInfo?.firstName} ${staff.personalInfo?.lastName}`,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};
