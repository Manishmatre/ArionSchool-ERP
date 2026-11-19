const mongoose = require('mongoose');
const { isSchoolTenantUser, getSchoolTenantId } = require('../utils/tenantAccess');
const Enquiry = require('../models/Enquiry');
const Student = require('../models/Student');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const { sendStudentWelcomeCredentialsEmail } = require('../utils/emailService');
const studentController = require('./studentController');

const findEnquiryForUser = (req, id) => {
  const query = { _id: id };
  if (isSchoolTenantUser(req.user)) {
    const schoolId = getSchoolTenantId(req.user);
    if (!schoolId) return Promise.resolve(null);
    query.franchise = schoolId;
  }
  return Enquiry.findOne(query);
};

// @desc    Get all enquiries
// @route   GET /api/enquiries
// @access  Private (Super Admin / School Admin)
exports.getAllEnquiries = async (req, res, next) => {
  try {
    let query = {};

    // School admin sees only their school enquiries
    if (req.user && isSchoolTenantUser(req.user)) {
      query.franchise = req.user.franchise;
    }

    // Filter by type
    if (req.query.type && req.query.type !== 'all') {
      query.enquiryType = req.query.type;
    }

    // Filter by status
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    // Filter by source
    if (req.query.source && req.query.source !== 'all') {
      query.source = req.query.source;
    }

    // Filter by priority
    if (req.query.priority && req.query.priority !== 'all') {
      query.priority = req.query.priority;
    }

    // Filter by school
    if (!isSchoolTenantUser(req.user) && req.query.franchise && req.query.franchise !== 'all') {
      query.franchise = req.query.franchise;
    }

    // Filter by course
    if (req.query.course && req.query.course !== 'all') {
      query.course = req.query.course;
    }

    // Filter by assigned user
    if (req.query.assignedTo) {
      query.assignedTo = req.query.assignedTo;
    }

    // Search by name, email, or mobile
    if (req.query.search) {
      const s = String(req.query.search).trim();
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { mobile: { $regex: s, $options: 'i' } }
      ];
    }

    const enquiries = await Enquiry.find(query)
      .populate('course', 'title courseCode regularFee discountedFee duration')
      .populate('franchise', 'name code city state')
      .populate('student', 'studentId personalInfo contactInfo')
      .populate('assignedTo', 'name email')
      .populate('convertedToStudent', 'studentId personalInfo contactInfo')
      .populate('followUps.contactedBy', 'name')
      .sort('-createdAt')
      .lean();

    res.status(200).json({
      success: true,
      count: enquiries.length,
      data: enquiries
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single enquiry
// @route   GET /api/enquiries/:id
// @access  Private
exports.getEnquiry = async (req, res, next) => {
  try {
    const enquiry = await findEnquiryForUser(req, req.params.id)
      .populate('course', 'title courseCode description regularFee discountedFee duration')
      .populate('franchise', 'name code address city state')
      .populate('student', 'studentId personalInfo contactInfo franchise enrolledCourses')
      .populate('assignedTo', 'name email mobile')
      .populate('convertedToStudent', 'studentId personalInfo contactInfo')
      .populate('followUps.contactedBy', 'name')
      .lean();

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    res.status(200).json({
      success: true,
      data: enquiry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new enquiry (Public or Admin CRM)
// @route   POST /api/enquiries
// @access  Public / Private (Admin / Staff)
exports.createEnquiry = async (req, res, next) => {
  try {
    const {
      name,
      email,
      mobile,
      enquiryType,
      course,
      franchise,
      message,
      city,
      state,
      preferredContactTime,
      source,
      priority,
      assignedTo,
      notes
    } = req.body;

    if (!name || !email || !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and mobile number'
      });
    }

    // If logged in as school admin, lock franchise to their own
    let assignedFranchise = franchise || null;
    if (req.user && isSchoolTenantUser(req.user)) {
      assignedFranchise = req.user.franchise;
    }

    const enquiry = await Enquiry.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      enquiryType: enquiryType || (course ? 'course' : 'general'),
      course: course || null,
      franchise: assignedFranchise,
      message: message || notes || 'General enquiry / lead',
      city: city || '',
      state: state || '',
      preferredContactTime: preferredContactTime || '',
      source: source || (req.user ? 'walk_in' : 'website'),
      status: 'new',
      priority: priority || 'medium',
      assignedTo: assignedTo || null,
      notes: notes || ''
    });

    const populated = await Enquiry.findById(enquiry._id)
      .populate('course', 'title courseCode')
      .populate('franchise', 'name code')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Student requests enrollment in a course
// @route   POST /api/enquiries/student/course-request
// @access  Private (Student)
exports.createStudentCourseRequest = async (req, res, next) => {
  try {
    const { courseId, message } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required' });
    }

    const student = await Student.findOne({ user: req.user._id });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const existingEnrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course'
      });
    }

    const pendingEnquiry = await Enquiry.findOne({
      student: student._id,
      course: courseId,
      status: { $in: ['new', 'contacted', 'interested'] }
    });

    if (pendingEnquiry) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending request for this course'
      });
    }

    const studentName = [
      student.personalInfo?.firstName,
      student.personalInfo?.lastName
    ].filter(Boolean).join(' ') || req.user.name || 'Student';

    const enquiry = await Enquiry.create({
      name: studentName,
      email: student.contactInfo?.email || req.user.email,
      mobile: student.contactInfo?.mobile || req.user.mobile || 'N/A',
      enquiryType: 'course',
      course: courseId,
      franchise: student.franchise,
      student: student._id,
      message: message || 'Enrollment request for additional course',
      source: 'student_portal',
      status: 'new',
      priority: 'medium'
    });

    const populated = await Enquiry.findById(enquiry._id)
      .populate('course', 'title thumbnail')
      .populate('franchise', 'name code')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Enrollment request submitted. Admin will contact you soon.',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in student's course enquiries
