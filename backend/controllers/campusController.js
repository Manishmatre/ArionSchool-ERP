const Franchise = require('../models/SchoolCampus');
const User = require('../models/User');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Payment = require('../models/Payment');
const TestResult = require('../models/TestResult');
const StudentCertificate = require('../models/StudentCertificate');
const Certificate = require('../models/Certificate');
const { sendFranchiseApprovalEmail } = require('../utils/emailService');
const { deleteFile } = require('../utils/localUploader');
const { getUploadedUrl, isStoredFile } = require('../utils/cloudinary');
const { getFranchiseStats } = require('../utils/campusStatsService');
const { getFranchiseStudentUserIds, countFranchiseFilledSeats } = require('../utils/seatUtils');
const { isSchoolTenantUser, getSchoolTenantId } = require('../utils/tenantAccess');

const buildFranchiseFinancialMetrics = async (franchiseId) => {
  const stats = await getFranchiseStats(franchiseId);
  return {
    performance: stats || {
      totalIncome: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      netRevenue: 0,
      outstandingReceivables: 0,
      outstandingReceivableCount: 0,
      certificatesIssued: 0,
      totalCertificates: 0
    }
  };
};

// @desc    Get all schools
// @route   GET /api/schools
// @access  Private (Super Admin)
exports.getAllFranchises = async (req, res, next) => {
  try {
    const query = isSchoolTenantUser(req.user) ? { _id: getSchoolTenantId(req.user) } : {};
    const franchises = await Franchise.find(query)
      .populate('admin', 'name email')
      .populate('students', 'studentId personalInfo.firstName personalInfo.lastName')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: franchises.length,
      data: franchises
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single school
// @route   GET /api/schools/:id
// @access  Private
exports.getFranchise = async (req, res, next) => {
  try {
    const franchiseDoc = await Franchise.findById(req.params.id)
      .populate('admin', 'name email mobile')
      .populate('students');

    if (!franchiseDoc) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    if (isSchoolTenantUser(req.user) && String(franchiseDoc._id) !== String(getSchoolTenantId(req.user))) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this school' });
    }

    const franchise = franchiseDoc.toObject();

    const franchiseStudents = await Student.find({ franchise: franchise._id })
      .select('studentId personalInfo status');
    franchise.students = franchiseStudents;

    const { performance } = await buildFranchiseFinancialMetrics(franchise._id);
    franchise.stats = performance;
    franchise.performance = performance;

    const planCourseCount = franchise.plan?.courseAccess?.length || 0;
    const additionalCourseCount = franchise.additionalCourses?.length || 0;
    franchise.courseCount = planCourseCount + additionalCourseCount;
    franchise.activeStudentCount = franchiseStudents.filter((s) => s.status === 'active').length;

    // Enrollments reference the student's *User* id, so resolve school
    // membership to user ids (not Student _ids) before counting filled seats.
    const franchiseStudentUserIds = await getFranchiseStudentUserIds(franchise._id);

    const attachSeatInfo = async (course) => {
      const seatAllocation = Array.isArray(course.franchiseSeats)
        ? course.franchiseSeats.find(
            (fs) => fs.franchise && fs.franchise.toString() === franchise._id.toString()
          )
        : null;
      const allocatedSeats = seatAllocation ? seatAllocation.seats : 0;
      const filledSeats = await countFranchiseFilledSeats(
        course._id,
        franchise._id,
        franchiseStudentUserIds
      );
      course.allocatedSeats = allocatedSeats;
      course.filledSeats = filledSeats;
      course.availableSeats = Math.max(0, allocatedSeats - filledSeats);
    };

    // Calculate filled seats for plan courses
    if (franchise.plan && franchise.plan.courseAccess) {
      for (const course of franchise.plan.courseAccess) {
        await attachSeatInfo(course);
      }
    }

    // Calculate filled seats for additional courses
    if (franchise.additionalCourses) {
      for (const course of franchise.additionalCourses) {
        await attachSeatInfo(course);
      }
    }

    res.status(200).json({
      success: true,
      data: franchise
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new school
// @route   POST /api/schools
// @access  Private (Super Admin)
exports.createFranchise = async (req, res, next) => {
  try {
    console.log('Creating school with data:', req.body);
    
    const { 
      name, code, email, phone, 
      address, city, state, pincode,
      adminName, adminEmail, adminPhone, adminPassword,
      establishedDate, status, plan, isMainBranch,
      aadhaarNumber, panNumber, qualification
    } = req.body;

    const fileUploads = {};
    if (req.files) {
      for (const key in req.files) {
        const file = req.files[key][0];
        // Construct the URL from the file path provided by multer
        fileUploads[key] = file.url;
      }
    }

    // Validate required fields
    if (!name || !code || !adminName || !adminEmail || !adminPassword || !adminPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if school code already exists
    const existingFranchise = await Franchise.findOne({ code });
    if (existingFranchise) {
      return res.status(400).json({
        success: false,
        message: 'School code already exists'
      });
    }

    // Check if admin email already exists
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Admin email already exists'
      });
    }

    // Create school admin user
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      mobile: adminPhone,
      username: adminEmail,
      password: adminPassword,
      role: 'franchise_admin'
    });

    console.log('Admin user created:', admin._id);

    let planActivationDate = new Date();
    let planExpiryDate = null;

    // Create school
    const franchise = await Franchise.create({
      name,
      code,
      owner: {
        name: adminName,
        email: adminEmail,
        mobile: adminPhone,
        aadhaarNumber,
        panNumber,
        qualification,
        aadhaarFileFront: fileUploads.aadhaarFileFront,
        aadhaarFileBack: fileUploads.aadhaarFileBack,
        panFile: fileUploads.panFile,
        qualificationFile: fileUploads.qualificationFile,
        centerPhoto: fileUploads.centerPhoto,
        ownerSignature: fileUploads.ownerSignature
      },
      address: {
        street: address,
        city,
        state,
        pincode,
        country: 'India'
      },
      contactInfo: {
        phone: phone, // Correctly map phone to contactInfo.phone
        email
      },
      establishedDate: establishedDate || Date.now(),
      status: status || 'active',
      isMainBranch: isMainBranch === 'true' || isMainBranch === true,
      admin: admin._id,
      plan,
      planActivationDate,
      planExpiryDate
    });

    console.log('School created:', school._id);

    // Send Welcome Email with Credentials to School Admin
    try {
      const { sendFranchiseWelcomeCredentialsEmail } = require('../utils/emailService');
      await sendFranchiseWelcomeCredentialsEmail({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        franchiseName: name,
        franchiseCode: code
      });
      console.log('School welcome email sent to:', adminEmail);
    } catch (emailError) {
      console.error('Failed to send school welcome email:', emailError);
      // Don't fail the request if email fails
    }

    // Link admin to school
    admin.franchise = franchise._id;
    await admin.save();

    console.log('Admin linked to school');

    res.status(201).json({
      success: true,
      message: 'School created successfully',
      data: franchise
    });
  } catch (error) {
    console.error('Error in createFranchise:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create franchise'
    });
  }
};

