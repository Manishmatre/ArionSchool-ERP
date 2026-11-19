const LeaveApplication = require('../models/LeaveApplication');
const Attendance = require('../models/Attendance');
const StaffAttendance = require('../models/StaffAttendance');

const getTenantFranchise = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

// ==========================================
// 1. GET LEAVE APPLICATIONS
// ==========================================
exports.getLeaves = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};

    if (req.query.status) query.status = req.query.status;
    if (req.query.applicantType) query.applicantType = req.query.applicantType;
    if (req.query.student) query.student = req.query.student;
    if (req.query.staff) query.staff = req.query.staff;

    const leaves = await LeaveApplication.find(query)
      .populate('student', 'personalInfo.firstName personalInfo.lastName studentId rollNumber')
      .populate('staff', 'personalInfo.firstName personalInfo.lastName staffId')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: leaves.length, data: leaves });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. APPLY FOR LEAVE
// ==========================================
exports.applyLeave = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const {
      applicantType = 'staff',
      studentId,
      staffId,
      leaveType,
      startDate,
      endDate,
      reason,
      attachments
    } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const leave = await LeaveApplication.create({
      applicantType,
      student: applicantType === 'student' ? studentId : undefined,
      staff: applicantType === 'staff' ? staffId : undefined,
      franchise: franchiseId,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      attachments: attachments || [],
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: `Leave application submitted for ${totalDays} day(s)`,
      data: leave
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. APPROVE / REJECT LEAVE (WITH ATTENDANCE AUTO-SYNC)
// ==========================================
exports.reviewLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reviewRemarks } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    const leave = await LeaveApplication.findById(id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave application not found' });

    leave.status = status;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    leave.reviewRemarks = reviewRemarks || '';
    await leave.save();

    // If approved, synchronize attendance across the leave date span
    if (status === 'approved') {
      const cur = new Date(leave.startDate);
      const end = new Date(leave.endDate);

      while (cur <= end) {
        const dayStart = new Date(cur);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(cur);
        dayEnd.setHours(23, 59, 59, 999);

        if (leave.applicantType === 'student' && leave.student) {
          await Attendance.findOneAndUpdate(
            {
              student: leave.student,
              date: { $gte: dayStart, $lte: dayEnd },
              session: 'full_day'
            },
            {
              student: leave.student,
              franchise: leave.franchise,
              date: new Date(cur),
              status: 'leave',
              session: 'full_day',
              remarks: `Approved Leave (${leave.leaveType})`
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } else if (leave.applicantType === 'staff' && leave.staff) {
          await StaffAttendance.findOneAndUpdate(
            {
              staff: leave.staff,
              date: { $gte: dayStart, $lte: dayEnd }
            },
            {
              staff: leave.staff,
              franchise: leave.franchise,
              date: new Date(cur),
              status: 'leave',
              remarks: `Approved Leave (${leave.leaveType})`
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }

        cur.setDate(cur.getDate() + 1);
      }
    }

    res.status(200).json({
      success: true,
      message: `Leave application marked as ${status}${status === 'approved' ? ' and attendance synced' : ''}`,
      data: leave
    });
  } catch (error) {
    next(error);
  }
};
