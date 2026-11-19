const mongoose = require('mongoose'); // Import mongoose
const OnlineClass = require('../models/OnlineClass');
const Course = require('../models/Course');
const Student = require('../models/Student');
const User = require('../models/User');
const { sendClassReminderEmail, sendClassCancellationEmail } = require('../utils/emailService');
const { getIO } = require('../utils/socket');
const { getUploadedUrl } = require('../utils/cloudinary');

const getSchoolId = (user) => user?.franchise?._id || user?.franchise || null;
const sameId = (left, right) => String(left?._id || left || '') === String(right?._id || right || '');
const isPlatformOperator = (user) => ['super_admin', 'admin'].includes(user?.role);
const canAccessSchoolClass = (user, classData) =>
  isPlatformOperator(user) || Boolean(getSchoolId(user) && sameId(getSchoolId(user), classData?.franchise));
const isSchoolManager = (user) => isPlatformOperator(user) ||
  ['school_owner', 'school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role);

// @desc    Get all online classes
// @route   GET /api/online-classes
// @access  Private
exports.getAllOnlineClasses = async (req, res, next) => {
  try {
    let query = {};

    // Every school account is scoped to its own tenant; only platform operators are global.
    if (!isPlatformOperator(req.user)) {
      const schoolId = getSchoolId(req.user);
      if (!schoolId) return res.status(403).json({ success: false, message: 'Your account is not assigned to a school.' });
      query.franchise = schoolId;
      if (['teacher', 'class_teacher'].includes(req.user.role)) query.instructor = req.user._id;
    }

    // Filter by course
    if (req.query.course) {
      query.course = req.query.course;
    }

    // Filter by instructor
    if (req.query.instructor && !['teacher', 'class_teacher'].includes(req.user.role)) {
      query.instructor = req.query.instructor;
    }

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query.scheduledDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const classes = await OnlineClass.find(query)
      .populate('course', 'title')
      .populate('instructor', 'name email')
      .populate('franchise', 'name')
      .populate('participants.student', 'fullName email')
      .sort('-scheduledDate');

    res.status(200).json({
      success: true,
      count: classes.length,
      data: classes
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join online class (real-time)
// @route   POST /api/online-classes/:id/join
// @access  Private
exports.joinOnlineClass = async (req, res, next) => {
  try {
    const classId = req.params.id;
    const studentId = req.user.id;

    const onlineClass = await OnlineClass.findById(classId);
    if (!onlineClass) {
      return res.status(404).json({ success: false, message: 'Online class not found' });
    }

    // Check if student is already in participants
    const existingParticipant = onlineClass.participants.find(
      p => p.student && p.student.toString() === studentId
    );

    if (!existingParticipant) {
      // Add new participant
      onlineClass.participants.push({
        student: studentId,
        joinedAt: new Date()
      });
      await onlineClass.save();

      // Emit real-time update
      const io = getIO();
      const populatedClass = await OnlineClass.findById(classId)
        .populate('participants.student', 'name email personalInfo.firstName personalInfo.lastName');

      io.emit('class-participant-joined', {
        classId,
        participant: populatedClass.participants[populatedClass.participants.length - 1],
        totalParticipants: onlineClass.participants.length,
        message: 'A new participant has joined the class'
      });
    }

    res.status(200).json({ success: true, message: 'Joined class successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave online class (real-time)
// @route   POST /api/online-classes/:id/leave
// @access  Private
exports.leaveOnlineClass = async (req, res, next) => {
  try {
    const classId = req.params.id;
    const studentId = req.user.id;

    const onlineClass = await OnlineClass.findById(classId);
    if (!onlineClass) {
      return res.status(404).json({ success: false, message: 'Online class not found' });
    }

    // Find and update participant
    const participantIndex = onlineClass.participants.findIndex(
      p => p.student && p.student.toString() === studentId
    );

    if (participantIndex !== -1) {
      onlineClass.participants[participantIndex].leftAt = new Date();
      onlineClass.participants[participantIndex].duration = 
        Math.round((new Date() - onlineClass.participants[participantIndex].joinedAt) / 60000); // in minutes
      await onlineClass.save();

      // Emit real-time update
      const io = getIO();
      io.emit('class-participant-left', {
        classId,
        studentId,
        totalParticipants: onlineClass.participants.filter(p => !p.leftAt).length,
        message: 'A participant has left the class'
      });
    }

    res.status(200).json({ success: true, message: 'Left class successfully' });
  } catch (error) {
    next(error);
  }
};
// @route   GET /api/online-classes/:id
// @access  Private
exports.getOnlineClass = async (req, res, next) => {
  try {
    const classData = await OnlineClass.findById(req.params.id)
      .populate('course', 'title')
      .populate('instructor', 'name email personalInfo.firstName personalInfo.lastName')
      .populate('franchise', 'name')
      .populate('participants.student', 'name email personalInfo.firstName personalInfo.lastName')
      .populate('materials');

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Online class not found'
      });
    }

    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user._id })
        .select('franchise enrolledCourses')
        .populate({ path: 'enrolledCourses', select: 'course' });
      const isEnrolled = student?.enrolledCourses?.some((enrollment) =>
        sameId(enrollment.course || enrollment, classData.course)
      );
      if (!student || !sameId(student.franchise, classData.franchise) || !isEnrolled) {
        return res.status(403).json({ success: false, message: 'This class is not available to your student account.' });
      }
    } else if (!canAccessSchoolClass(req.user, classData)) {
      return res.status(403).json({ success: false, message: 'You cannot access classes for another school.' });
    }

    res.status(200).json({
      success: true,
      data: classData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create online class
// @route   POST /api/online-classes
// @access  Private (Admin, School Admin, Staff)
exports.createOnlineClass = async (req, res, next) => {
  try {
    const {
      title,
      description,
      course,
      instructor,
      scheduledDate,
      duration,
      platform,
      maxParticipants,
      materials,
      notes,
      franchise,
      meetingLink, // Add meetingLink to destructuring
      meetingId,
      password
    } = req.body;

    // Validate course
    const courseData = await Course.findById(course);
    if (!courseData) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Determine the school
    const assignedFranchise = isPlatformOperator(req.user)
      ? (franchise || courseData.franchise)
      : getSchoolId(req.user);

    if (!assignedFranchise) {
        return res.status(400).json({
            success: false,
            message: 'School information is required and could not be determined.'
        });
    }

    if (franchise && !isPlatformOperator(req.user) && !sameId(franchise, assignedFranchise)) {
      return res.status(403).json({ success: false, message: 'You cannot schedule classes for another school.' });
    }
    const instructorUser = await User.findById(instructor).select('franchise role');
    if (!instructorUser) return res.status(404).json({ success: false, message: 'Instructor account not found.' });
    if (!isPlatformOperator(req.user) && !sameId(instructorUser.franchise, assignedFranchise)) {
      return res.status(400).json({ success: false, message: 'Choose an instructor assigned to this school.' });
    }

    // Generate unique meetingId if not provided or empty
    let uniqueMeetingId = meetingId;
    if (!uniqueMeetingId || uniqueMeetingId.trim() === '') {
      uniqueMeetingId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    const classData = await OnlineClass.create({
      title,
      description,
      course,
      instructor,
      franchise: assignedFranchise,
      scheduledDate: new Date(scheduledDate),
      duration,
      meetingLink, // Use provided meetingLink
      meetingId: uniqueMeetingId,
      password,
      platform: platform || 'zoom',
      maxParticipants: maxParticipants || 100,
      materials: materials || [],
      notes,
      createdBy: req.user._id
    });

    // Get enrolled students for notification
    const enrolledStudents = await Student.find({ 
      'enrollments.course': course,
      franchise: classData.franchise 
    });

    // Send reminder emails (in background)
    if (enrolledStudents.length > 0) {
      setTimeout(async () => {
        try {
          await sendClassReminderEmail(enrolledStudents, classData);
          await OnlineClass.findByIdAndUpdate(classData._id, { reminderSent: true });
        } catch (error) {
          console.error('Failed to send reminder emails:', error);
        }
      }, 1000);
    }

    res.status(201).json({
      success: true,
      message: 'Online class created successfully',
      data: classData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update online class
// @route   PUT /api/online-classes/:id
// @access  Private
exports.updateOnlineClass = async (req, res, next) => {
  try {
    const classData = await OnlineClass.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Online class not found'
      });
    }

    const isInstructor = sameId(classData.instructor, req.user._id);
    if (!canAccessSchoolClass(req.user, classData) || (!isSchoolManager(req.user) && !isInstructor)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this class'
      });
    }

    const updates = { ...req.body };
    if (!isPlatformOperator(req.user)) delete updates.franchise;

    const updatedClass = await OnlineClass.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('course', 'title');

    res.status(200).json({
      success: true,
      message: 'Online class updated successfully',
      data: updatedClass
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete online class
// @route   DELETE /api/online-classes/:id
// @access  Private
exports.deleteOnlineClass = async (req, res, next) => {
  try {
    const classData = await OnlineClass.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Online class not found'
      });
    }

    if (!canAccessSchoolClass(req.user, classData) || !isSchoolManager(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only school administrators can delete online classes.'
      });
    }

    // Send cancellation emails to participants
    if (classData.participants.length > 0) {
      const participants = await Student.find({
        '_id': { $in: classData.participants.map(p => p.student) }
      });
      
      setTimeout(async () => {
        try {
          await sendClassCancellationEmail(participants, classData);
        } catch (error) {
          console.error('Failed to send cancellation emails:', error);
        }
      }, 1000);
    }

    await classData.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Online class deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join online class
// @route   POST /api/online-classes/:id/join
// @access  Private (Students)
exports.joinOnlineClass = async (req, res, next) => {
  try {
    const classData = await OnlineClass.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Online class not found'
      });
    }

    // Check if class is live
    if (classData.status !== 'live') {
      return res.status(400).json({
        success: false,
        message: 'Class is not live yet'
      });
    }

    // Get student
    const student = await Student.findOne({ user: req.user.id })
      .populate({ path: 'enrolledCourses', select: 'course' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const isEnrolled = student.enrolledCourses?.some((enrollment) =>
      sameId(enrollment.course || enrollment, classData.course)
    );
    if (!sameId(student.franchise, classData.franchise) || !isEnrolled) {
      return res.status(403).json({ success: false, message: 'This class is not available to your student account.' });
    }

    // Check if already joined
    const existingParticipant = classData.participants.find(
      p => p.student.toString() === student._id.toString()
    );

    if (existingParticipant && !existingParticipant.leftAt) {
      return res.status(400).json({
        success: false,
        message: 'Already joined the class'
      });
    }

    // Add participant
    classData.participants.push({
      student: student._id,
      joinedAt: new Date()
    });

    await classData.save();

    res.status(200).json({
      success: true,
      message: 'Joined class successfully',
      data: {
        meetingLink: classData.meetingLink,
        meetingId: classData.meetingId,
        password: classData.password,
        platform: classData.platform
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave online class
// @route   POST /api/online-classes/:id/leave
// @access  Private (Students)
exports.leaveOnlineClass = async (req, res, next) => {
  try {
    const classData = await OnlineClass.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Online class not found'
      });
    }

    // Get student
    const student = await Student.findOne({ user: req.user.id });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    if (!sameId(student.franchise, classData.franchise)) {
      return res.status(403).json({ success: false, message: 'You cannot leave a class from another school.' });
    }

    // Find participant
    const participant = classData.participants.find(
      p => p.student.toString() === student._id.toString() && !p.leftAt
    );

    if (!participant) {
      return res.status(400).json({
        success: false,
        message: 'Not currently in the class'
      });
    }

    // Update participant
    participant.leftAt = new Date();
    participant.duration = Math.round((participant.leftAt - participant.joinedAt) / (1000 * 60)); // in minutes

    await classData.save();

    res.status(200).json({
      success: true,
      message: 'Left class successfully',
      data: {
        duration: participant.duration
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start online class
// @route   PUT /api/online-classes/:id/start
// @access  Private (Instructor, Admin)
exports.startOnlineClass = async (req, res, next) => {
  try {
    const classData = await OnlineClass.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Online class not found'
      });
    }

    // Check permissions
    const isInstructor = sameId(classData.instructor, req.user._id);
    if (!canAccessSchoolClass(req.user, classData) || (!isInstructor && !isSchoolManager(req.user))) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to start this class'
      });
    }

    classData.status = 'live';
    await classData.save();

    res.status(200).json({
      success: true,
      message: 'Class started successfully',
      data: classData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    End online class
// @route   PUT /api/online-classes/:id/end
// @access  Private (Instructor, Admin)
exports.endOnlineClass = async (req, res, next) => {
  try {
    const classData = await OnlineClass.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Online class not found'
      });
    }

    // Check permissions
    const isInstructor = sameId(classData.instructor, req.user._id);
    if (!canAccessSchoolClass(req.user, classData) || (!isInstructor && !isSchoolManager(req.user))) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to end this class'
      });
    }

    classData.status = 'ended';
    await classData.save();

    res.status(200).json({
      success: true,
      message: 'Class ended successfully',
      data: classData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my online classes (for students)
// @route   GET /api/online-classes/my
// @access  Private (Students)
exports.getMyOnlineClasses = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user.id }).populate({ path: 'enrolledCourses', populate: { path: 'course', model: 'Course' } });

    if (!student) {
      console.log('getMyOnlineClasses: Student not found for user:', req.user.id);
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    if (!student.enrolledCourses || student.enrolledCourses.length === 0) {
      console.log('getMyOnlineClasses: Student has no enrolled courses.');
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const enrolledCourseIds = (student.enrolledCourses || []).map(enrollment => enrollment.course?._id).filter(Boolean);

    const query = {
      course: { $in: enrolledCourseIds },
      franchise: student.franchise,
    };
    
    console.log('getMyOnlineClasses: Executing query:', JSON.stringify(query, null, 2));

    const classes = await OnlineClass.find(query)
      .populate('course', 'title')
      .populate('instructor', 'name personalInfo.firstName personalInfo.lastName')
      .sort('scheduledDate');

    console.log(`getMyOnlineClasses: Found ${classes.length} classes for student ${student.studentId}`);

    res.status(200).json({
      success: true,
      count: classes.length,
      data: classes
    });
  } catch (error) {
    console.error('CRITICAL ERROR in getMyOnlineClasses:', error);
    next(error);
  }
};

// @desc    Add material to an online class
// @route   POST /api/online-classes/:id/materials
// @access  Private (Admin, Instructor)
exports.addMaterial = async (req, res, next) => {
  try {
    const classData = await OnlineClass.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({ success: false, message: 'Online class not found' });
    }

    const isInstructor = sameId(classData.instructor, req.user._id);
    if (!canAccessSchoolClass(req.user, classData) || (!isInstructor && !isSchoolManager(req.user))) {
      return res.status(403).json({ success: false, message: 'Not authorized to add materials to this class' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const material = {
      name: req.file.originalname,
      url: getUploadedUrl(req.file),
      uploadedBy: req.user.id
    };

    classData.materials.push(material);
    await classData.save();

    res.status(200).json({
      success: true,
      message: 'Material added successfully',
      data: classData.materials
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
