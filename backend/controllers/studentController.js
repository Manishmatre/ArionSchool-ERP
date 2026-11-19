const Student = require('../models/Student');
const { isSchoolTenantUser } = require('../utils/tenantAccess');
require('../models/SchoolClass');
require('../models/Section');
require('../models/AcademicSession');
require('../models/House');
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Franchise = require('../models/SchoolCampus');
const Payment = require('../models/Payment');
const TestResult = require('../models/TestResult');
const StudentCertificate = require('../models/StudentCertificate');
const Certificate = require('../models/Certificate');
const OnlineClass = require('../models/OnlineClass');
const Notification = require('../models/Notification');
const Progress = require('../models/Progress');
const Chapter = require('../models/Chapter');
const Topic = require('../models/Topic');
const Attendance = require('../models/Attendance');
const { sendAdmissionConfirmationEmail, sendStudentWelcomeCredentialsEmail } = require('../utils/emailService');
const { deleteFile } = require('../utils/localUploader');
const { syncFromPayment, createObligationsFromEnrollment } = require('../utils/transactionService');
const { getUploadedUrl, isStoredFile } = require('../utils/cloudinary');
const {
  getExamAccessStatusForStudent
} = require('../utils/examAccess');
const { countFranchiseFilledSeats } = require('../utils/seatUtils');
const { getIO } = require('../utils/socket');

const toIdString = (value) => {
  if (value == null) return null;
  const id = value._id ?? value;
  return id?.toString?.() ?? null;
};

// Helper function to check seat availability
const checkSeatAvailability = async (courseId, franchiseId) => {
  const course = await Course.findById(courseId).populate('franchiseSeats.franchise');
  if (!course) {
    return { available: false, message: 'Course not found' };
  }

  const franchiseIdStr = toIdString(franchiseId);

  // Check total seats first
  const totalEnrolled = await Enrollment.countDocuments({ course: courseId });

  // If school-specific seats are available, prioritize them over total seats
  if (franchiseIdStr && course.franchiseSeats && course.franchiseSeats.length > 0) {
    const franchiseSeatAllocation = course.franchiseSeats?.find(
      (fs) => fs.franchise && toIdString(fs.franchise) === franchiseIdStr
    );
    
    if (franchiseSeatAllocation) {
      const franchiseEnrolled = await countFranchiseFilledSeats(courseId, franchiseId);

      if (franchiseEnrolled >= franchiseSeatAllocation.seats) {
        return { available: false, message: 'No seats available for your school in this course' };
      }
      
      // If school has seats, allow enrollment regardless of total seats
      return { available: true };
    } else {
      // School has no allocation in this course
      return { available: false, message: 'No seats allocated for your school in this course' };
    }
  }

  // If no school seats, check total seats
  if (!course.totalSeats || course.totalSeats === 0) {
    // No total seats and no school seats - unlimited enrollment
    return { available: true };
  }

  if (totalEnrolled >= course.totalSeats) {
    return { available: false, message: 'No seats available in this course' };
  }

  return { available: true };
};

// Helper function to create payment record for enrollment
const createEnrollmentPayment = async (studentId, courseId, franchiseId, paymentData, collectedBy) => {
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    // Generate receipt number if not provided
    const generateReceiptNumber = () => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `REC-${year}${month}-${random}`;
    };

    const payment = new Payment({
      student: studentId,
      franchise: franchiseId,
      course: courseId,
      receiptNumber: paymentData.receiptNumber || generateReceiptNumber(),
      amount: paymentData.amount || 0,
      paymentMethod: paymentData.paymentMethod || 'cash',
      paymentType: paymentData.paymentType || 'course_fee',
      paymentStatus: paymentData.paymentStatus || 'completed',
      description: paymentData.description || `Payment for course enrollment - ${course.title}`,
      collectedBy: collectedBy,
      transactionDetails: paymentData.transactionDetails || {},
      dueDate: paymentData.dueDate
    });

    await payment.save();
    await createObligationsFromEnrollment(studentId, courseId, franchiseId, collectedBy);
    await syncFromPayment(payment);
    return payment;
  } catch (error) {
    console.error('Error creating enrollment payment:', error);
    throw error;
  }
};