// @desc    Update school
// @route   PUT /api/schools/:id
// @access  Private (Super Admin / School Admin)
exports.updateFranchise = async (req, res, next) => {
  try {
    let franchise = await Franchise.findById(req.params.id);

    if (!franchise) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Check permissions
    if (isSchoolTenantUser(req.user) && String(franchise._id) !== String(getSchoolTenantId(req.user))) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this school'
      });
    }

    const { 
      name, code, email, phone, 
      address, city, state, pincode,
      adminName, adminEmail, adminPhone, adminPassword,
      establishedDate, status,
      aadhaarNumber, panNumber, qualification, plan, isMainBranch
    } = req.body;

    // Preserve existing values when partial updates are submitted (e.g. from in-page section edit modals)
    const existingContact = franchise.contactInfo || {};
    const existingAddress = franchise.address || {};
    const existingOwner = franchise.owner || {};
    
    const updatedData = {
      name: name !== undefined ? name : franchise.name,
      code: code !== undefined ? code : franchise.code,
      contactInfo: {
        email: email !== undefined ? email : existingContact.email,
        phone: phone !== undefined ? phone : existingContact.phone
      },
      address: {
        street: address !== undefined ? address : existingAddress.street,
        city: city !== undefined ? city : existingAddress.city,
        state: state !== undefined ? state : existingAddress.state,
        pincode: pincode !== undefined ? pincode : existingAddress.pincode,
        country: 'India'
      },
      owner: {
        name: adminName !== undefined ? adminName : existingOwner.name,
        email: adminEmail !== undefined ? adminEmail : existingOwner.email,
        mobile: adminPhone !== undefined ? adminPhone : existingOwner.mobile,
        aadhaarNumber: aadhaarNumber !== undefined ? aadhaarNumber : existingOwner.aadhaarNumber,
        panNumber: panNumber !== undefined ? panNumber : existingOwner.panNumber,
        qualification: qualification !== undefined ? qualification : existingOwner.qualification,
        // Preserve existing file URLs by default
        aadhaarFileFront: existingOwner.aadhaarFileFront,
        aadhaarFileBack: existingOwner.aadhaarFileBack,
        panFile: existingOwner.panFile,
        qualificationFile: existingOwner.qualificationFile,
        centerPhoto: existingOwner.centerPhoto,
        ownerSignature: existingOwner.ownerSignature
      },
      establishedDate: establishedDate !== undefined ? establishedDate : franchise.establishedDate,
      status: status !== undefined ? status : franchise.status,
      plan: plan !== undefined ? plan : franchise.plan,
      isMainBranch: isMainBranch !== undefined ? (isMainBranch === 'true' || isMainBranch === true) : franchise.isMainBranch
    };


    if (req.files && Object.keys(req.files).length > 0) {
      for (const key in req.files) {
        const file = req.files[key][0];
        
        if (existingOwner[key] && isStoredFile(existingOwner[key])) {
          await deleteFile(existingOwner[key]);
        }

        updatedData.owner[key] = file.url;
      }
    }

    franchise = await Franchise.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    );

    if (adminPassword) {
      const admin = await User.findById(franchise.admin);
      admin.password = adminPassword;
      await admin.save();
    }

    res.status(200).json({
      success: true,
      message: 'School updated successfully',
      data: franchise
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete school
// @route   DELETE /api/schools/:id
// @access  Private (Super Admin)
exports.deleteFranchise = async (req, res, next) => {
  try {
    const franchise = await Franchise.findById(req.params.id);

    if (!franchise) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Get all students in this school
    const franchiseStudents = await Student.find({ franchise: franchise._id });
    const franchiseStudentIds = franchiseStudents.map(s => s._id);
    const franchiseUserIds = franchiseStudents.map(s => s.user);

    // Delete all related records in proper order to avoid foreign key constraints
    
    // 1. Delete student certificates (both new and old collections)
    if (franchiseStudentIds.length > 0) {
      // Get all certificates for these students
      const studentCertificates = await StudentCertificate.find({ student: { $in: franchiseStudentIds } });
      const certificateIds = studentCertificates.map(c => c._id);
      
      if (certificateIds.length > 0) {
        await StudentCertificate.deleteMany({ _id: { $in: certificateIds } });
      }
      
      // Delete old certificates too
      await Certificate.deleteMany({ student: { $in: franchiseStudentIds } });
    }



    // 3. Delete test results
    if (franchiseStudentIds.length > 0) {
      await TestResult.deleteMany({ student: { $in: franchiseStudentIds } });
    }

    // 4. Delete enrollments
    if (franchiseUserIds.length > 0) {
      await Enrollment.deleteMany({ student: { $in: franchiseUserIds } });
    }

    // 5. Delete payments
    if (franchiseStudentIds.length > 0) {
      await Payment.deleteMany({ student: { $in: franchiseStudentIds } });
    }

    // 6. Delete all student records
    if (franchiseStudentIds.length > 0) {
      await Student.deleteMany({ _id: { $in: franchiseStudentIds } });
    }

    // 7. Delete all user records (students)
    if (franchiseUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: franchiseUserIds } });
    }

    // 8. Delete school admin user
    if (franchise.admin) {
      await User.findByIdAndDelete(franchise.admin);
    }

    // 9. Finally delete the school
    await franchise.deleteOne();

    res.status(200).json({
      success: true,
      message: 'School and all related records (students, users, enrollments, payments, certificates) deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get school performance
// @route   GET /api/schools/:id/performance
// @access  Private (Super Admin / School Admin)
exports.getFranchisePerformance = async (req, res, next) => {
  try {
    const franchise = await Franchise.findById(req.params.id)
      .populate('students')
      .populate('courses');

    if (!franchise) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    const franchiseStudents = await Student.find({ franchise: franchise._id });
    const { performance } = await buildFranchiseFinancialMetrics(franchise._id);

    const totalStudents = franchiseStudents.length;
    const activeStudents = franchiseStudents.filter((s) => s.status === 'active').length;
    const pendingFees = franchiseStudents.reduce(
      (sum, student) => sum + (student.fees?.pendingAmount || 0),
      0
    );

    const performanceData = {
      franchise: {
        name: franchise.name,
        code: franchise.code,
        status: franchise.status
      },
      metrics: {
        totalStudents,
        activeStudents,
        totalRevenue: performance.totalIncome,
        totalIncome: performance.totalIncome,
        totalExpenses: performance.totalExpenses,
        netRevenue: performance.netRevenue,
        monthlyIncome: performance.monthlyIncome,
        monthlyExpenses: performance.monthlyExpenses,
        monthlyNetRevenue: performance.monthlyNetRevenue,
        outstandingReceivables: performance.outstandingReceivables,
        outstandingReceivableCount: performance.outstandingReceivableCount,
        pendingFees,
        certificatesIssued: performance.certificatesIssued,
        totalCertificates: performance.totalCertificates,
        studentCertificates: performance.studentCertificates,
        franchiseAuthorizationCertificates: performance.franchiseAuthorizationCertificates,
        averageAttendance: calculateAverageAttendance(franchiseStudents)
      },
      ledger: performance.ledger,
      courses: (franchise.plan?.courseAccess?.length || 0) + (franchise.additionalCourses?.length || 0),
      monthlyGrowth: await calculateMonthlyGrowth(franchise._id)
    };

    res.status(200).json({
      success: true,
      data: performanceData
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to calculate average attendance
function calculateAverageAttendance(students) {
  if (students.length === 0) return 0;
  
  const totalAttendance = students.reduce((sum, student) => {
    return sum + (student.attendance.attendancePercentage || 0);
  }, 0);
  
  return (totalAttendance / students.length).toFixed(2);
}

// Helper function to calculate monthly growth
async function calculateMonthlyGrowth(franchiseId) {
  const currentMonth = new Date();
  const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  
  const currentMonthStudents = await Student.countDocuments({
    franchise: franchiseId,
    admissionDate: { $gte: currentMonth }
  });
  
  const lastMonthStudents = await Student.countDocuments({
    franchise: franchiseId,
    admissionDate: { $gte: lastMonth, $lt: currentMonth }
  });
  
  const growth = lastMonthStudents > 0 
    ? ((currentMonthStudents - lastMonthStudents) / lastMonthStudents * 100).toFixed(2)
    : 0;
  
  return {
    currentMonth: currentMonthStudents,
    lastMonth: lastMonthStudents,
    growthPercentage: growth
  };
}

// @desc    Update school status
// @route   PUT /api/schools/:id/status
// @access  Private (Super Admin)
exports.updateFranchiseStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const franchise = await Franchise.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!franchise) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'School status updated successfully',
      data: franchise
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign additional courses to a school
// @route   PUT /api/schools/:id/assign-courses
// @access  Private (Super Admin)
exports.assignCourses = async (req, res, next) => {
  try {
    const { courseIds } = req.body;

    if (!Array.isArray(courseIds)) {
      return res.status(400).json({
        success: false,
        message: 'Course IDs must be an array.'
      });
    }

    const franchise = await Franchise.findByIdAndUpdate(
      req.params.id,
      { additionalCourses: courseIds },
      { new: true, runValidators: true }
    );

    if (!franchise) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Courses assigned successfully',
      data: franchise
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;


// Aliases for School Campus nomenclature
exports.getAllCampuses = exports.getAllFranchises;
exports.getCampus = exports.getFranchise;
exports.createCampus = exports.createFranchise;
exports.updateCampus = exports.updateFranchise;
exports.deleteCampus = exports.deleteFranchise;
exports.getCampusPerformance = exports.getFranchisePerformance;
exports.updateCampusStatus = exports.updateFranchiseStatus;
