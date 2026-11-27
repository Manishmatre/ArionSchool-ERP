const Attendance = require('../models/Attendance');
const { isSchoolTenantUser, canAccessStudentRecord } = require('../utils/tenantAccess');
const Student = require('../models/Student');
const SchoolClass = require('../models/SchoolClass');
const Staff = require('../models/Staff');
const TimetableEntry = require('../models/TimetableEntry');
const Franchise = require('../models/SchoolCampus');
const QRCode = require('qrcode');
const { getIO } = require('../utils/socket');

const canAccessSchoolClass = async (req, schoolClass, sectionId = '') => {
  if (['super_admin', 'school_owner'].includes(req.user.role)) return true;
  const campusId = (req.user.franchise?._id || req.user.franchise)?.toString();
  const classCampusId = schoolClass.franchise?.toString();
  if (!campusId || campusId !== classCampusId) return false;

  if (!['teacher', 'class_teacher'].includes(req.user.role)) return true;
  const staff = await Staff.findOne({ user: req.user._id }).select('_id').lean();
  if (!staff) return false;
  if (schoolClass.classTeacher?.toString() === staff._id.toString()) return true;

  const assignmentQuery = {
    franchise: campusId,
    schoolClass: schoolClass._id,
    teacher: staff._id
  };
  if (sectionId) assignmentQuery.section = sectionId;
  return Boolean(await TimetableEntry.exists(assignmentQuery));
};

const isPlatformAttendanceManager = (user) => ['super_admin', 'school_owner'].includes(user?.role);
const tenantIdFor = (user) => (user?.franchise?._id || user?.franchise)?.toString() || '';
const canManageStudentAttendance = (user, student) => isPlatformAttendanceManager(user) || (
  isSchoolTenantUser(user) && tenantIdFor(user) && tenantIdFor(user) === (student?.franchise?._id || student?.franchise)?.toString()
);
const canManageAttendanceRecord = (user, attendance) => isPlatformAttendanceManager(user) || (
  isSchoolTenantUser(user) && tenantIdFor(user) && tenantIdFor(user) === (attendance?.franchise?._id || attendance?.franchise)?.toString()
);