// @desc    Get all students
// @route   GET /api/students
// @access  Private (Super Admin / School Admin)
exports.getAllStudents = async (req, res, next) => {
  try {
    let query = {};

    // Multi-role School & School Scoping
    const schoolStaffRoles = [
      'franchise_admin',
      'school_admin',
      'principal',
      'vice_principal',
      'teacher',
      'class_teacher',
      'accountant',
      'admission_officer',
      'hr_manager',
      'transport_manager'
    ];

    if (schoolStaffRoles.includes(req.user.role)) {
      query.franchise = req.user.franchise;
    } else if (req.user.role === 'parent') {
      const parentCondition = [];
      if (req.user._id) parentCondition.push({ parent: req.user._id });
      if (Array.isArray(req.user.linkedStudents) && req.user.linkedStudents.length > 0) {
        parentCondition.push({ _id: { $in: req.user.linkedStudents } });
      }
      if (req.user.mobile) {
        parentCondition.push({ 'guardianInfo.mobile': req.user.mobile });
        parentCondition.push({ 'contactInfo.mobile': req.user.mobile });
      }
      query.$or = parentCondition.length > 0 ? parentCondition : [{ _id: null }];
    } else if (req.user.role === 'student') {
      query.user = req.user._id;
    }

    // School Academic Filters
    if (req.query.schoolClass && req.query.schoolClass !== 'all') {
      query.schoolClass = req.query.schoolClass;
    }
    if (req.query.section && req.query.section !== 'all') {
      query.section = req.query.section;
    }
    if (req.query.academicSession && req.query.academicSession !== 'all') {
      query.academicSession = req.query.academicSession;
    }
    if (req.query.house && req.query.house !== 'all') {
      query.house = req.query.house;
    }
    if (req.query.rollNumber) {
      query.rollNumber = req.query.rollNumber;
    }
    if (req.query.admissionNumber) {
      query.admissionNumber = { $regex: req.query.admissionNumber, $options: 'i' };
    }

    // Super admin can filter by school if provided; tenant users are strictly scoped
    if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise && req.query.franchise !== 'all') {
      query.franchise = req.query.franchise;
    }

    // Filter by course if provided
    if (req.query.course && req.query.course !== 'all') {
      const enrollments = await Enrollment.find({ course: req.query.course }).select('_id');
      const enrollmentIds = enrollments.map(e => e._id);
      query.enrolledCourses = { $in: enrollmentIds };
    }

    // Filter by status
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    const isPicker = req.query.picker === 'true';
    const search = (req.query.search || '').trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || (isPicker ? 50 : 0), 100);
    const page = parseInt(req.query.page, 10) || 1;

    if (search) {
      query.$or = [
        { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
        { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { enrollmentNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (isPicker) {
      const students = await Student.find(query)
        .select('studentId personalInfo.firstName personalInfo.lastName personalInfo.fatherName franchise enrolledCourses')
        .populate('franchise', 'name isMainBranch')
        .populate({
          path: 'enrolledCourses',
          populate: { path: 'course', select: 'title name duration' }
        })
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await Student.countDocuments(query);

      return res.status(200).json({
        success: true,
        count: students.length,
        total,
        data: students
      });
    }

    const total = await Student.countDocuments(query);
    let studentsQuery = Student.find(query)
      .populate('user', 'name email mobile profilePicture')
      .populate('franchise', 'name code address isMainBranch owner.ownerSignature')
      .populate('schoolClass', 'name code order')
      .populate('section', 'name roomNumber')
      .populate('academicSession', 'sessionName isCurrent')
      .populate('house', 'name code color')
      .populate('parent', 'name email mobile')
      .populate({
        path: 'enrolledCourses',
        populate: {
          path: 'course',
          model: 'Course',
          select: 'title courseCode duration program',
          populate: {
            path: 'program',
            model: 'Program',
            select: 'name'
          }
        }
      })
      .sort('-createdAt');

    if (limit > 0) {
      studentsQuery = studentsQuery.skip((page - 1) * limit).limit(limit);
    }

    const students = await studentsQuery.lean();

    // Calculate attendance percentage for each student if not already set
    students.forEach(student => {
      if (student.attendance && student.attendance.totalClasses > 0) {
        student.attendance.attendancePercentage = 
          (student.attendance.attendedClasses / student.attendance.totalClasses) * 100;
      }
    });

    res.status(200).json({
      success: true,
      count: students.length,
      total,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
      currentPage: page,
      data: students
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private
exports.getStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('user', 'name email mobile')
      .populate('franchise', 'name code address isMainBranch')
      .populate('schoolClass', 'name code order')
      .populate('section', 'name roomNumber capacity')
      .populate('academicSession', 'sessionName isCurrent startDate endDate')
      .populate('house', 'name code color')
      .populate('parent', 'name email mobile')
      .populate({
        path: 'enrolledCourses',
        populate: {
          path: 'course',
          populate: {
            path: 'program',
            model: 'Program'
          }
        }
      })
      .populate('certificates');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Multi-tenant isolation: non-super_admin users can only view students from their own school
    if (!['super_admin', 'school_owner'].includes(req.user.role) && req.user.role !== 'student' && req.user.role !== 'parent') {
      const studentFid = student.franchise?._id ? student.franchise._id.toString() : student.franchise?.toString();
      const userFid = req.user.franchise?._id ? req.user.franchise._id.toString() : req.user.franchise?.toString();
      if (studentFid && userFid && studentFid !== userFid) {
        return res.status(403).json({
          success: false,
          message: 'Security Alert: Not authorized to view student from another school'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new student
// @route   POST /api/students
// @access  Private (Super Admin / School Admin)
exports.createStudent = async (req, res, next) => {
  try {
    const {
      firstName, lastName, email, phone, dateOfBirth, gender,
      fatherName, motherName, aadhaarNumber, bloodGroup, category, isRTE, rfidCardId,
      address, city, state, pincode,
      franchise, course, enrollmentDate,
      schoolClass, section, academicSession, house, rollNumber, admissionNumber, admissionDate,
      lastQualification, boardOrUniversity, schoolOrCollege, yearOfPassing, percentage,
      totalFees, paidAmount,
      guardianName, guardianPhone, guardianEmail, guardianRelation,
      password, status
    } = req.body; 

    const normalizedEmail = String(email || '').trim().toLowerCase();

    // Check if email already exists
    const existingUser = await User.findOne({ email: normalizedEmail }).collation({ locale: 'en', strength: 2 });
    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Check if phone number already exists
    if (phone) {
      const existingPhone = await User.findOne({ mobile: phone });
      if (existingPhone) {
        throw new Error('Phone number already exists');
      }
    }

    // Generate unique student ID and enrollment number
    const year = new Date().getFullYear();
    
    // Get the last student ID for the current year
    const lastStudent = await Student.findOne({ studentId: { $regex: `^SES-STU-${year}-` } })
      .sort({ studentId: -1 })
      .select('studentId');
    
    let nextNumber = 1;
    if (lastStudent && lastStudent.studentId) {
      // Extract the numeric part from SES-STU-YYYY-NNNN format
      const parts = lastStudent.studentId.split('-');
      if (parts.length === 4) {
        const numericPart = parts[3];
        nextNumber = parseInt(numericPart) + 1;
      }
    }
    
    const studentId = `SES-STU-${year}-${String(nextNumber).padStart(4, '0')}`;
    const enrollmentNumber = `SES-ENR-${year}-${String(nextNumber).padStart(4, '0')}`;
    const finalAdmissionNumber = admissionNumber
      ? String(admissionNumber).trim()
      : `VITS-ADM-${year}-${String(nextNumber).padStart(4, '0')}`;

    // Create user account for student
    const plainPassword = password || `Student@${Math.random().toString(36).slice(-8)}`;
    const user = new User({
      name: `${firstName} ${lastName}`,
      email: normalizedEmail,
      mobile: phone || undefined,
      password: plainPassword,
      role: 'student',
      franchise: isSchoolTenantUser(req.user) ? req.user.franchise : (franchise || req.user.franchise)
    });
    const createdUser = await user.save();

    const student = new Student({
      user: createdUser._id,
      studentId,
      enrollmentNumber,
      admissionNumber: finalAdmissionNumber,
      admissionDate: admissionDate || enrollmentDate || new Date(),
      session: req.body.session || `${year} - ${year + 1}`,
      schoolClass: schoolClass || undefined,
      section: section || undefined,
      academicSession: academicSession || undefined,
      house: house || undefined,
      rollNumber: rollNumber ? String(rollNumber).trim() : undefined,
      category: category || 'General',
      isRTE: !!isRTE,
      rfidCardId: rfidCardId || undefined,
      franchise: isSchoolTenantUser(req.user) ? req.user.franchise : (franchise || req.user.franchise),
      personalInfo: {
        firstName,
        lastName,
        dateOfBirth,
        gender,
        fatherName,
        motherName,
        bloodGroup: bloodGroup || undefined,
        aadhaarNumber
      },
      academicInfo: {
        lastQualification,
        boardOrUniversity,
        schoolOrCollege,
        yearOfPassing,
        percentage
      },
      fees: {
        totalFees: totalFees ? Number(totalFees) : 0,
        paidAmount: paidAmount ? Number(paidAmount) : 0
      },
      contactInfo: {
        email: normalizedEmail,
        mobile: phone || undefined,
        address: {
          street: address,
          city,
          state,
          pincode,
          country: 'India'
        }
      },
      guardianInfo: {
        name: guardianName || fatherName || '',
        mobile: guardianPhone || phone || '',
        email: guardianEmail || '',
        relation: guardianRelation || 'Parent'
      },
      status: status || 'active'
    });
    const createdStudent = await student.save();

    // Automatically establish StudentEnrollment for the academic session
    if (createdStudent.schoolClass && createdStudent.academicSession) {
      const StudentEnrollment = require('../models/StudentEnrollment');
      await StudentEnrollment.findOneAndUpdate(
        { student: createdStudent._id, academicSession: createdStudent.academicSession },
        {
          student: createdStudent._id,
          academicSession: createdStudent.academicSession,
          schoolClass: createdStudent.schoolClass,
          section: createdStudent.section,
          rollNumber: createdStudent.rollNumber,
          status: 'active',
          franchise: createdStudent.franchise
        },
        { upsert: true, new: true }
      );
    }

    // Send Welcome Email with Credentials to Student
    try {
      const { sendStudentWelcomeCredentialsEmail } = require('../utils/emailService');
      await sendStudentWelcomeCredentialsEmail({
        name: createdUser.name,
        email: createdUser.email,
        password: plainPassword
      });
      console.log('Student welcome email sent to:', createdUser.email);
    } catch (emailError) {
      console.error('Welcome credentials email error:', emailError);
    }

    // Enroll in course if provided
    if (course) {
      const courseData = await Course.findById(course);
      if (courseData) {
        // Check seat availability for both school admin and super admin
        const franchiseId = isSchoolTenantUser(req.user) ? req.user.franchise : franchise;
        const seatCheck = await checkSeatAvailability(course, franchiseId);
        if (!seatCheck.available) {
          throw new Error(seatCheck.message);
        }

        const enrollment = new Enrollment({
          student: createdUser._id,
          course: course,
          enrolledAt: enrollmentDate || new Date(),
          session: req.body.session || createdStudent.session || `${year} - ${year + 1}`,
          isActive: true
        });
        await enrollment.save();

        createdStudent.enrolledCourses.push(enrollment._id);

        const standardCourseFee = courseData.discountedFee > 0 ? courseData.discountedFee : courseData.regularFee;
        const paymentData = req.body.payment;
        const includeRegistrationFee = !!(paymentData && paymentData.includeRegistrationFee);
        const hasCustomTotalFee = totalFees !== undefined && totalFees !== '' && !isNaN(Number(totalFees));
        const effectiveTotalFee = hasCustomTotalFee
          ? Math.max(0, Number(totalFees))
          : (standardCourseFee + (includeRegistrationFee ? (courseData.registrationFee || 0) : 0));

        // When custom totalFees is supplied, course fee portion is total minus registration fee (if included)
        const courseFee = hasCustomTotalFee
          ? Math.max(0, effectiveTotalFee - (includeRegistrationFee ? (courseData.registrationFee || 0) : 0))
          : standardCourseFee;

        // Synchronize student fee record with the actual total fees
        createdStudent.fees.totalFees = effectiveTotalFee;
        if (paymentData && paymentData.paidAmount !== undefined && paymentData.paidAmount !== '') {
          createdStudent.fees.paidAmount = Math.max(0, Number(paymentData.paidAmount) || 0);
        }
        await createdStudent.save();

        await createObligationsFromEnrollment(
          createdStudent._id,
          course,
          franchiseId,
          req.user._id,
          courseFee
        );

        // Create payment record if payment data is provided
        if (req.body.payment) {
          
          // Create registration fee payment if applicable
          if (courseData.registrationFee > 0 && paymentData.includeRegistrationFee) {
            await createEnrollmentPayment(
              createdStudent._id,
              course,
              franchiseId,
              {
                amount: courseData.registrationFee,
                paymentMethod: paymentData.paymentMethod,
                paymentType: 'registration',
                paymentStatus: paymentData.paymentStatus || 'completed',
                description: `Registration fee for ${courseData.title}`,
                transactionDetails: paymentData.transactionDetails
              },
              req.user._id
            );
          }

          // Create course fee payment (partial or full)
          if (paymentData.paidAmount > 0) {
            await createEnrollmentPayment(
              createdStudent._id,
              course,
              franchiseId,
              {
                amount: paymentData.paidAmount,
                paymentMethod: paymentData.paymentMethod,
                paymentType: 'course_fee',
                paymentStatus: paymentData.paymentStatus || 'completed',
                description: `${paymentData.paidAmount < courseFee ? 'Partial' : 'Full'} payment for ${courseData.title}`,
                transactionDetails: paymentData.transactionDetails
              },
              req.user._id
            );
          }

          // Create balance due record if partial payment
          if (paymentData.paidAmount < courseFee && paymentData.createBalanceRecord) {
            const balanceAmount = courseFee - paymentData.paidAmount;
            await createEnrollmentPayment(
              createdStudent._id,
              course,
              franchiseId,
              {
                amount: balanceAmount,
                paymentMethod: paymentData.paymentMethod,
                paymentType: 'course_fee',
                paymentStatus: 'pending',
                description: `Balance due for ${courseData.title}`,
                dueDate: paymentData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                transactionDetails: paymentData.transactionDetails
              },
              req.user._id
            );
          }
        } else {
          // Create unpaid payment records if no payment data provided
          // Create unpaid registration fee record if applicable
          if (courseData.registrationFee > 0) {
            await createEnrollmentPayment(
              createdStudent._id,
              course,
              franchiseId,
              {
                amount: courseData.registrationFee,
                paymentMethod: 'cash',
                paymentType: 'registration',
                paymentStatus: 'pending',
                description: `Registration fee for ${courseData.title}`,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                transactionDetails: {}
              },
              req.user._id
            );
          }

          // Create unpaid course fee record
          if (courseFee > 0) {
            await createEnrollmentPayment(
              createdStudent._id,
              course,
              franchiseId,
              {
                amount: courseFee,
                paymentMethod: 'cash',
                paymentType: 'course_fee',
                paymentStatus: 'pending',
                description: `Course fee for ${courseData.title}`,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                transactionDetails: {}
              },
              req.user._id
            );
          }
        }
      }
    }

    // Add student to school's students array
    const franchiseId = isSchoolTenantUser(req.user) ? req.user.franchise : franchise;
    if (franchiseId) {
      await Franchise.findByIdAndUpdate(
        franchiseId,
        { $addToSet: { students: createdStudent._id } },
        { new: true }
      );
    }

    try {
      // Email sending moved to student creation block above for cleaner flow
    } catch (emailError) {
      console.error('Welcome credentials email error:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: createdStudent
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// @access  Private (Super Admin / School Admin)
exports.updateStudent = async (req, res, next) => {
  try {
    let student = await Student.findById(req.params.id).populate({
        path: 'enrolledCourses',
        populate: {
          path: 'course',
          model: 'Course'
        }
      });

    if (!student) {
      throw new Error('Student not found');
    }

    if (!['super_admin', 'school_owner'].includes(req.user.role)) {
      const studentFid = student.franchise?._id ? student.franchise._id.toString() : student.franchise?.toString();
      const userFid = req.user.franchise?._id ? req.user.franchise._id.toString() : req.user.franchise?.toString();
      if (studentFid && userFid && studentFid !== userFid) {
        throw new Error('Security Alert: Not authorized to update student of another school');
      }
    }

    const normalizeObjectId = (value) => {
      if (!value) return null;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (mongoose.Types.ObjectId.isValid(trimmed)) return trimmed;
        // Attempt to parse stringified object or extract from regex
        const match = trimmed.match(/ObjectId\(\"([a-fA-F0-9]{24})\"\)/) || trimmed.match(/ObjectId\(\'([a-fA-F0-9]{24})\'\)/);
        if (match && match[1] && mongoose.Types.ObjectId.isValid(match[1])) return match[1];
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && parsed._id && mongoose.Types.ObjectId.isValid(parsed._id)) return String(parsed._id);
        } catch (e) {
          // Not a JSON string, ignore
        }
        return trimmed; // return as is if no objectId found
      }

      if (typeof value === 'object') {
        const id = value._id || value.id;
        if (id && mongoose.Types.ObjectId.isValid(id)) return String(id);
        if (value.toString && mongoose.Types.ObjectId.isValid(value.toString())) return value.toString();
      }

      return null;
    };

    const { course, franchise, ...updateData } = req.body;
    const newCourseId = normalizeObjectId(course);
    const newFranchiseId = isSchoolTenantUser(req.user)
      ? normalizeObjectId(req.user.franchise)
      : normalizeObjectId(franchise);
    const oldFranchiseId = student.franchise;

    // Handle school change
    if (newFranchiseId && newFranchiseId.toString() !== oldFranchiseId.toString()) {
      // Remove student from old school
      await Franchise.findByIdAndUpdate(oldFranchiseId, { $pull: { students: student._id } });

      // Add student to new school
      await Franchise.findByIdAndUpdate(newFranchiseId, { $addToSet: { students: student._id } });

      student.franchise = newFranchiseId;
      
      // Update user's school
      await User.findByIdAndUpdate(student.user, { franchise: newFranchiseId });

      // Update school in all payment records for this student
      await Payment.updateMany({ student: student._id }, { franchise: newFranchiseId });
    }

    // Update basic fields
    // Update student fields from request body
    student.status = updateData.status || student.status;
    student.personalInfo.firstName = updateData.firstName || student.personalInfo.firstName;
    student.personalInfo.lastName = updateData.lastName || student.personalInfo.lastName;
    student.personalInfo.fatherName = updateData.fatherName || student.personalInfo.fatherName;
    student.personalInfo.motherName = updateData.motherName || student.personalInfo.motherName;
    student.personalInfo.aadhaarNumber = updateData.aadhaarNumber || student.personalInfo.aadhaarNumber;
    student.personalInfo.dateOfBirth = updateData.dateOfBirth || student.personalInfo.dateOfBirth;
    student.personalInfo.gender = updateData.gender || student.personalInfo.gender;
    
    // Handle Email Update (Only for Super Admin)
    if (updateData.email && updateData.email !== student.contactInfo.email) {
      if (['super_admin', 'school_owner'].includes(req.user.role)) {
        const emailExists = await User.findOne({ email: updateData.email, _id: { $ne: student.user } });
        if (emailExists) {
          throw new Error('Email already in use by another user');
        }
        
        // Update both Student and User models
        student.contactInfo.email = updateData.email;
        await User.findByIdAndUpdate(student.user, { email: updateData.email });
        console.log(`📧 Email updated for student ${student._id} to ${updateData.email} by Super Admin`);
      } else {
        console.warn(`⚠️ Unauthorized email update attempt by ${req.user.role} for student ${student._id}`);
      }
    }

    student.contactInfo.mobile = updateData.phone || student.contactInfo.mobile;
    student.contactInfo.address.street = updateData.address || student.contactInfo.address.street;
    student.contactInfo.address.city = updateData.city || student.contactInfo.address.city;
    student.contactInfo.address.state = updateData.state || student.contactInfo.address.state;
    student.contactInfo.address.pincode = updateData.pincode || student.contactInfo.address.pincode;
    student.academicInfo.lastQualification = updateData.lastQualification || student.academicInfo.lastQualification;
    student.academicInfo.boardOrUniversity = updateData.boardOrUniversity || student.academicInfo.boardOrUniversity;
    student.academicInfo.schoolOrCollege = updateData.schoolOrCollege || student.academicInfo.schoolOrCollege;
    student.academicInfo.yearOfPassing = updateData.yearOfPassing || student.academicInfo.yearOfPassing;
    student.academicInfo.percentage = updateData.percentage || student.academicInfo.percentage;
    if (updateData.totalFees !== undefined && updateData.totalFees !== '' && !isNaN(Number(updateData.totalFees))) {
      student.fees.totalFees = Number(updateData.totalFees);
    }
    if (updateData.paidAmount === undefined || updateData.paidAmount === null || updateData.paidAmount === '') {
      // paidAmount in the form is for additional payments, not total paid
    } else if (!req.body.payment) {
      student.fees.paidAmount = Number(updateData.paidAmount);
    }
    student.guardianInfo.name = updateData.guardianName || student.guardianInfo.name;
    student.guardianInfo.mobile = updateData.guardianPhone || student.guardianInfo.mobile;
    student.guardianInfo.email = updateData.guardianEmail || student.guardianInfo.email;

    // Update school academic fields
    if (updateData.schoolClass !== undefined) {
      student.schoolClass = updateData.schoolClass ? normalizeObjectId(updateData.schoolClass) : null;
    }
    if (updateData.section !== undefined) {
      student.section = updateData.section ? normalizeObjectId(updateData.section) : null;
    }
    if (updateData.academicSession !== undefined) {
      student.academicSession = updateData.academicSession ? normalizeObjectId(updateData.academicSession) : null;
    }
    if (updateData.house !== undefined) {
      student.house = updateData.house ? normalizeObjectId(updateData.house) : null;
    }
    if (updateData.rollNumber !== undefined) {
      student.rollNumber = updateData.rollNumber ? String(updateData.rollNumber).trim() : '';
    }
    if (updateData.admissionNumber !== undefined) {
      student.admissionNumber = updateData.admissionNumber ? String(updateData.admissionNumber).trim() : '';
    }
    if (updateData.admissionDate !== undefined) {
      student.admissionDate = updateData.admissionDate;
    }
    if (updateData.bloodGroup !== undefined) {
      student.personalInfo.bloodGroup = updateData.bloodGroup;
    }
    if (updateData.category !== undefined) {
      student.category = updateData.category;
    }
    if (updateData.isRTE !== undefined) {
      student.isRTE = !!updateData.isRTE;
    }
    if (updateData.rfidCardId !== undefined) {
      student.rfidCardId = updateData.rfidCardId;
    }

    const activeEnrollments = (student.enrolledCourses || []).filter((e) => e && e.isActive !== false);
    const currentEnrollment = activeEnrollments[0];
    const currentCourseId = currentEnrollment?.course?._id?.toString() || normalizeObjectId(currentEnrollment?.course);

    if (newCourseId && activeEnrollments.length > 1) {
      const enrolledCourseIds = activeEnrollments
        .map((e) => normalizeObjectId(e.course)?.toString())
        .filter(Boolean);
      if (!enrolledCourseIds.includes(newCourseId.toString())) {
        return res.status(400).json({
          success: false,
          message:
            'Student is enrolled in multiple courses. Add or change courses from Student Details instead of Edit Student.'
        });
      }
    } else if (newCourseId && newCourseId !== currentCourseId) {
      // Remove old enrollment if it exists
      if (currentEnrollment) {
        // Delete all payment records for the old course
        await Payment.deleteMany({
          student: student._id,
          course: currentCourseId
        });
        
        await Enrollment.findByIdAndDelete(currentEnrollment._id);
        student.enrolledCourses.pull(currentEnrollment._id);
        
        // Reset student's fee information since course changed
        student.fees.totalFees = 0;
        student.fees.paidAmount = 0;
        student.fees.pendingAmount = 0;
        
        // Reset separate fee amounts
        student.fees.registrationFee = 0;
        student.fees.registrationPaid = 0;
        student.fees.examFee = 0;
        student.fees.examPaid = 0;
        student.fees.certificateFee = 0;
        student.fees.certificatePaid = 0;
      }

      // Add new enrollment if a new course is provided
      if (newCourseId) {
        const franchiseId = student.franchise;
        const seatCheck = await checkSeatAvailability(newCourseId, franchiseId);
        if (!seatCheck.available) {
          throw new Error(seatCheck.message);
        }

        const newEnrollment = new Enrollment({
          student: student.user,
          course: newCourseId,
          enrolledAt: new Date(),
          isActive: true,
        });
        await newEnrollment.save();

        if (!student.enrolledCourses) {
          student.enrolledCourses = [];
        }
        student.enrolledCourses.push(newEnrollment._id);
        
        // Update student's fee information with new course fees
        const courseData = await Course.findById(newCourseId);
        if (courseData) {
          // Set separate fee amounts for different payment types
          student.fees.registrationFee = courseData.registrationFee || 0;
          student.fees.examFee = courseData.examFee || 0;
          student.fees.certificateFee = courseData.certificateFee || 0;
          
          // Update total fees to include all fee types
          const courseFee = courseData.discountedFee > 0 ? courseData.discountedFee : courseData.regularFee;
          student.fees.totalFees = courseFee + (courseData.registrationFee || 0) + (courseData.examFee || 0) + (courseData.certificateFee || 0);
          
          // Reset paid amounts for new course
          student.fees.registrationPaid = 0;
          student.fees.examPaid = 0;
          student.fees.certificatePaid = 0;
          
          // Create unpaid payment records for the new course if no payment data provided
          if (!req.body.payment) {
            // Create unpaid registration fee record if applicable
            if (courseData.registrationFee > 0) {
              await createEnrollmentPayment(
                student._id,
                newCourseId,
                franchiseId,
                {
                  amount: courseData.registrationFee,
                  paymentMethod: 'cash',
                  paymentType: 'registration',
                  paymentStatus: 'pending',
                  description: `Registration fee for ${courseData.title}`,
                  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                  transactionDetails: {}
                },
                req.user._id
              );
            }

            // Create unpaid course fee record
            if (courseFee > 0) {
              await createEnrollmentPayment(
                student._id,
                newCourseId,
                franchiseId,
                {
                  amount: courseFee,
                  paymentMethod: 'cash',
                  paymentType: 'course_fee',
                  paymentStatus: 'pending',
                  description: `Course fee for ${courseData.title}`,
                  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                  transactionDetails: {}
                },
                req.user._id
              );
            }
          }
        }
      }
    }

    const updatedStudent = await student.save();

    // Keep active StudentEnrollment in sync
    if (student.schoolClass && student.academicSession) {
      const StudentEnrollment = require('../models/StudentEnrollment');
      await StudentEnrollment.findOneAndUpdate(
        { student: student._id, academicSession: student.academicSession },
        {
          student: student._id,
          academicSession: student.academicSession,
          schoolClass: student.schoolClass,
          section: student.section,
          rollNumber: student.rollNumber,
          status: student.status,
          franchise: student.franchise
        },
        { upsert: true, new: true }
      );
    }

    // Handle payment updates if payment data is provided
    if (req.body.payment) {
      const paymentData = req.body.payment;
      const paymentCourseId =
        normalizeObjectId(paymentData.courseId) ||
        normalizeObjectId(
          (student.enrolledCourses || []).find((e) => e && e.isActive !== false)?.course
        );

      if (paymentCourseId) {
        const courseId = paymentCourseId;
        const franchiseId = student.franchise;
        
        // Create registration fee payment if applicable
        if (paymentData.includeRegistrationFee) {
          const course = await Course.findById(courseId);
          if (course && course.registrationFee > 0) {
            await createEnrollmentPayment(
              student._id,
              courseId,
              franchiseId,
              {
                amount: course.registrationFee,
                paymentMethod: paymentData.paymentMethod,
                paymentType: 'registration',
                paymentStatus: paymentData.paymentStatus || 'completed',
                description: `Registration fee for ${course.title}`,
                transactionDetails: paymentData.transactionDetails
              },
              req.user._id
            );
          }
        }

        // Create course fee payment (additional payment)
        if (paymentData.paidAmount > 0) {
          await createEnrollmentPayment(
            student._id,
            courseId,
            franchiseId,
            {
              amount: paymentData.paidAmount,
              paymentMethod: paymentData.paymentMethod,
              paymentType: 'course_fee',
              paymentStatus: paymentData.paymentStatus || 'completed',
              description: `Additional payment for course`,
              transactionDetails: paymentData.transactionDetails
            },
            req.user._id
          );

          student.fees.paidAmount = (Number(student.fees?.paidAmount) || 0) + Number(paymentData.paidAmount);
          student.fees.pendingAmount = Math.max(
            0,
            (Number(student.fees?.totalFees) || 0) - student.fees.paidAmount
          );
          student.fees.lastPaymentDate = new Date();
          await student.save();
        }

        // Create balance due record if applicable
        if (paymentData.createBalanceRecord && paymentData.paidAmount > 0) {
          const course = await Course.findById(courseId);
          if (course) {
            const courseFee = (student.fees?.totalFees && Number(student.fees.totalFees) > 0)
              ? Number(student.fees.totalFees)
              : (course.discountedFee > 0 ? course.discountedFee : course.regularFee);
            const balanceAmount = courseFee - paymentData.paidAmount;
            
            if (balanceAmount > 0) {
              await createEnrollmentPayment(
                student._id,
                courseId,
                franchiseId,
                {
                  amount: balanceAmount,
                  paymentMethod: paymentData.paymentMethod,
                  paymentType: 'course_fee',
                  paymentStatus: 'pending',
                  description: `Balance due for ${course.title}`,
                  dueDate: paymentData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                  transactionDetails: paymentData.transactionDetails
                },
                req.user._id
              );
            }
          }
        }
      }
    } else {
      // Create unpaid payment record if no payment data provided and student has an active enrollment
      const enrollment = (student.enrolledCourses || []).find(e => e && e.isActive);
      
      if (enrollment && enrollment.course) {
        const courseId = normalizeObjectId(enrollment.course);
        const franchiseId = student.franchise;
        
        // Check if there are any existing payments for this student and course
        const existingPayments = await Payment.find({
          student: student._id,
          course: courseId,
          paymentStatus: { $in: ['pending', 'completed'] }
        });
        
        // Only create unpaid record if no existing payments found
        if (existingPayments.length === 0) {
          const course = await Course.findById(courseId);
          if (course) {
            // Create unpaid course fee record
            const courseFee = course.discountedFee > 0 ? course.discountedFee : course.regularFee;
            if (courseFee > 0) {
              await createEnrollmentPayment(
                student._id,
                courseId,
                franchiseId,
                {
                  amount: courseFee,
                  paymentMethod: 'cash',
                  paymentType: 'course_fee',
                  paymentStatus: 'pending',
                  description: `Course fee for ${course.title}`,
                  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                  transactionDetails: {}
                },
                req.user._id
              );
            }
            
            // Create unpaid registration fee record if applicable
            if (course.registrationFee > 0) {
              await createEnrollmentPayment(
                student._id,
                courseId,
                franchiseId,
                {
                  amount: course.registrationFee,
                  paymentMethod: 'cash',
                  paymentType: 'registration',
                  paymentStatus: 'pending',
                  description: `Registration fee for ${course.title}`,
                  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                  transactionDetails: {}
                },
                req.user._id
              );
            }
          }
        }
      }
    }

    // Sync with User model
    await User.findByIdAndUpdate(student.user, { 
      name: `${student.personalInfo.firstName} ${student.personalInfo.lastName}`,
      email: student.contactInfo.email,
    });

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private (Super Admin / School Admin)
exports.deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check permissions across all tenant roles
    if (!['super_admin', 'school_owner'].includes(req.user.role)) {
      const studentFid = student.franchise?._id ? student.franchise._id.toString() : student.franchise?.toString();
      const userFid = req.user.franchise?._id ? req.user.franchise._id.toString() : req.user.franchise?.toString();
      if (studentFid && userFid && studentFid !== userFid) {
        return res.status(403).json({
          success: false,
          message: 'Security Alert: Not authorized to delete student of another school'
        });
      }
    }

    if (['super_admin', 'school_owner'].includes(req.user.role)) {
      // Super admin can permanently delete
      // Remove student from school's students array
      if (student.franchise) {
        await Franchise.findByIdAndUpdate(
          student.franchise,
          { $pull: { students: student._id } },
          { new: true }
        );
      }
      
      // Delete all related records
      // 1. Delete enrollments
      await Enrollment.deleteMany({ student: student.user });
      
      // 2. Delete payments
      await Payment.deleteMany({ student: student._id });
      
      // 3. Delete test results
      await TestResult.deleteMany({ student: student._id });
      
      // 4. Delete ALL certificates for this student (both new and old collections)
      await StudentCertificate.deleteMany({ student: student._id });
      await Certificate.deleteMany({ student: student._id });
      
      // 5. Delete student record
      await student.deleteOne();
      
      // 6. Delete user record
      await User.findByIdAndDelete(student.user);
      
      res.status(200).json({
        success: true,
        message: 'Student and all related records permanently deleted successfully'
      });
    } else {
      // School admin can only deactivate
      student.status = 'inactive';
      await student.save();

      // Deactivate the associated user record
      const user = await User.findById(student.user);
      if (user) {
        user.isActive = false;
        user.status = 'inactive';
        await user.save();
      }

      res.status(200).json({
        success: true,
        message: 'Student and user account deactivated successfully'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get student dashboard data
// @route   GET /api/students/:id/dashboard
// @access  Private (Student / Admin)
exports.getStudentDashboard = async (req, res, next) => {
  try {
    let studentId = req.params.id;
    let student = null;

    const populateOpts = [
      {
        path: 'enrolledCourses',
        populate: {
          path: 'course',
          model: 'Course'
        }
      },
      {
        path: 'franchise',
        select: 'name franchiseName centerCode city state phone email address'
      },
      {
        path: 'certificates'
      },
      {
        path: 'examResults.exam'
      }
    ];

    if (studentId === 'me' || !studentId) {
      student = await Student.findOne({ user: req.user._id }).populate(populateOpts);
      if (!student && req.user.studentDetails) {
        student = await Student.findById(req.user.studentDetails).populate(populateOpts);
      }
    } else {
      student = await Student.findById(studentId).populate(populateOpts);
      if (!student) {
        student = await Student.findOne({ user: studentId }).populate(populateOpts);
      }
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Progress Calculation
    const enrolledCourseIds = (student.enrolledCourses || [])
      .map((e) => e?.course?._id || e?.course)
      .filter(Boolean);
    const chapters = await Chapter.find({ isActive: true, course: { $in: enrolledCourseIds } });
    const chapterIds = chapters.map(c => c._id);

    const topics = await Topic.find({ isActive: true, chapter: { $in: chapterIds } });
    const topicIds = topics.map(t => t._id);

    const progressRecords = await Progress.find({ student: student.user, topic: { $in: topicIds } });

    const completedTopicsCount = progressRecords.filter(p => p.videoWatched || p.isCompleted).length;
    const totalTopicsCount = topics.length;
    const overallProgress = totalTopicsCount > 0 ? Math.round((completedTopicsCount / totalTopicsCount) * 100) : 0;

    // Fetch Today's Attendance
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayAttendance = await Attendance.findOne({
      student: student._id,
      status: 'present',
      $or: [
        { date: { $gte: startOfDay, $lte: endOfDay } },
        { punchInTime: { $gte: startOfDay, $lte: endOfDay } }
      ]
    }).sort('-punchInTime -date');

    // Fetch Online Classes
    const onlineClasses = await OnlineClass.find({
      course: { $in: enrolledCourseIds },
      $or: [
        { franchise: student.franchise?._id || student.franchise },
        { franchise: { $exists: false } },
        { franchise: null }
      ]
    }).sort('scheduledDate').limit(5).populate('course', 'title').populate('instructor', 'name personalInfo');

    // Fetch Notifications
    const notificationsRaw = await Notification.find({
      $or: [
        { recipients: 'all' },
        { recipients: 'students' },
        { specificUsers: student.user },
        { specificFranchise: student.franchise?._id || student.franchise }
      ],
      status: 'sent'
    })
      .populate('createdBy', 'name')
      .sort('-createdAt')
      .limit(5);

    const notifications = notificationsRaw.map(notification => {
      const isRead = (notification.readBy || []).some(
        read => read?.user?.toString() === student.user.toString()
      );
      return {
        ...notification.toObject(),
        isRead
      };
    });

    const enrolledCourses = Array.isArray(student.enrolledCourses) ? student.enrolledCourses : [];
    const completedCoursesCount = enrolledCourses.filter(e => e && (e.progress === 100 || e.status === 'completed')).length;
    const activeCoursesCount = enrolledCourses.filter(e => e && (e.isActive || e.status === 'active') && e.progress !== 100 && e.status !== 'completed').length;

    const enrolledCoursesList = enrolledCourses
      .filter((e) => e && (e.course || e._id))
      .map((e) => {
        const c = e.course && typeof e.course === 'object' ? e.course : null;
        return {
          _id: String(c?._id || e.course || e._id),
          title: c?.title || 'Course Lecture Workspace',
          thumbnail: c?.thumbnail || '',
          category: c?.category || 'Professional Course',
          totalDuration: c?.totalDuration || c?.duration || 0,
          totalLectures: c?.totalLectures || 0,
          progress: typeof e.progress === 'number' ? e.progress : 0,
          status: e.status || (e.progress === 100 ? 'completed' : 'active'),
          enrolledAt: e.enrolledAt || e.createdAt
        };
      });

    const totalFees = student.fees?.totalFees || 0;
    const paidAmount = student.fees?.paidAmount || 0;
    const pendingAmount = typeof student.fees?.pendingAmount === 'number' ? student.fees.pendingAmount : Math.max(0, totalFees - paidAmount);

    const attendancePercentage = student.attendance?.attendancePercentage || 0;
    const totalClasses = student.attendance?.totalClasses || 0;
    const attendedClasses = student.attendance?.attendedClasses || 0;

    const dashboardData = {
      student: {
        _id: student._id,
        name: `${student.personalInfo?.firstName || ''} ${student.personalInfo?.lastName || ''}`.trim(),
        firstName: student.personalInfo?.firstName || student.user?.name || 'Student',
        studentId: student.studentId || '',
        enrollmentNumber: student.enrollmentNumber || student.rollNumber || student.studentId || '',
        rollNumber: student.rollNumber || '',
        photo: student.personalInfo?.photo || '',
        email: student.personalInfo?.email || student.user?.email || '',
        phone: student.personalInfo?.phone || '',
        academicStatus: student.academicStatus || 'Active',
        franchise: student.franchise ? {
          _id: student.franchise._id,
          name: student.franchise.name || student.franchise.franchiseName || 'SES Main Learning Center',
          centerCode: student.franchise.centerCode || 'SES-HQ',
          city: student.franchise.city || '',
          state: student.franchise.state || '',
          phone: student.franchise.phone || '',
          email: student.franchise.email || ''
        } : null
      },
      todayAttendance: todayAttendance ? {
        punched: true,
        status: 'present',
        punchInTime: todayAttendance.punchInTime || todayAttendance.date,
        punchInTimeFormatted: todayAttendance.punchInTime
          ? new Date(todayAttendance.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : new Date(todayAttendance.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        verifiedAtCenter: Boolean(todayAttendance.verified || todayAttendance.verifiedByCenter)
      } : {
        punched: false,
        status: 'pending'
      },
      enrolledCoursesList,
      courses: {
        total: enrolledCourses.length,
        completed: completedCoursesCount,
        active: activeCoursesCount
      },
      progress: {
        overallProgress,
        totalTopics: totalTopicsCount,
        completedTopics: completedTopicsCount,
        totalChapters: chapters.length,
        completedChapters: chapters.filter(ch => {
          const chapterTopics = topics.filter(t => t.chapter.toString() === ch._id.toString());
          if (chapterTopics.length === 0) return false;
          return chapterTopics.every(t => 
            progressRecords.some(p => p.topic.toString() === t._id.toString() && (p.videoWatched || p.isCompleted))
          );
        }).length
      },
      fees: {
        total: totalFees,
        paid: paidAmount,
        pending: pendingAmount
      },
      attendance: {
        percentage: attendancePercentage,
        totalClasses,
        attended: attendedClasses
      },
      certificates: (student.certificates || []).length,
      recentExams: (student.examResults || []).slice(-5).reverse(),
      onlineClasses: onlineClasses,
      notifications: notifications
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student progress
// @route   GET /api/students/:id/progress
// @access  Private
exports.getStudentProgress = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('enrolledCourses.course', 'title duration');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const progress = student.enrolledCourses.map(enrollment => ({
      course: enrollment.course,
      progress: enrollment.progress,
      status: enrollment.status,
      enrollmentDate: enrollment.enrollmentDate,
      completionDate: enrollment.completionDate
    }));

    res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
};

// Helper to add course fee totals when enrolling in an additional course
const appendCourseFeesToStudent = (student, courseData, isFirstCourse = false) => {
  const registrationFee = isFirstCourse ? (courseData.registrationFee || 0) : 0;
  const courseFee = courseData.discountedFee > 0 ? courseData.discountedFee : courseData.regularFee || 0;
  const addedTotal = registrationFee + courseFee;

  student.fees.totalFees = (Number(student.fees?.totalFees) || 0) + addedTotal;
  student.fees.pendingAmount = (Number(student.fees?.pendingAmount) || 0) + addedTotal;

  if (registrationFee > 0) {
    student.fees.registrationFee = (Number(student.fees?.registrationFee) || 0) + registrationFee;
    student.fees.registrationPending = (Number(student.fees?.registrationPending) || 0) + registrationFee;
  }
};

// @desc    Enroll student in course
// @route   POST /api/students/:id/enroll
// @access  Private (Super Admin / School Admin)
exports.enrollStudentInCourse = async (req, res, next) => {
  try {
    const { courseId, payment } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required' });
    }

    const student = await Student.findById(req.params.id).populate('user', '_id');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const studentUserId = student.user?._id || student.user;
    const studentFranchiseId = student.franchise?._id || student.franchise;

    if (!studentUserId) {
      return res.status(400).json({ success: false, message: 'Student user account not found' });
    }

    if (!studentFranchiseId) {
      return res.status(400).json({ success: false, message: 'Student school not set' });
    }

    if (
      isSchoolTenantUser(req.user) &&
      toIdString(studentFranchiseId) !== toIdString(req.user.franchise)
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized for this student' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const existingEnrollment = await Enrollment.findOne({
      student: studentUserId,
      course: courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Student is already enrolled in this course'
      });
    }

    const franchiseId =
      isSchoolTenantUser(req.user)
        ? req.user.franchise?._id || req.user.franchise
        : studentFranchiseId;

    const seatCheck = await checkSeatAvailability(courseId, franchiseId);
    if (!seatCheck.available) {
      return res.status(400).json({ success: false, message: seatCheck.message });
    }

    const isFirstCourse = (student.enrolledCourses?.length || 0) === 0;

    const enrollment = await Enrollment.create({
      student: studentUserId,
      course: courseId,
      enrolledAt: new Date(),
      session: req.body.session || student.session || `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`,
      isActive: true,
      progress: 0
    });

    student.enrolledCourses.push(enrollment._id);
    if (!student.fees) student.fees = {};
    appendCourseFeesToStudent(student, course, isFirstCourse);
    await student.save();

    await createObligationsFromEnrollment(
      student._id,
      courseId,
      franchiseId,
      req.user._id
    );

    const courseFee = course.discountedFee > 0 ? course.discountedFee : course.regularFee || 0;

    if (payment) {
      if (course.registrationFee > 0 && payment.includeRegistrationFee) {
        await createEnrollmentPayment(
          student._id,
          courseId,
          franchiseId,
          {
            amount: course.registrationFee,
            paymentMethod: payment.paymentMethod || 'cash',
            paymentType: 'registration',
            paymentStatus: payment.paymentStatus || 'completed',
            description: `Registration fee for ${course.title}`
          },
          req.user._id
        );
      }

      const paidAmount = Number(payment.paidAmount) || 0;
      if (paidAmount > 0) {
        await createEnrollmentPayment(
          student._id,
          courseId,
          franchiseId,
          {
            amount: paidAmount,
            paymentMethod: payment.paymentMethod || 'cash',
            paymentType: 'course_fee',
            paymentStatus: payment.paymentStatus || 'completed',
            description: `${paidAmount < courseFee ? 'Partial' : 'Full'} payment for ${course.title}`
          },
          req.user._id
        );

        student.fees.paidAmount = (Number(student.fees?.paidAmount) || 0) + paidAmount;
        student.fees.pendingAmount = Math.max(
          0,
          (Number(student.fees?.totalFees) || 0) - student.fees.paidAmount
        );
        student.fees.lastPaymentDate = new Date();
        await student.save();
      }

      if (payment.createBalanceRecord && paidAmount < courseFee) {
        await createEnrollmentPayment(
          student._id,
          courseId,
          franchiseId,
          {
            amount: courseFee - paidAmount,
            paymentMethod: payment.paymentMethod || 'cash',
            paymentType: 'course_fee',
            paymentStatus: 'pending',
            description: `Balance due for ${course.title}`,
            dueDate: payment.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          },
          req.user._id
        );
      }
    } else if (courseFee > 0) {
      await createEnrollmentPayment(
        student._id,
        courseId,
        franchiseId,
        {
          amount: courseFee,
          paymentMethod: 'cash',
          paymentType: 'course_fee',
          paymentStatus: 'pending',
          description: `Course fee for ${course.title}`,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        req.user._id
      );
    }

    const updatedStudent = await Student.findById(student._id)
      .populate('user', 'name email mobile')
      .populate('franchise', 'name code')
      .populate({
        path: 'enrolledCourses',
        populate: {
          path: 'course',
          populate: { path: 'program', model: 'Program' }
        }
      });

    // Broadcast so seat counts, student lists and dashboards update without a refresh.
    try {
      const io = getIO();
      const payload = {
        message: `${student.user?.name || 'A student'} enrolled in ${course.title}`,
        courseId: course._id,
        studentId: studentUserId,
        franchiseId: franchiseId || null,
        timestamp: new Date()
      };
      io.emit('new-enrollment', payload);
      if (franchiseId) {
        io.to(`franchise:${franchiseId}`).emit('new-enrollment', payload);
      }
    } catch (e) { /* socket optional */ }

    res.status(201).json({
      success: true,
      message: `Student enrolled in ${course.title}`,
      data: updatedStudent
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Student is already enrolled in this course'
      });
    }
    next(error);
  }
};

// @desc    Upload student profile picture
// @route   POST /api/students/:id/photo
// @access  Private (Super Admin / School Admin / Student)
exports.uploadProfilePicture = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check permissions
    if (isSchoolTenantUser(req.user) && student.franchise.toString() !== req.user.franchise.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this student'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    if (student.personalInfo.photo && isStoredFile(student.personalInfo.photo)) {
      await deleteFile(student.personalInfo.photo);
    }

    const photoUrl = getUploadedUrl(req.file);

    // Update student with new photo
    student.personalInfo.photo = photoUrl;
    await student.save();

    // Mirror to linked User document
    try {
      await User.findByIdAndUpdate(
        student.user,
        { 
          $set: { 
            profilePicture: photoUrl
          }
        },
        { runValidators: true }
      );
    } catch (e) {
      console.error('User photo sync from student upload failed:', e);
    }

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        photo: photoUrl
      }
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    next(error);
  }
};

// @desc    Delete student profile picture
// @route   DELETE /api/students/:id/photo
// @access  Private (Super Admin / School Admin / Student)
exports.deleteProfilePicture = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check permissions
    if (isSchoolTenantUser(req.user) && student.franchise.toString() !== req.user.franchise.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this student'
      });
    }

    if (!student.personalInfo.photo || !student.personalInfo.photo.startsWith('/uploads/')) {
      return res.status(400).json({
        success: false,
        message: 'No profile picture to delete'
      });
    }

    // Delete from local storage
    const oldPhotoPath = student.personalInfo.photo.substring(1); // Remove leading '/'
    deleteFile(oldPhotoPath);

    // Remove from database
    student.personalInfo.photo = undefined;
    await student.save();

    // Mirror removal to linked User document
    try {
      await User.findByIdAndUpdate(
        student.user,
        { 
          $unset: { profilePicture: '' }
        }
      );
    } catch (e) {
      console.error('User photo delete sync failed:', e);
    }

    res.status(200).json({
      success: true,
      message: 'Profile picture deleted successfully'
    });
  } catch (error) {
    console.error('Delete profile picture error:', error);
    next(error);
  }
};

// @desc    Upload a student document
// @route   POST /api/students/:id/documents
// @access  Private (Super Admin / School Admin)
exports.uploadStudentDocument = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check permissions
    if (isSchoolTenantUser(req.user) && student.franchise.toString() !== req.user.franchise.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this student'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const { docType } = req.body;
    if (!docType || !['aadhaarCardFront', 'aadhaarCardBack', 'signature', 'lastMarksheet'].includes(docType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type specified'
      });
    }

    if (student.documents[docType]?.url && isStoredFile(student.documents[docType].url)) {
      try {
        await deleteFile(student.documents[docType].url);
      } catch (error) {
        console.error(`Error deleting old ${docType}:`, error);
      }
    }

    const docUrl = getUploadedUrl(req.file);

    // Update student with new document
    student.documents[docType] = {
      url: docUrl
    };
    await student.save();

    res.status(200).json({
      success: true,
      message: `${docType} uploaded successfully`,
      data: student.documents
    });
  } catch (error) {
    console.error('Upload document error:', error);
    next(error);
  }
};

// @desc    Get all test results for a student
// @route   GET /api/students/:id/results
// @access  Private (Super Admin / School Admin)
exports.getStudentResults = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const results = await TestResult.find({ student: student.user, testType: 'exam' })
      .populate({
        path: 'exam',
        select: 'title'
      })
      .populate({
        path: 'course',
        select: 'title'
      })
      .sort('-completedAt');

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get enrolled courses for a student
// @route   GET /api/students/:id/enrolled-courses
// @access  Private (Super Admin / School Admin)
exports.getStudentEnrolledCourses = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get enrollments for this student
    const enrollments = await Enrollment.find({ 
      student: student.user,
      isActive: true 
    })
      .populate({
        path: 'course',
        select: 'title description duration program'
      })
      .sort({ enrolledAt: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments.map(enrollment => ({
        enrollmentId: enrollment._id,
        course: enrollment.course,
        enrolledAt: enrollment.enrolledAt,
        progress: enrollment.progress,
        isActive: enrollment.isActive
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student exam access / fee eligibility by course
// @route   GET /api/students/:id/exam-access
// @access  Private (Super Admin / School Admin)
exports.getStudentExamAccess = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate({
        path: 'enrolledCourses',
        populate: { path: 'course', select: 'title courseCode' }
      });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (isSchoolTenantUser(req.user) && student.franchise?.toString() !== req.user.franchise?.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const status = await getExamAccessStatusForStudent(student);

    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Grant or revoke exam access despite pending fees
// @route   PATCH /api/students/:id/exam-access
// @access  Private (Super Admin / School Admin)
exports.updateStudentExamAccess = async (req, res, next) => {
  try {
    const { action, courseId, reason, expiresAt } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, message: 'Action is required' });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (isSchoolTenantUser(req.user) && student.franchise?.toString() !== req.user.franchise?.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!student.examAccess) {
      student.examAccess = {
        bypassAllPendingFees: false,
        courseOverrides: []
      };
    }

    if (!Array.isArray(student.examAccess.courseOverrides)) {
      student.examAccess.courseOverrides = [];
    }

    switch (action) {
      case 'grant-all':
        student.examAccess.bypassAllPendingFees = true;
        student.examAccess.bypassAllGrantedBy = req.user._id;
        student.examAccess.bypassAllGrantedAt = new Date();
        student.examAccess.bypassAllReason = reason || '';
        break;
      case 'revoke-all':
        student.examAccess.bypassAllPendingFees = false;
        student.examAccess.bypassAllGrantedBy = undefined;
        student.examAccess.bypassAllGrantedAt = undefined;
        student.examAccess.bypassAllReason = '';
        break;
      case 'grant-course':
        if (!courseId) {
          return res.status(400).json({ success: false, message: 'courseId is required' });
        }
        student.examAccess.courseOverrides = student.examAccess.courseOverrides.filter(
          (item) => String(item.course) !== String(courseId)
        );
        student.examAccess.courseOverrides.push({
          course: courseId,
          grantedBy: req.user._id,
          grantedAt: new Date(),
          reason: reason || '',
          expiresAt: expiresAt || undefined
        });
        break;
      case 'revoke-course':
        if (!courseId) {
          return res.status(400).json({ success: false, message: 'courseId is required' });
        }
        student.examAccess.courseOverrides = student.examAccess.courseOverrides.filter(
          (item) => String(item.course) !== String(courseId)
        );
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await student.save();

    const populated = await Student.findById(student._id)
      .populate({
        path: 'enrolledCourses',
        populate: { path: 'course', select: 'title courseCode' }
      });

    const status = await getExamAccessStatusForStudent(populated);

    res.status(200).json({
      success: true,
      message: 'Exam access permission updated',
      data: status
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