// @route   GET /api/enquiries/my
// @access  Private (Student)
exports.getMyEnquiries = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const enquiries = await Enquiry.find({
      $or: [
        { student: student._id },
        { email: student.contactInfo?.email, enquiryType: 'course' }
      ]
    })
      .populate('course', 'title thumbnail regularFee discountedFee')
      .populate('franchise', 'name code')
      .sort('-createdAt')
      .lean();

    res.status(200).json({
      success: true,
      count: enquiries.length,
      data: enquiries
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Enroll existing student from enquiry (admin action)
// @route   POST /api/enquiries/:id/enroll-student
// @access  Private (Super Admin / School Admin)
exports.enrollStudentFromEnquiry = async (req, res, next) => {
  try {
    const enquiry = await findEnquiryForUser(req, req.params.id).then((result) => result?.populate('course', 'title'));

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    if (isSchoolTenantUser(req.user) &&
        enquiry.franchise?.toString() !== req.user.franchise?.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this enquiry' });
    }

    if (!enquiry.student) {
      return res.status(400).json({
        success: false,
        message: 'This enquiry is not linked to a registered student'
      });
    }

    const targetCourseId = req.body.courseId || enquiry.course?._id || enquiry.course;
    if (!targetCourseId) {
      return res.status(400).json({
        success: false,
        message: 'No course specified on this enquiry'
      });
    }

    let enrollPayload = null;
    let enrollStatus = 200;
    let enrollError = null;

    const mockReq = {
      params: { id: enquiry.student.toString() },
      body: {
        courseId: targetCourseId.toString(),
        payment: req.body.payment || null
      },
      user: req.user
    };

    const mockRes = {
      status(code) {
        enrollStatus = code;
        return this;
      },
      json(data) {
        enrollPayload = data;
      }
    };

    await studentController.enrollStudentInCourse(mockReq, mockRes, (err) => {
      enrollError = err;
    });

    if (enrollError) return next(enrollError);
    if (!enrollPayload) return;

    if (!enrollPayload.success) {
      return res.status(enrollStatus).json(enrollPayload);
    }

    enquiry.status = 'converted';
    enquiry.convertedToStudent = enquiry.student;
    enquiry.followUps.push({
      date: new Date(),
      notes: req.body.note || 'Student enrolled in course by admin',
      contactedBy: req.user._id
    });
    await enquiry.save();

    const updated = await Enquiry.findById(enquiry._id)
      .populate('course', 'title')
      .populate('student', 'studentId personalInfo')
      .populate('followUps.contactedBy', 'name')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Student enrolled in course successfully',
      data: {
        enquiry: updated,
        student: enrollPayload.data
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update enquiry
// @route   PUT /api/enquiries/:id
// @access  Private (Super Admin / School Admin)
exports.updateEnquiry = async (req, res, next) => {
  try {
    let enquiry = await findEnquiryForUser(req, req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    const updates = { ...req.body };
    if (isSchoolTenantUser(req.user)) updates.franchise = getSchoolTenantId(req.user);
    Object.assign(enquiry, updates);
    await enquiry.save();

    res.status(200).json({
      success: true,
      message: 'Enquiry updated successfully',
      data: enquiry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete enquiry
// @route   DELETE /api/enquiries/:id
// @access  Private (Super Admin)
exports.deleteEnquiry = async (req, res, next) => {
  try {
    const enquiry = await findEnquiryForUser(req, req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    await enquiry.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Enquiry deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update enquiry status
// @route   PUT /api/enquiries/:id/status
// @access  Private (Super Admin / School Admin)
exports.updateEnquiryStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const enquiry = await findEnquiryForUser(req, req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    enquiry.status = status;
    await enquiry.save();

    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      data: enquiry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign enquiry to user
// @route   PUT /api/enquiries/:id/assign
// @access  Private (Super Admin / School Admin)
exports.assignEnquiry = async (req, res, next) => {
  try {
    const { userId } = req.body;

    const enquiry = await findEnquiryForUser(req, req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    if (isSchoolTenantUser(req.user) && userId) {
      const assignedUser = await User.exists({ _id: userId, franchise: getSchoolTenantId(req.user) });
      if (!assignedUser) return res.status(400).json({ success: false, message: 'Choose a user assigned to this school.' });
    }
    enquiry.assignedTo = userId || null;
    await enquiry.save();
    await enquiry.populate('assignedTo', 'name email');

    res.status(200).json({
      success: true,
      message: 'Enquiry assigned successfully',
      data: enquiry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add follow-up to enquiry
// @route   POST /api/enquiries/:id/followup
// @access  Private (Super Admin / School Admin)
exports.addFollowUp = async (req, res, next) => {
  try {
    const { notes, nextFollowUpDate, status } = req.body;

    const enquiry = await findEnquiryForUser(req, req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    enquiry.followUps.push({
      date: new Date(),
      notes,
      nextFollowUpDate: nextFollowUpDate || null,
      contactedBy: req.user._id
    });

    if (status) {
      enquiry.status = status;
    } else if (enquiry.status === 'new') {
      enquiry.status = 'contacted';
    }

    await enquiry.save();

    const updated = await Enquiry.findById(enquiry._id)
      .populate('followUps.contactedBy', 'name')
      .populate('course', 'title')
      .populate('student', 'studentId personalInfo')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Follow-up added successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Convert lead / enquiry directly to student & enroll in course
// @route   POST /api/enquiries/:id/convert
// @access  Private (Super Admin / School Admin)
exports.convertToStudent = async (req, res, next) => {
  try {
    const enquiry = await findEnquiryForUser(req, req.params.id).then((result) => result?.populate('course'));

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    if (enquiry.convertedToStudent && enquiry.status === 'converted') {
      return res.status(400).json({
        success: false,
        message: 'Enquiry is already converted to a student'
      });
    }

    const personalInfo = req.body.personalInfo || {};
    const academicInfo = req.body.academicInfo || {};
    const targetCourseId = req.body.courseId || enquiry.course?._id || enquiry.course;
    const targetFranchiseId = isSchoolTenantUser(req.user)
      ? getSchoolTenantId(req.user)
      : (req.body.franchiseId || enquiry.franchise || null);

    const normalizedEmail = String(req.body.email || enquiry.email || '').trim().toLowerCase();
    const studentMobile = String(req.body.mobile || enquiry.mobile || '').trim();
    const studentFullName = String(req.body.name || enquiry.name || 'Student').trim();

    // Check if user already exists
    let existingUser = await User.findOne({ email: normalizedEmail }).collation({ locale: 'en', strength: 2 });
    let student = null;
    let isNewAccount = false;
    let plainPassword = '';

    if (existingUser) {
      // Find associated student profile
      student = await Student.findOne({ user: existingUser._id });
      if (!student) {
        return res.status(400).json({
          success: false,
          message: `A user account with email "${normalizedEmail}" already exists with role "${existingUser.role}". Cannot convert directly.`
        });
      }
    } else {
      // Create fresh student account
      isNewAccount = true;
      const year = new Date().getFullYear();
      const lastStudent = await Student.findOne({ studentId: { $regex: `^SES-STU-${year}-` } })
        .sort({ studentId: -1 })
        .select('studentId');

      let nextNumber = 1;
      if (lastStudent && lastStudent.studentId) {
        const parts = lastStudent.studentId.split('-');
        if (parts.length === 4) {
          const numericPart = parts[3];
          nextNumber = parseInt(numericPart, 10) + 1;
        }
      }

      const studentId = `SES-STU-${year}-${String(nextNumber).padStart(4, '0')}`;
      const enrollmentNumber = `SES-ENR-${year}-${String(nextNumber).padStart(4, '0')}`;
      plainPassword = `Student@${Math.random().toString(36).slice(-6)}`;

      const nameParts = studentFullName.split(' ');
      const firstName = personalInfo.firstName || nameParts[0] || 'Student';
      const lastName = personalInfo.lastName || nameParts.slice(1).join(' ') || '';

      const user = await User.create({
        name: studentFullName,
        email: normalizedEmail,
        mobile: studentMobile,
        password: plainPassword,
        role: 'student',
        franchise: targetFranchiseId
      });

      student = await Student.create({
        user: user._id,
        studentId,
        enrollmentNumber,
        franchise: targetFranchiseId,
        personalInfo: {
          firstName,
          lastName,
          dateOfBirth: personalInfo.dateOfBirth || null,
          gender: personalInfo.gender || 'male',
          fatherName: personalInfo.fatherName || '',
          motherName: personalInfo.motherName || '',
          ...personalInfo
        },
        contactInfo: {
          email: normalizedEmail,
          mobile: studentMobile,
          address: {
            street: personalInfo.street || '',
            city: enquiry.city || personalInfo.city || '',
            state: enquiry.state || personalInfo.state || '',
            zipCode: personalInfo.zipCode || '',
            country: 'India'
          }
        },
        academicInfo: {
          highestQualification: academicInfo.highestQualification || '12th',
          ...academicInfo
        },
        status: 'active'
      });
    }

    // Enroll in course if specified
    if (targetCourseId && student) {
      const alreadyInList = (student.enrolledCourses || []).some(
        (ec) => (ec.course?._id || ec.course)?.toString() === targetCourseId.toString()
      );

      if (!alreadyInList) {
        student.enrolledCourses.push({
          course: targetCourseId,
          enrollmentDate: new Date(),
          status: 'active'
        });
        await student.save();
      }

      // Also ensure standard Enrollment record exists
      const existingEnrollment = await Enrollment.findOne({
        student: student.user?._id || student.user,
        course: targetCourseId
      });

      if (!existingEnrollment) {
        try {
          await Enrollment.create({
            student: student.user?._id || student.user,
            course: targetCourseId,
            franchise: targetFranchiseId,
            status: 'active',
            enrollmentDate: new Date(),
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          });
        } catch (e) {
          console.warn('Could not create enrollment model record:', e.message);
        }
      }
    }

    // Mark enquiry converted
    enquiry.status = 'converted';
    enquiry.convertedToStudent = student._id;
    enquiry.student = student._id;
    enquiry.followUps.push({
      date: new Date(),
      notes: `Converted lead to student account: ${student.studentId || student._id}${targetCourseId ? ' and enrolled in course' : ''}`,
      contactedBy: req.user._id
    });
    await enquiry.save();

    // Send credentials email in background if new account
    if (isNewAccount && plainPassword) {
      sendStudentWelcomeCredentialsEmail({
        name: studentFullName,
        email: normalizedEmail,
        password: plainPassword
      }).catch((emailError) => {
        console.error('Welcome credentials email error:', emailError.message);
      });
    }

    const populatedStudent = await Student.findById(student._id)
      .populate('franchise', 'name code')
      .populate('enrolledCourses.course', 'title courseCode')
      .lean();

    res.status(200).json({
      success: true,
      message: `Enquiry converted successfully! Student ID: ${student.studentId}`,
      data: {
        enquiry,
        student: populatedStudent,
        tempPassword: isNewAccount ? plainPassword : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get enquiry statistics (ultra-fast single $facet aggregation)
// @route   GET /api/enquiries/stats
// @access  Private (Super Admin / School Admin)
exports.getEnquiryStats = async (req, res, next) => {
  try {
    let matchQuery = {};

    if (req.query.franchise && req.query.franchise !== 'all') {
      try {
        matchQuery.franchise = new mongoose.Types.ObjectId(req.query.franchise);
      } catch {
        matchQuery.franchise = req.query.franchise;
      }
    }

    if (isSchoolTenantUser(req.user)) {
      matchQuery.franchise = req.user.franchise;
    }

    const [result] = await Enquiry.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          counts: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
                contacted: { $sum: { $cond: [{ $eq: ['$status', 'contacted'] }, 1, 0] } },
                interested: { $sum: { $cond: [{ $eq: ['$status', 'interested'] }, 1, 0] } },
                converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
                notInterested: { $sum: { $cond: [{ $eq: ['$status', 'not_interested'] }, 1, 0] } }
              }
            }
          ],
          byType: [
            { $group: { _id: '$enquiryType', count: { $sum: 1 } } }
          ],
          bySource: [
            { $group: { _id: '$source', count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    const statsObj = result?.counts?.[0] || {
      total: 0,
      new: 0,
      contacted: 0,
      interested: 0,
      converted: 0,
      notInterested: 0
    };

    const total = statsObj.total || 0;
    const converted = statsObj.converted || 0;
    const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0';

    res.status(200).json({
      success: true,
      data: {
        total,
        new: statsObj.new || 0,
        contacted: statsObj.contacted || 0,
        interested: statsObj.interested || 0,
        converted,
        notInterested: statsObj.notInterested || 0,
        conversionRate,
        byType: result?.byType || [],
        bySource: result?.bySource || []
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