// @desc    Get all attendance records
// @route   GET /api/attendance
// @access  Private (Super Admin / School Admin)
exports.getAllAttendance = async (req, res, next) => {
  try {
    let query = {};

    // If school admin, only show their franchise attendance
    if (!isPlatformAttendanceManager(req.user)) {
      query.franchise = req.user.franchise?._id || req.user.franchise || null;
    } else if (req.query.franchise && req.query.franchise !== 'all') {
      query.franchise = req.query.franchise;
    }

    // Filter by student
    if (req.query.student) {
      query.student = req.query.student;
    }

    // Filter by course
    if (req.query.course) {
      query.course = req.query.course;
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    // Filter by a single date (YYYY-MM-DD)
    if (req.query.date) {
      const day = new Date(req.query.date);
      if (!isNaN(day.getTime())) {
        const start = new Date(day);
        start.setHours(0, 0, 0, 0);
        const end = new Date(day);
        end.setHours(23, 59, 59, 999);
        query.date = { $gte: start, $lte: end };
      }
    }

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by session
    if (req.query.session) {
      query.session = req.query.session;
    }

    const attendance = await Attendance.find(query)
      .populate('student', 'studentId personalInfo')
      .populate('franchise', 'name code')
      .populate('course', 'title')
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

// @desc    Get attendance by student
// @route   GET /api/attendance/student/:studentId
// @access  Private
exports.getStudentAttendance = async (req, res, next) => {
  try {
    const requestedId = req.params.studentId;
    const student = await Student.findById(requestedId).catch(() => null)
      || await Student.findOne({ user: requestedId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    const studentId = student._id.toString();

    if (!canAccessStudentRecord(req.user, student)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view this student’s attendance.' });
    }
    
    const attendance = await Attendance.find({ student: studentId })
      .populate('course', 'title')
      .sort('-date');

    // Calculate statistics
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const absentDays = attendance.filter(a => a.status === 'absent').length;
    const lateDays = attendance.filter(a => a.status === 'late').length;
    const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      data: {
        records: attendance,
        statistics: {
          totalDays,
          presentDays,
          absentDays,
          lateDays,
          percentage
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark attendance
// @route   POST /api/attendance
// @access  Private (Super Admin / School Admin)
exports.markAttendance = async (req, res, next) => {
  try {
    const { studentId, date, status, session, courseId, remarks } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (!canManageStudentAttendance(req.user, student)) {
      return res.status(403).json({ success: false, message: 'You cannot mark attendance outside your school.' });
    }

    // Check if attendance already marked for this date and session
    const existingAttendance = await Attendance.findOne({
      student: studentId,
      date: new Date(date),
      session: session || 'full_day'
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this date and session'
      });
    }

    // Create attendance record
    const attendance = await Attendance.create({
      student: studentId,
      franchise: student.franchise,
      course: courseId,
      date: date || new Date(),
      status,
      session: session || 'full_day',
      checkInTime: status === 'present' || status === 'late' ? new Date() : null,
      remarks,
      markedBy: req.user._id
    });

    // Update student attendance statistics
    student.attendance.totalClasses += 1;
    if (status === 'present' || status === 'late') {
      student.attendance.attendedClasses += 1;
    }
    student.attendance.attendancePercentage = 
      (student.attendance.attendedClasses / student.attendance.totalClasses) * 100;
    await student.save();

    try {
      const io = getIO();
      io.emit('attendance-updated', {
        action: 'marked',
        attendanceId: attendance._id,
        studentId,
        courseId: courseId || null,
        status,
        session: session || 'full_day',
        date: attendance.date,
        timestamp: new Date(),
      });
    } catch (e) {
      // ignore socket errors
    }

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk mark attendance
// @route   POST /api/attendance/bulk
// @access  Private (Super Admin / School Admin)
exports.bulkMarkAttendance = async (req, res, next) => {
  try {
    const { students, date, session, courseId } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one student is required.' });
    }

    const attendanceRecords = [];
    const errors = [];

    for (const studentData of students) {
      try {
        const student = await Student.findById(studentData.studentId);
        
        if (!student) {
          errors.push({ studentId: studentData.studentId, error: 'Student not found' });
          continue;
        }

        if (!canManageStudentAttendance(req.user, student)) {
          errors.push({ studentId: studentData.studentId, error: 'Student is outside your school.' });
          continue;
        }

        // Check if already marked
        const existing = await Attendance.findOne({
          student: studentData.studentId,
          date: new Date(date),
          session: session || 'full_day'
        });

        if (existing) {
          errors.push({ studentId: studentData.studentId, error: 'Already marked' });
          continue;
        }

        // Create attendance
        const attendance = await Attendance.create({
          student: studentData.studentId,
          franchise: student.franchise,
          course: courseId,
          date: date || new Date(),
          status: studentData.status,
          session: session || 'full_day',
          checkInTime: studentData.status === 'present' || studentData.status === 'late' ? new Date() : null,
          markedBy: req.user._id
        });

        // Update student stats
        student.attendance.totalClasses += 1;
        if (studentData.status === 'present' || studentData.status === 'late') {
          student.attendance.attendedClasses += 1;
        }
        student.attendance.attendancePercentage = 
          (student.attendance.attendedClasses / student.attendance.totalClasses) * 100;
        await student.save();

        attendanceRecords.push(attendance);
      } catch (error) {
        errors.push({ studentId: studentData.studentId, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Marked attendance for ${attendanceRecords.length} students`,
      data: {
        marked: attendanceRecords.length,
        failed: errors.length,
        records: attendanceRecords,
        errors
      }
    });

    try {
      const io = getIO();
      io.emit('attendance-updated', {
        action: 'bulk_marked',
        marked: attendanceRecords.length,
        failed: errors.length,
        courseId: courseId || null,
        session: session || 'full_day',
        date: date || new Date(),
        timestamp: new Date(),
      });
    } catch (e) {
      // ignore socket errors
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update attendance
// @route   PUT /api/attendance/:id
// @access  Private (Super Admin / School Admin)
exports.updateAttendance = async (req, res, next) => {
  try {
    let attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    if (!canManageAttendanceRecord(req.user, attendance)) {
      return res.status(403).json({ success: false, message: 'You cannot change attendance outside your school.' });
    }

    const student = await Student.findById(attendance.student);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found for this attendance record.' });
    if (!canManageStudentAttendance(req.user, student)) {
      return res.status(403).json({ success: false, message: 'This attendance record does not match the student’s school.' });
    }

    const updates = {};
    if (Object.hasOwn(req.body, 'status')) updates.status = req.body.status;
    if (Object.hasOwn(req.body, 'remarks')) updates.remarks = req.body.remarks;
    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: 'Provide an attendance status or remarks to update.' });
    }

    const oldStatus = attendance.status;
    const newStatus = updates.status;

    attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    // Update student statistics if status changed
    if (newStatus && oldStatus !== newStatus) {
      // Adjust attended classes count
      if ((oldStatus === 'present' || oldStatus === 'late') && 
          (newStatus !== 'present' && newStatus !== 'late')) {
        student.attendance.attendedClasses = Math.max(0, student.attendance.attendedClasses - 1);
      } else if ((oldStatus !== 'present' && oldStatus !== 'late') && 
                 (newStatus === 'present' || newStatus === 'late')) {
        student.attendance.attendedClasses += 1;
      }

      student.attendance.attendancePercentage = 
        (student.attendance.attendedClasses / student.attendance.totalClasses) * 100;
      await student.save();
    }

    try {
      const io = getIO();
      io.emit('attendance-updated', {
        action: 'updated',
        attendanceId: attendance._id,
        studentId: attendance.student,
        courseId: attendance.course || null,
        status: attendance.status,
        session: attendance.session,
        date: attendance.date,
        timestamp: new Date(),
      });
    } catch (e) {
      // ignore socket errors
    }

    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully',
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete attendance
// @route   DELETE /api/attendance/:id
// @access  Private (Super Admin / School Admin)
exports.deleteAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    if (!canManageAttendanceRecord(req.user, attendance)) {
      return res.status(403).json({ success: false, message: 'You cannot delete attendance outside your school.' });
    }

    // Update student statistics
    const student = await Student.findById(attendance.student);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found for this attendance record.' });
    if (!canManageStudentAttendance(req.user, student)) {
      return res.status(403).json({ success: false, message: 'This attendance record does not match the student’s school.' });
    }
    student.attendance.totalClasses = Math.max(0, student.attendance.totalClasses - 1);
    if (attendance.status === 'present' || attendance.status === 'late') {
      student.attendance.attendedClasses = Math.max(0, student.attendance.attendedClasses - 1);
    }
    student.attendance.attendancePercentage = 
      student.attendance.totalClasses > 0
        ? (student.attendance.attendedClasses / student.attendance.totalClasses) * 100
        : 0;
    await student.save();

    await attendance.deleteOne();

    try {
      const io = getIO();
      io.emit('attendance-updated', {
        action: 'deleted',
        attendanceId: attendance._id,
        studentId: attendance.student,
        courseId: attendance.course || null,
        status: attendance.status,
        session: attendance.session,
        date: attendance.date,
        timestamp: new Date(),
      });
    } catch (e) {
      // ignore socket errors
    }

    res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance statistics
// @route   GET /api/attendance/stats
// @access  Private (Super Admin / School Admin)
exports.getAttendanceStats = async (req, res, next) => {
  try {
    let query = {};

    if (!['super_admin', 'school_owner'].includes(req.user.role)) {
      query.franchise = req.user.franchise?._id || req.user.franchise;
    } else if (req.query.franchise && req.query.franchise !== 'all') {
      query.franchise = req.query.franchise;
    }

    // Single date filter
    if (req.query.date) {
      const day = new Date(req.query.date);
      if (!isNaN(day.getTime())) {
        const start = new Date(day);
        start.setHours(0, 0, 0, 0);
        const end = new Date(day);
        end.setHours(23, 59, 59, 999);
        query.date = { $gte: start, $lte: end };
      }
    }

    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      query.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const totalRecords = await Attendance.countDocuments(query);
    const presentCount = await Attendance.countDocuments({ ...query, status: 'present' });
    const absentCount = await Attendance.countDocuments({ ...query, status: 'absent' });
    const lateCount = await Attendance.countDocuments({ ...query, status: 'late' });

    const overallPercentage = totalRecords > 0 
      ? ((presentCount / totalRecords) * 100).toFixed(2)
      : 0;

    const result = {
      totalRecords,
      presentCount,
      absentCount,
      lateCount,
      overallPercentage
    };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate Attendance QR Code for Institute / School
// @route   GET /api/attendance/qr/generate
// @access  Private (Super Admin / School Admin)
exports.generateAttendanceQR = async (req, res, next) => {
  try {
    let franchiseId = req.query.franchiseId;
    if (isSchoolTenantUser(req.user)) {
      franchiseId = req.user.franchise;
    }

    let franchise = null;
    if (franchiseId) {
      franchise = await Franchise.findById(franchiseId);
    } else {
      franchise = await Franchise.findOne();
    }

    if (!franchise) {
      return res.status(404).json({
        success: false,
        message: 'School/Institute not found for QR generation'
      });
    }

    const todayDate = req.query.date || new Date().toISOString().split('T')[0];
    const session = req.query.session || 'full_day';

    // 1. Standard Session / Date-based QR payload (preserves original session-based system)
    const qrPayload = {
      type: 'SES_ATTENDANCE_QR',
      franchiseId: franchise._id.toString(),
      franchiseName: franchise.name || franchise.franchiseName || 'Arion School Institute',
      code: franchise.code || 'SES-CTR',
      city: franchise.address?.city || '',
      date: todayDate,
      session: session,
      generatedAt: Date.now()
    };

    const qrString = JSON.stringify(qrPayload);
    const qrDataUrl = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'H',
      margin: 2,
      scale: 8,
      color: {
        dark: '#1e3a8a',
        light: '#ffffff'
      }
    });

    // 2. All-Time Permanent Wall QR payload (works anytime, no expiration date)
    const allTimePayload = {
      type: 'SES_ATTENDANCE_QR',
      qrType: 'all_time',
      validity: 'all_time',
      franchiseId: franchise._id.toString(),
      franchiseName: franchise.name || franchise.franchiseName || 'Arion School Institute',
      code: franchise.code || 'SES-CTR',
      city: franchise.address?.city || '',
      session: 'daily',
      generatedAt: Date.now()
    };

    const allTimeString = JSON.stringify(allTimePayload);
    const allTimeQrDataUrl = await QRCode.toDataURL(allTimeString, {
      errorCorrectionLevel: 'H',
      margin: 2,
      scale: 10,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    res.status(200).json({
      success: true,
      qrPayload,
      qrString,
      qrDataUrl,
      allTimePayload,
      allTimeString,
      allTimeQrDataUrl,
      franchise: {
        _id: franchise._id,
        name: franchise.name || franchise.franchiseName,
        code: franchise.code,
        city: franchise.address?.city || ''
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Punch Attendance via QR Code
// @route   POST /api/attendance/qr/punch
// @access  Private (Student)
exports.punchQRAttendance = async (req, res, next) => {
  try {
    const { qrData, session } = req.body;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: 'No QR code data provided'
      });
    }

    let parsed = null;
    if (typeof qrData === 'string') {
      try {
        parsed = JSON.parse(qrData);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid QR code. Please scan an official Arion School Attendance QR.'
        });
      }
    } else {
      parsed = qrData;
    }

    if (!parsed || parsed.type !== 'SES_ATTENDANCE_QR' || !parsed.franchiseId) {
      return res.status(400).json({
        success: false,
        message: 'Unrecognized QR code. Please scan the official attendance QR poster displayed at your institute.'
      });
    }

    // 1. Resolve Student
    let student = await Student.findOne({ user: req.user._id });
    if (!student && req.user.studentDetails) {
      student = await Student.findById(req.user.studentDetails);
    }
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found for your account.'
      });
    }

    if (!student.franchise || student.franchise.toString() !== parsed.franchiseId) {
      return res.status(403).json({ success: false, message: 'This attendance QR code is not assigned to your school.' });
    }

    // 2. Attendance date is ALWAYS the real-time CURRENT date when scanned (Today)
    // Physical wall QR posters are permanent — scanning today records presence for TODAY.
    const punchDate = new Date();
    const startOfDay = new Date(punchDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(punchDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Permanent wall QR codes use "daily" to describe their validity. It is
    // not an attendance session and must not be stored in the session enum.
    const qrSession = parsed.session === 'daily' ? 'full_day' : parsed.session;
    const targetSession = qrSession || session || 'full_day';

    // 3. Check for existing attendance today
    const existing = await Attendance.findOne({
      student: student._id,
      date: { $gte: startOfDay, $lte: endOfDay },
      session: targetSession
    });

    const studentName = student.personalInfo?.name || req.user.name || 'Student';
    const centerName = parsed.franchiseName || 'Arion School Center';

    if (existing && existing.status === 'present') {
      return res.status(200).json({
        success: true,
        alreadyPunched: true,
        message: `Attendance already punched for today at ${new Date(existing.checkInTime || existing.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}!`,
        data: existing,
        studentName,
        centerName,
        checkInTime: existing.checkInTime || existing.date
      });
    }

    let attendance;
    if (existing) {
      existing.status = 'present';
      existing.checkInTime = new Date();
      existing.remarks = 'Punched via Mobile QR Scanner';
      existing.markedBy = req.user._id;
      attendance = await existing.save();
    } else {
      attendance = await Attendance.create({
        student: student._id,
        franchise: parsed.franchiseId || student.franchise,
        course: student.course || student.academicInfo?.course,
        date: punchDate,
        status: 'present',
        session: targetSession,
        checkInTime: new Date(),
        remarks: 'Punched via Mobile QR Scanner',
        markedBy: req.user._id
      });
    }

    // 4. Update student statistics
    if (student.attendance) {
      student.attendance.totalClasses = (student.attendance.totalClasses || 0) + (existing ? 0 : 1);
      student.attendance.attendedClasses = (student.attendance.attendedClasses || 0) + 1;
      student.attendance.attendancePercentage = 
        Math.min(100, (student.attendance.attendedClasses / student.attendance.totalClasses) * 100);
      await student.save();
    }

    // 5. Emit real-time socket event for live attendance dashboards
    try {
      const io = getIO();
      io.emit('attendance-updated', {
        action: 'qr-punch',
        attendanceId: attendance._id,
        studentId: student._id,
        studentName,
        franchiseId: parsed.franchiseId,
        status: 'present',
        session: targetSession,
        date: attendance.date,
        checkInTime: attendance.checkInTime,
        timestamp: new Date()
      });
    } catch (e) {
      // ignore socket failure
    }

    res.status(200).json({
      success: true,
      message: 'Attendance punched successfully! You are marked PRESENT.',
      data: attendance,
      studentName,
      centerName,
      checkInTime: attendance.checkInTime
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's punch status for logged-in student
// @route   GET /api/attendance/today
// @access  Private (Student)
exports.getTodayAttendance = async (req, res, next) => {
  try {
    let student = await Student.findOne({ user: req.user._id });
    if (!student && req.user.studentDetails) {
      student = await Student.findById(req.user.studentDetails);
    }
    if (!student) {
      return res.status(200).json({
        success: true,
        punched: false,
        message: 'No student record found',
        attendance: null
      });
    }

    const recentThreshold = new Date(Date.now() - 20 * 60 * 60 * 1000);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await Attendance.findOne({
      student: student._id,
      status: 'present',
      $or: [
        { date: { $gte: startOfDay, $lte: endOfDay } },
        { createdAt: { $gte: recentThreshold } },
        { checkInTime: { $gte: recentThreshold } }
      ]
    })
      .sort({ createdAt: -1 })
      .populate('franchise', 'name code')
      .populate('course', 'title');

    const isPresent = !!(attendance && (attendance.status === 'present' || attendance.checkInTime));

    return res.status(200).json({
      success: true,
      punched: isPresent,
      attendance: attendance || null,
      studentName: student.personalInfo?.name || req.user.name,
      franchiseName: attendance?.franchise?.name || 'Arion School Study Center',
      checkInTime: attendance?.checkInTime || attendance?.date || null
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SCHOOL WALK-THROUGH RFID / BARCODE PUNCH
// ==========================================
exports.rfidPunch = async (req, res, next) => {
  try {
    const { rfidCardId, terminalId = 'Main Gate 1', franchiseId } = req.body;
    if (!rfidCardId) {
      return res.status(400).json({ success: false, message: 'rfidCardId is required' });
    }

    // Lookup student
    const student = await Student.findOne({
      $or: [
        { rfidCardId: rfidCardId.trim() },
        { studentId: rfidCardId.trim() },
        { admissionNumber: rfidCardId.trim() }
      ]
    }).populate('schoolClass', 'name code').populate('section', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `No student recognized for RFID/Card ID: ${rfidCardId}`
      });
    }

    if (!canManageStudentAttendance(req.user, student)) {
      return res.status(403).json({ success: false, message: 'RFID attendance is outside your school.' });
    }

    const schoolFranchise = student.franchise;
    if (!schoolFranchise || (franchiseId && franchiseId !== schoolFranchise.toString())) {
      return res.status(403).json({ success: false, message: 'RFID attendance is outside the selected school.' });
    }
    const now = new Date();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Debounce check: if attendance was punched within last 5 minutes, debounce
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentPunch = await Attendance.findOne({
      student: student._id,
      rfidPunchTime: { $gte: fiveMinutesAgo }
    });

    if (recentPunch) {
      return res.status(200).json({
        success: true,
        debounced: true,
        message: `Duplicate punch debounced for ${student.personalInfo?.firstName} ${student.personalInfo?.lastName} (Punched within last 5 mins)`,
        student: {
          name: `${student.personalInfo?.firstName} ${student.personalInfo?.lastName}`,
          studentId: student.studentId,
          className: student.schoolClass?.name,
          sectionName: student.section?.name,
          punchTime: recentPunch.rfidPunchTime
        }
      });
    }

    // Upsert today's attendance record
    const attendance = await Attendance.findOneAndUpdate(
      {
        student: student._id,
        date: { $gte: startOfDay, $lte: endOfDay },
        session: 'full_day'
      },
      {
        student: student._id,
        franchise: schoolFranchise,
        schoolClass: student.schoolClass?._id,
        section: student.section?._id,
        academicSession: student.academicSession,
        date: now,
        status: 'present',
        session: 'full_day',
        source: 'rfid',
        checkInTime: now,
        rfidPunchTime: now,
        remarks: `Walk-through RFID Reader (${terminalId})`
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Emit live socket event to security gate dashboard
    try {
      const io = getIO();
      if (io) {
        io.emit('attendance:rfid-punch', {
          student: {
            name: `${student.personalInfo?.firstName} ${student.personalInfo?.lastName}`,
            studentId: student.studentId,
            className: student.schoolClass?.name,
            sectionName: student.section?.name,
            photo: student.personalInfo?.photo
          },
          terminalId,
          punchTime: now
        });
      }
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: `RFID Punch Successful: ${student.personalInfo?.firstName} ${student.personalInfo?.lastName} marked Present`,
      student: {
        id: student._id,
        name: `${student.personalInfo?.firstName} ${student.personalInfo?.lastName}`,
        studentId: student.studentId,
        className: student.schoolClass?.name,
        sectionName: student.section?.name,
        punchTime: now
      },
      attendance
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SCHOOL DAILY CLASS ATTENDANCE (ROSTER)
// ==========================================
exports.getSchoolDailyAttendance = async (req, res, next) => {
  try {
    const { schoolClass, section, date } = req.query;
    if (!schoolClass) {
      return res.status(400).json({ success: false, message: 'schoolClass is required' });
    }

    const classRecord = await SchoolClass.findById(schoolClass).select('_id franchise classTeacher');
    if (!classRecord) return res.status(404).json({ success: false, message: 'Class not found.' });
    const campusId = (req.user.franchise?._id || req.user.franchise)?.toString();
    if (!await canAccessSchoolClass(req, classRecord, section || '')) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this class or it is outside your school campus.' });
    }

    const targetDate = date ? new Date(date) : new Date();
    if (Number.isNaN(targetDate.getTime())) return res.status(400).json({ success: false, message: 'Attendance date is invalid.' });
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const studentQuery = { schoolClass, status: 'active' };
    if (section) studentQuery.section = section;
    if (!['super_admin', 'school_owner'].includes(req.user.role)) studentQuery.franchise = campusId;

    const students = await Student.find(studentQuery)
      .select('personalInfo studentId rollNumber admissionNumber')
      .sort({ rollNumber: 1 });

    const attendanceRecords = await Attendance.find({
      student: { $in: students.map(s => s._id) },
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    const attendanceMap = {};
    attendanceRecords.forEach(att => {
      attendanceMap[att.student.toString()] = att;
    });

    const roster = students.map(s => {
      const att = attendanceMap[s._id.toString()];
      return {
        studentId: s._id,
        studentCode: s.studentId,
        admissionNumber: s.admissionNumber || s.studentId,
        rollNumber: s.rollNumber || '-',
        name: `${s.personalInfo?.firstName || ''} ${s.personalInfo?.lastName || ''}`,
        status: att?.status || 'unmarked',
        source: att?.source || 'manual',
        checkInTime: att?.checkInTime || null,
        remarks: att?.remarks || ''
      };
    });

    res.status(200).json({
      success: true,
      count: roster.length,
      date: targetDate.toISOString().split('T')[0],
      data: roster
    });
  } catch (error) {
    next(error);
  }
};

exports.saveSchoolDailyAttendance = async (req, res, next) => {
  try {
    const { schoolClass, section, date, records } = req.body;
    if (!schoolClass || !records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid payload for daily attendance' });
    }

    const validStatuses = new Set(['present', 'absent', 'late', 'half_day', 'leave']);
    if (records.length !== new Set(records.map((record) => String(record.studentId))).size) {
      return res.status(400).json({ success: false, message: 'A student can appear only once in an attendance register.' });
    }
    if (records.some((record) => !validStatuses.has(record.status))) {
      return res.status(400).json({ success: false, message: 'Mark every student present, absent, late, half-day, or on leave before saving.' });
    }
    const classRecord = await SchoolClass.findById(schoolClass).select('_id franchise classTeacher');
    if (!classRecord) return res.status(404).json({ success: false, message: 'Class not found.' });
    const campusId = (req.user.franchise?._id || req.user.franchise)?.toString();
    if (!await canAccessSchoolClass(req, classRecord, section || '')) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this class or it is outside your school campus.' });
    }

    const rosterQuery = {
      _id: { $in: records.map((record) => record.studentId) },
      schoolClass
    };
    if (section) rosterQuery.section = section;
    if (!['super_admin', 'school_owner'].includes(req.user.role)) rosterQuery.franchise = campusId;
    const authorizedStudents = await Student.countDocuments(rosterQuery);
    if (authorizedStudents !== new Set(records.map((record) => String(record.studentId))).size) {
      return res.status(403).json({ success: false, message: 'Attendance contains a student outside the selected class or section.' });
    }

    const targetDate = date ? new Date(date) : new Date();
    if (Number.isNaN(targetDate.getTime())) return res.status(400).json({ success: false, message: 'Attendance date is invalid.' });
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const franchiseId = classRecord.franchise;

    const operations = records.map(record => ({
      updateOne: {
        filter: {
          student: record.studentId,
          date: { $gte: startOfDay, $lte: endOfDay },
          session: 'full_day'
        },
        update: {
          $set: {
            franchise: franchiseId,
            schoolClass,
            section: section || undefined,
            status: record.status || 'present',
            remarks: record.remarks || '',
            markedBy: req.user._id,
            source: 'manual',
            date: targetDate
          }
        },
        upsert: true
      }
    }));

    await Attendance.bulkWrite(operations);

    const studentIds = records.map((record) => record.studentId);
    const attendanceSummary = await Attendance.aggregate([
      { $match: { student: { $in: studentIds } } },
      {
        $group: {
          _id: '$student',
          totalClasses: { $sum: 1 },
          attendedClasses: {
            $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] }
          }
        }
      }
    ]);
    const summaryByStudent = new Map(attendanceSummary.map((item) => [item._id.toString(), item]));
    await Student.bulkWrite(studentIds.map((id) => {
      const summary = summaryByStudent.get(id.toString()) || { totalClasses: 0, attendedClasses: 0 };
      return {
        updateOne: {
          filter: { _id: id },
          update: {
            $set: {
              'attendance.totalClasses': summary.totalClasses,
              'attendance.attendedClasses': summary.attendedClasses,
              'attendance.attendancePercentage': summary.totalClasses
                ? (summary.attendedClasses / summary.totalClasses) * 100
                : 0
            }
          }
        }
      };
    }));

    res.status(200).json({
      success: true,
      message: `Daily attendance marked for ${records.length} students`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;

