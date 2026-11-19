const mongoose = require('mongoose');
const { isSchoolTenantUser } = require('../utils/tenantAccess');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Franchise = require('../models/SchoolCampus');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const TestResult = require('../models/TestResult');
const Staff = require('../models/Staff');
const StaffAttendance = require('../models/StaffAttendance');
const StaffSalary = require('../models/StaffSalary');
const Attendance = require('../models/Attendance');
const Certificate = require('../models/Certificate');
const StudentCertificate = require('../models/StudentCertificate');
const { getFinancialStats, PAYMENT_TYPE_TO_CATEGORY, getFranchiseFinancialSummary, buildFranchiseFilter } = require('../utils/transactionService');
const { getFranchiseStats } = require('../utils/campusStatsService');
const Transaction = require('../models/Transaction');

const CATEGORY_TO_PAYMENT_TYPE = Object.fromEntries(
  Object.entries(PAYMENT_TYPE_TO_CATEGORY).map(([paymentType, category]) => [category, paymentType])
);

const buildPaidAtFilter = (startDate, endDate) => {
  if (!startDate && !endDate) return {};
  const paidAt = {};
  if (startDate) paidAt.$gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    paidAt.$lte = end;
  }
  return { paidAt };
};

const isSingleCampusRole = (role) => ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(role);

const buildFranchiseScope = (req, franchiseId) => {
  if (isSingleCampusRole(req.user?.role) && req.user?.franchise) {
    return { franchise: new mongoose.Types.ObjectId(req.user.franchise) };
  }
  if (franchiseId && mongoose.Types.ObjectId.isValid(franchiseId)) {
    return { franchise: new mongoose.Types.ObjectId(franchiseId) };
  }
  return {};
};

// @desc    Get dashboard statistics for reports page
// @route   GET /api/reports/dashboard-stats
// @access  Private (School Owner / Super Admin / Campus Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    const isFranchiseAdmin = isSingleCampusRole(req.user.role);
    const franchiseId = req.user.franchise;
    const franchiseFilter = isFranchiseAdmin ? buildFranchiseFilter(franchiseId) : {};

    const getIssuedCertificatesCount = async () => {
      if (isFranchiseAdmin) {
        const stats = await getFranchiseStats(franchiseId);
        return stats?.totalCertificates || stats?.certificatesIssued || 0;
      }

      const [legacyCount, studentCertCount] = await Promise.all([
        Certificate.countDocuments({}),
        StudentCertificate.countDocuments({})
      ]);
      return (legacyCount || 0) + (studentCertCount || 0);
    };

    // Date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // --- Quick Stats ---
    const [
      totalStudents,
      studentsThisMonth,
      totalFranchises,
      totalRevenueResult,
      monthlyRevenueResult,
      totalCertificates,
      totalEnrollments,
      totalCourses,
      pendingPayments,
      completedPayments,
    ] = await Promise.all([
      Student.countDocuments({ ...franchiseFilter, status: 'active' }),
      Student.countDocuments({ ...franchiseFilter, createdAt: { $gte: startOfMonth } }),
      isFranchiseAdmin ? Promise.resolve(1) : Franchise.countDocuments({ status: 'active' }),
      Payment.aggregate([
        { $match: { ...franchiseFilter, paymentStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { ...franchiseFilter, paymentStatus: 'completed', paymentDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      getIssuedCertificatesCount(),
      Enrollment.countDocuments({ ...franchiseFilter, isActive: true }),
      isFranchiseAdmin ? Course.countDocuments({ 'franchiseSeats.franchise': franchiseId }) : Course.countDocuments(),
      Payment.countDocuments({ ...franchiseFilter, paymentStatus: 'pending' }),
      Payment.countDocuments({ ...franchiseFilter, paymentStatus: 'completed' }),
    ]);

    // --- Recent Activities ---
    const [recentStudents, recentPayments, recentEnquiries] = await Promise.all([
      Student.find({ ...franchiseFilter }).sort({ createdAt: -1 }).limit(5),
      Payment.find({ ...franchiseFilter, paymentStatus: 'completed' }).sort({ paymentDate: -1 }).limit(5).populate({ path: 'student', select: 'personalInfo' }),
      Promise.resolve([])
    ]);

    const financialSummary = isFranchiseAdmin
      ? await getFranchiseStats(franchiseId)
      : await getFinancialStats({});

    const totalIncome = financialSummary?.totalIncome || totalRevenueResult[0]?.total || 0;
    const totalExpenses = financialSummary?.totalExpenses || 0;

    const quickStats = {
      totalStudents: totalStudents || 0,
      studentsThisMonth: studentsThisMonth || 0,
      totalFranchises: totalFranchises || 0,
      totalRevenue: totalIncome,
      monthlyRevenue: financialSummary?.monthlyIncome || monthlyRevenueResult[0]?.total || 0,
      totalExpenses,
      monthlyExpenses: financialSummary?.monthlyExpenses || 0,
      netRevenue: totalIncome - totalExpenses,
      monthlyNetRevenue: financialSummary?.monthlyNetRevenue || 0,
      outstandingReceivables: financialSummary?.outstandingReceivables || 0,
      outstandingReceivableCount: financialSummary?.outstandingReceivableCount || 0,
      totalCertificates: totalCertificates || 0,
      studentCertificates: financialSummary?.studentCertificates || 0,
      franchiseAuthorizationCertificates: financialSummary?.franchiseAuthorizationCertificates || 0,
      totalEnrollments: totalEnrollments || 0,
      totalCourses: totalCourses || 0,
      pendingPayments: pendingPayments || 0,
      completedPayments: completedPayments || 0,
      ledger: financialSummary
    };

    const recentActivities = {
      students: recentStudents,
      payments: recentPayments,
      enquiries: recentEnquiries,
    };

    res.status(200).json({
      success: true,
      data: {
        quickStats,
        recentActivities
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
};

// @desc    Get student performance report
// @route   GET /api/reports/student-performance/:studentId?
// @access  Private (Super Admin)
exports.getStudentPerformanceReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, courseId, franchiseId } = req.query;
    
    // Build query for students
    let studentQuery = {};
    
    if (studentId) {
      studentQuery._id = studentId;
    }
    
    if (franchiseId) {
      studentQuery.franchise = new mongoose.Types.ObjectId(franchiseId);
    }
    
    // Handle school admin restriction
    if (req.user && isSchoolTenantUser(req.user)) {
      studentQuery.franchise = req.user.franchise;
    }
    
    const students = await Student.find(studentQuery)
      .populate('user', 'name email')
      .populate('franchise', 'name code')
      .populate({
        path: 'enrolledCourses',
        populate: {
          path: 'course',
          model: 'Course'
        }
      });

    let performanceData = students.map(student => {
      let enrolledCourses = student.enrolledCourses || [];
      
      // Filter by course if specified
      if (courseId) {
        enrolledCourses = enrolledCourses.filter(enrollment => 
          enrollment.course && enrollment.course._id.toString() === courseId.toString()
        );
      }
      
      // Filter by date range if specified
      if (startDate || endDate) {
        enrolledCourses = enrolledCourses.filter(enrollment => {
          if (!enrollment.createdAt) return true;
          const enrollmentDate = new Date(enrollment.createdAt);
          if (startDate && enrollmentDate < new Date(startDate)) return false;
          if (endDate && enrollmentDate > new Date(endDate)) return false;
          return true;
        });
      }
      
      const completedCourses = enrolledCourses.filter(course => course.status === 'completed');
      const averageScore = completedCourses.length > 0 
        ? completedCourses.reduce((sum, course) => sum + (course.finalScore || 0), 0) / completedCourses.length 
        : 0;
      
      return {
        student,
        enrolledCourses,
        completedCourses: completedCourses.length,
        averageScore: Math.round(averageScore * 100) / 100,
        attendanceRate: student.attendance?.attendancePercentage || 0,
        grades: completedCourses.map(course => ({
          courseName: course.course?.title || 'N/A',
          score: course.finalScore || 0,
          grade: course.finalScore >= 90 ? 'A' : course.finalScore >= 80 ? 'B' : course.finalScore >= 70 ? 'C' : course.finalScore >= 60 ? 'D' : 'F'
        }))
      };
    }).filter(studentData => {
      // If courseId is specified, only include students who have enrollments in that course
      if (courseId) {
        return studentData.enrolledCourses.length > 0;
      }
      return true;
    });

    res.status(200).json({
      success: true,
      data: performanceData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate student performance report',
      error: error.message
    });
  }
};

// @desc    Get school performance report
// @route   GET /api/reports/student-attendance
// @access  Private (Super Admin)
exports.getStudentAttendanceReport = async (req, res) => {
  try {
    const { startDate, endDate, courseId, franchiseId } = req.query;

    // Build match query
    let matchQuery = {};
    
    // Handle school admin restriction
    if (req.user && isSchoolTenantUser(req.user)) {
      matchQuery.franchise = new mongoose.Types.ObjectId(req.user.franchise);
    } else if (franchiseId) {
      matchQuery.franchise = new mongoose.Types.ObjectId(franchiseId);
    }
    
    // Date range filtering
    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = new Date(startDate);
      if (endDate) matchQuery.date.$lte = new Date(endDate);
    }
    
    // Course filtering
    if (courseId) {
      matchQuery.course = new mongoose.Types.ObjectId(courseId);
    }

    const attendanceData = await Attendance.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$student",
          totalClasses: { $sum: 1 },
          presentClasses: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absentClasses: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          lateClasses: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
          leaveClasses: { $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] } },
          courses: { $addToSet: "$course" }
        },
      },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "_id",
          as: "studentInfo",
        },
      },
      { $unwind: "$studentInfo" },
      {
        $lookup: {
          from: "users",
          localField: "studentInfo.user",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $lookup: {
          from: "courses",
          localField: "courses",
          foreignField: "_id",
          as: "courseInfo",
        },
      },
      {
        $project: {
          student: {
            _id: "$studentInfo._id",
            personalInfo: "$studentInfo.personalInfo",
            user: {
              _id: "$userInfo._id",
              email: "$userInfo.email",
            },
          },
          totalClasses: 1,
          presentClasses: 1,
          absentClasses: 1,
          lateClasses: 1,
          leaveClasses: 1,
          attendanceRate: {
            $cond: { 
              if: { $gt: ["$totalClasses", 0] }, 
              then: { $multiply: [{ $divide: ["$presentClasses", "$totalClasses"] }, 100] }, 
              else: 0 
            }
          },
          courses: "$courseInfo.title"
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: attendanceData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate student attendance report",
      error: error.message,
    });
  }
};

// @desc    Get student enrollment report
// @route   GET /api/reports/student-enrollment
// @access  Private (Super Admin)
exports.getStudentEnrollmentReport = async (req, res) => {
  try {
    const { startDate, endDate, courseId, franchiseId } = req.query;

    // Build match query
    let matchQuery = {};
    
    // Date range filtering
    if (startDate || endDate) {
      matchQuery.enrolledAt = {};
      if (startDate) matchQuery.enrolledAt.$gte = new Date(startDate);
      if (endDate) matchQuery.enrolledAt.$lte = new Date(endDate);
    }
    
    // Course filtering
    if (courseId) {
      matchQuery.course = new mongoose.Types.ObjectId(courseId);
    }

    // Handle school admin restriction
    if (req.user && isSchoolTenantUser(req.user)) {
      // Get students from the school admin's franchise
      const franchiseStudents = await Student.find({ 
        franchise: req.user.franchise 
      }).select('user');
      
      const studentUserIds = franchiseStudents.map(s => s.user);
      matchQuery.student = { $in: studentUserIds };
    } else if (franchiseId) {
      // Get students from the specified school
      const franchiseStudents = await Student.find({ 
        franchise: new mongoose.Types.ObjectId(franchiseId) 
      }).select('user');
      
      const studentUserIds = franchiseStudents.map(s => s.user);
      matchQuery.student = { $in: studentUserIds };
    }

    const enrollments = await Enrollment.find(matchQuery)
      .populate({
        path: 'student',
        select: 'name email'
      })
      .populate('course', 'title');

    res.status(200).json({
      success: true,
      data: enrollments,
      count: enrollments.length
    });
  } catch (error) {
    console.error('Student Enrollment Report Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate student enrollment report',
      error: error.message
    });
  }
};

// @desc    Get student certificate report
// @route   GET /api/reports/student-certificates
// @access  Private (Super Admin)
exports.getStudentCertificateReport = async (req, res) => {
  try {
    const { startDate, endDate, courseId, franchiseId } = req.query;
    
    let matchQuery = {};
    if (startDate || endDate) {
      matchQuery.generatedDate = {};
      if (startDate) matchQuery.generatedDate.$gte = new Date(startDate);
      if (endDate) matchQuery.generatedDate.$lte = new Date(endDate);
    }
    
    if (courseId) matchQuery.course = courseId;
    if (franchiseId) matchQuery.franchise = franchiseId;
    
    const certificates = await Certificate.find(matchQuery)
      .populate({
        path: 'student',
        populate: {
          path: 'user',
          select: 'email'
        }
      })
      .populate('course', 'name')
      .populate('franchise', 'name');

    res.status(200).json({
      success: true,
      data: certificates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate certificate report',
      error: error.message
    });
  }
};

// @desc    Get course completion report
// @route   GET /api/reports/course-completion
// @access  Private (Super Admin)
exports.getCourseCompletionReport = async (req, res) => {
  try {
    const { startDate, endDate, courseId, franchiseId } = req.query;
    
    console.log('Course Completion Report Query:', { startDate, endDate, courseId, franchiseId });
    
    let matchQuery = {};
    if (startDate || endDate) {
      matchQuery.enrolledAt = {};
      if (startDate) matchQuery.enrolledAt.$gte = new Date(startDate);
      if (endDate) matchQuery.enrolledAt.$lte = new Date(endDate);
    }
    
    if (courseId) matchQuery.course = new mongoose.Types.ObjectId(courseId);
    
    // Handle school admin restriction
    if (req.user && isSchoolTenantUser(req.user)) {
      // Get students from the school admin's franchise
      const franchiseStudents = await Student.find({ 
        franchise: req.user.franchise 
      }).select('user');
      
      const studentUserIds = franchiseStudents.map(s => s.user);
      matchQuery.student = { $in: studentUserIds };
    } else if (franchiseId) {
      // Get students from the specified school
      const franchiseStudents = await Student.find({ 
        franchise: new mongoose.Types.ObjectId(franchiseId) 
      }).select('user');
      
      const studentUserIds = franchiseStudents.map(s => s.user);
      matchQuery.student = { $in: studentUserIds };
    }
    
    console.log('Match Query:', matchQuery);
    
    // First, let's get all enrollments to see what we're working with
    const allEnrollments = await Enrollment.find(matchQuery);
    console.log('Total enrollments found:', allEnrollments.length);
    
    // Group by course and count unique students
    const courseGroups = {};
    allEnrollments.forEach(enrollment => {
      const courseId = enrollment.course.toString();
      if (!courseGroups[courseId]) {
        courseGroups[courseId] = {
          enrollments: [],
          uniqueStudents: new Set()
        };
      }
      courseGroups[courseId].enrollments.push(enrollment);
      courseGroups[courseId].uniqueStudents.add(enrollment.student.toString());
    });
    
    console.log('Course groups:', Object.keys(courseGroups).length);
    
    // Convert to aggregation format
    const completionData = [];
    for (const [courseId, group] of Object.entries(courseGroups)) {
      const uniqueStudentCount = group.uniqueStudents.size;
      const completedCount = group.enrollments.filter(e => e.progress >= 100).length;
      const averageScore = group.enrollments.reduce((sum, e) => sum + e.progress, 0) / group.enrollments.length;
      
      completionData.push({
        _id: courseId,
        totalEnrolled: uniqueStudentCount,
        completed: completedCount,
        completionRate: uniqueStudentCount > 0 ? (completedCount / uniqueStudentCount) * 100 : 0,
        averageScore: Math.round(averageScore * 100) / 100
      });
    }
    
    console.log('Completion data before lookup:', completionData);
    
    // Now lookup course information
    for (const item of completionData) {
      const courseInfo = await Course.findById(item._id);
      item.course = courseInfo;
    }
    
    console.log('Final completion data:', completionData);

    res.status(200).json({
      success: true,
      data: completionData,
    });
  } catch (error) {
    console.error('Course completion report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate course completion report',
      error: error.message
    });
  }
};

// @desc    Get course revenue report
// @route   GET /api/reports/course-revenue
// @access  Private (Super Admin)
exports.getCourseRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate, courseId, franchiseId } = req.query;

    const matchQuery = {
      direction: 'inflow',
      status: 'completed',
      'references.course': { $exists: true, $ne: null },
      ...buildPaidAtFilter(startDate, endDate),
      ...buildFranchiseScope(req, franchiseId)
    };

    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      matchQuery['references.course'] = new mongoose.Types.ObjectId(courseId);
    }

    let revenueData = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$references.course',
          totalRevenue: { $sum: '$amount' },
          students: { $addToSet: '$references.student' },
          franchiseId: { $first: '$franchise' }
        }
      },
      {
        $addFields: {
          totalStudents: {
            $size: {
              $filter: { input: '$students', as: 's', cond: { $ne: ['$$s', null] } }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      { $unwind: { path: '$courseInfo', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'franchises',
          localField: 'franchiseId',
          foreignField: '_id',
          as: 'franchiseInfo'
        }
      },
      { $unwind: { path: '$franchiseInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          course: '$courseInfo',
          franchise: '$franchiseInfo',
          totalRevenue: 1,
          totalStudents: 1,
          averageRevenuePerStudent: {
            $cond: {
              if: { $gt: ['$totalStudents', 0] },
              then: { $divide: ['$totalRevenue', '$totalStudents'] },
              else: 0
            }
          }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    if (revenueData.length === 0) {
      const enrollmentMatchQuery = {};
      if (startDate || endDate) {
        enrollmentMatchQuery.enrolledAt = {};
        if (startDate) enrollmentMatchQuery.enrolledAt.$gte = new Date(startDate);
        if (endDate) enrollmentMatchQuery.enrolledAt.$lte = new Date(endDate);
      }
      if (courseId) enrollmentMatchQuery.course = new mongoose.Types.ObjectId(courseId);

      const enrollments = await Enrollment.find(enrollmentMatchQuery)
        .populate('course', 'title regularFee discountedFee registrationFee');

      const studentUserIds = [...new Set(enrollments.map((e) => e.student?.toString()).filter(Boolean))];
      const students = await Student.find({ user: { $in: studentUserIds } })
        .populate('franchise', 'name code');
      const studentFranchiseMap = new Map(students.map((s) => [s.user.toString(), s]));

      const courseGroups = {};
      enrollments.forEach((enrollment) => {
        const cid = enrollment.course?._id?.toString();
        if (!cid) return;

        const studentDoc = studentFranchiseMap.get(enrollment.student?.toString());
        const enrollmentFranchise = studentDoc?.franchise;

        if (isSchoolTenantUser(req.user)) {
          if (enrollmentFranchise?._id?.toString() !== req.user.franchise.toString()) return;
        } else if (franchiseId && enrollmentFranchise?._id?.toString() !== franchiseId) {
          return;
        }

        const course = enrollment.course;
        const fee =
          (course?.discountedFee || course?.regularFee || 0) + (course?.registrationFee || 0);

        if (!courseGroups[cid]) {
          courseGroups[cid] = {
            students: new Set(),
            totalRevenue: 0,
            course,
            franchise: enrollmentFranchise
          };
        }
        courseGroups[cid].students.add(enrollment.student?.toString());
        courseGroups[cid].totalRevenue += fee;
      });

      revenueData = Object.values(courseGroups).map((group) => {
        const totalStudents = group.students.size;
        return {
          course: group.course,
          franchise: group.franchise || { name: 'All' },
          totalRevenue: group.totalRevenue,
          totalStudents,
          averageRevenuePerStudent: totalStudents > 0 ? group.totalRevenue / totalStudents : 0
        };
      });
    } else if (!franchiseId && !isSchoolTenantUser(req.user)) {
      revenueData = revenueData.map((item) => ({
        ...item,
        franchise: item.franchise || { name: 'All' }
      }));
    }

    res.status(200).json({ success: true, data: revenueData });
  } catch (error) {
    console.error('Course revenue report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate course revenue report',
      error: error.message
    });
  }
};

// @desc    Get course popularity report
// @route   GET /api/reports/course-popularity
// @access  Private (Super Admin)
exports.getCoursePopularityReport = async (req, res) => {
  try {
    const { startDate, endDate, franchiseId } = req.query;

    const matchQuery = {};
    if (startDate) matchQuery.enrolledAt = { ...matchQuery.enrolledAt, $gte: new Date(startDate) };
    if (endDate) matchQuery.enrolledAt = { ...matchQuery.enrolledAt, $lte: new Date(endDate) };
    
    // Handle school admin restriction
    if (req.user && isSchoolTenantUser(req.user)) {
      matchQuery.franchise = new mongoose.Types.ObjectId(req.user.franchise);
    } else if (franchiseId) {
      matchQuery.franchise = new mongoose.Types.ObjectId(franchiseId);
    }

    // Get all enrollments and group by course
    const popularityData = await Enrollment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$course",
          totalEnrollments: { $sum: 1 },
          uniqueStudents: { $addToSet: "$student" },
          activeStudents: {
            $sum: {
              $cond: [{ $gte: ["$progress", 50] }, 1, 0]
            }
          },
          completedStudents: {
            $sum: {
              $cond: [{ $gte: ["$progress", 100] }, 1, 0]
            }
          },
          averageProgress: { $avg: "$progress" },
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "courseInfo",
        },
      },
      { $unwind: "$courseInfo" },
      {
        $project: {
          course: "$courseInfo",
          totalEnrollments: 1,
          totalStudents: { $size: "$uniqueStudents" },
          activeStudents: 1,
          completionRate: {
            $cond: [
              { $gt: [{ $size: "$uniqueStudents" }, 0] },
              { $multiply: [{ $divide: ["$completedStudents", { $size: "$uniqueStudents" }] }, 100] },
              0
            ]
          },
          averageProgress: 1,
          popularityScore: { $multiply: ["$totalEnrollments", 10] }, // Example score calculation
          category: "$courseInfo.category",
        },
      },
      { $sort: { popularityScore: -1 } },
    ]);

    // Apply school filtering if specified
    let filteredData = popularityData;
    if (franchiseId) {
      filteredData = popularityData.filter(item => {
        if (item.course.franchiseSeats && item.course.franchiseSeats.length > 0) {
          return item.course.franchiseSeats.some(seat => 
            seat.franchise.toString() === franchiseId
          );
        }
        return false;
      });
    }

    res.status(200).json({
      success: true,
      data: filteredData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate course popularity report",
      error: error.message,
    });
  }
};

// @desc    Get revenue report
// @route   GET /api/reports/revenue
// @access  Private (Super Admin)
exports.getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate, source, franchiseId } = req.query;

    const matchQuery = {
      direction: 'inflow',
      status: 'completed',
      ...buildPaidAtFilter(startDate, endDate),
      ...buildFranchiseScope(req, franchiseId)
    };

    if (source && PAYMENT_TYPE_TO_CATEGORY[source]) {
      matchQuery.category = PAYMENT_TYPE_TO_CATEGORY[source];
    }

    const revenueData = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            month: {
              $dateToString: {
                format: '%Y-%m',
                date: { $ifNull: ['$paidAt', '$createdAt'] }
              }
            },
            category: '$category'
          },
          totalRevenue: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          month: '$_id.month',
          category: '$_id.category',
          totalRevenue: 1,
          transactionCount: 1
        }
      },
      { $sort: { month: 1, category: 1 } }
    ]);

    const mapped = revenueData.map((row) => ({
      month: row.month,
      source: CATEGORY_TO_PAYMENT_TYPE[row.category] || row.category,
      totalRevenue: row.totalRevenue,
      transactionCount: row.transactionCount
    }));

    res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate revenue report',
      error: error.message
    });
  }
};

// @desc    Get payment report
// @route   GET /api/reports/payments
// @access  Private (Super Admin)
exports.getPaymentReport = async (req, res) => {
  try {
    const { startDate, endDate, paymentStatus, method, franchiseId } = req.query;

    let matchQuery = {};
    if (startDate) {
      matchQuery.paymentDate = { ...matchQuery.paymentDate, $gte: new Date(startDate) };
    }
    if (endDate) {
      matchQuery.paymentDate = { ...matchQuery.paymentDate, $lte: new Date(endDate) };
    }
    if (paymentStatus) {
      matchQuery.paymentStatus = paymentStatus;
    }
    if (method) {
      matchQuery.paymentMethod = method;
    }
    
    // Handle school admin restriction
    if (req.user && isSchoolTenantUser(req.user)) {
      matchQuery.franchise = req.user.franchise;
    } else if (franchiseId) {
      matchQuery.franchise = franchiseId;
    }

    const payments = await Payment.find(matchQuery)
      .populate({
        path: 'student',
        select: 'personalInfo user',
        populate: {
          path: 'user',
          select: 'email'
        }
      })
      .populate({ path: 'course', select: 'title' })
      .populate({ path: 'franchise', select: 'name' });

    res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment report',
      error: error.message,
    });
  }
};

// @desc    Get outstanding payments report
// @route   GET /api/reports/outstanding-payments
// @access  Private (Super Admin)
exports.getOutstandingPaymentsReport = async (req, res) => {
  try {
    const { franchiseId, courseId, daysOverdue = 30 } = req.query;
    
    let matchQuery = { 
      status: { $in: ['pending'] },
      dueDate: { $lt: new Date() }
    };
    
    if (daysOverdue) {
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - parseInt(daysOverdue));
      matchQuery.dueDate.$lt = overdueDate;
    }
    
    // Handle school admin restriction
    if (req.user && isSchoolTenantUser(req.user)) {
      matchQuery.franchise = req.user.franchise;
    } else if (franchiseId) {
      matchQuery.franchise = franchiseId;
    }
    
    if (courseId) matchQuery.course = courseId;
    
    const outstandingPayments = await Payment.find(matchQuery)
      .populate('student', 'personalInfo.firstName personalInfo.lastName')
      .populate('course', 'name');

    res.status(200).json({
      success: true,
      data: outstandingPayments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate outstanding payments report',
      error: error.message
    });
  }
};

// @desc    Get school performance report
// @route   GET /api/reports/school-performance
// @access  Private (Super Admin)
exports.getFranchisePerformanceReport = async (req, res) => {
  try {
    const { startDate, endDate, franchiseId } = req.query;
    const paidAtFilter = buildPaidAtFilter(startDate, endDate).paidAt;

    let franchiseMatch = {};
    if (isSchoolTenantUser(req.user)) {
      franchiseMatch._id = new mongoose.Types.ObjectId(req.user.franchise);
    } else if (franchiseId && mongoose.Types.ObjectId.isValid(franchiseId)) {
      franchiseMatch._id = new mongoose.Types.ObjectId(franchiseId);
    }

    const txDateMatch = paidAtFilter ? { paidAt: paidAtFilter } : {};

    const performanceData = await Franchise.aggregate([
      { $match: franchiseMatch },
      {
        $lookup: {
          from: 'users',
          localField: 'admin',
          foreignField: '_id',
          as: 'adminUser'
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: 'franchise',
          as: 'students'
        }
      },
      {
        $lookup: {
          from: 'transactions',
          let: { franchiseId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$franchise', '$$franchiseId'] },
                direction: 'inflow',
                status: 'completed',
                ...txDateMatch
              }
            }
          ],
          as: 'inflowTransactions'
        }
      },
      {
        $lookup: {
          from: 'transactions',
          let: { franchiseId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$franchise', '$$franchiseId'] },
                direction: 'outflow',
                status: 'completed',
                ...txDateMatch
              }
            }
          ],
          as: 'outflowTransactions'
        }
      },
      {
        $lookup: {
          from: 'enrollments',
          let: { franchiseId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$franchise', '$$franchiseId'] },
                ...(startDate || endDate
                  ? {
                      createdAt: {
                        ...(startDate ? { $gte: new Date(startDate) } : {}),
                        ...(endDate ? { $lte: new Date(endDate) } : {})
                      }
                    }
                  : {})
              }
            }
          ],
          as: 'enrollments'
        }
      },
      {
        $lookup: {
          from: 'courses',
          let: { franchiseId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$franchiseSeats.franchise', '$$franchiseId'] }
              }
            }
          ],
          as: 'courses'
        }
      },
      {
        $project: {
          name: 1,
          code: 1,
          email: { $arrayElemAt: ['$adminUser.email', 0] },
          ownerEmail: '$owner.email',
          contactEmail: '$contactInfo.email',
          status: 1,
          totalStudents: { $size: '$students' },
          totalRevenue: {
            $reduce: {
              input: '$inflowTransactions',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.amount'] }
            }
          },
          totalExpenses: {
            $reduce: {
              input: '$outflowTransactions',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.amount'] }
            }
          },
          totalEnrollments: { $size: '$enrollments' },
          totalCourses: {
            $add: [
              { $size: { $ifNull: ['$courses', []] } },
              { $size: { $ifNull: ['$additionalCourses', []] } }
            ]
          },
          coursesFromSeats: { $size: { $ifNull: ['$courses', []] } },
          averageRevenuePerStudent: {
            $cond: {
              if: { $gt: [{ $size: '$students' }, 0] },
              then: {
                $divide: [
                  {
                    $reduce: {
                      input: '$inflowTransactions',
                      initialValue: 0,
                      in: { $add: ['$$value', '$$this.amount'] }
                    }
                  },
                  { $size: '$students' }
                ]
              },
              else: 0
            }
          }
        }
      },
      {
        $addFields: {
          netRevenue: { $subtract: ['$totalRevenue', '$totalExpenses'] }
        }
      }
    ]);

    res.status(200).json({ success: true, data: performanceData });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate school performance report',
      error: error.message
    });
  }
};

// @desc    Get school compliance report
// @route   GET /api/reports/school-compliance
// @access  Private (Super Admin)
exports.getFranchiseComplianceReport = async (req, res) => {
  try {
    const { franchiseId, startDate, endDate, complianceStatus } = req.query;
    const query = {};

    if (franchiseId) {
      if (!mongoose.Types.ObjectId.isValid(franchiseId)) {
        return res.status(400).json({ success: false, message: 'Invalid school ID.' });
      }
      query._id = franchiseId;
    }
    if (['active', 'inactive', 'suspended'].includes(complianceStatus)) {
      query.status = complianceStatus;
    }
    if (startDate || endDate) {
      query.establishedDate = {};
      if (startDate) query.establishedDate.$gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.establishedDate.$lte = endOfDay;
      }
    }

    const franchises = await Franchise.find(query)
      .select('name code owner address contactInfo status plan establishedDate students courses additionalCourses')
      .populate('plan', 'name')
      .sort('name')
      .lean();

    // This application does not store audit, insurance, or license records on
    // the School model. Report profile readiness from fields it does store;
    // do not label missing compliance modules as failed or silently score them 0.
    const complianceData = franchises.map((franchise) => {
      const requiredProfile = [
        franchise.name,
        franchise.code,
        franchise.owner?.name,
        franchise.owner?.email,
        franchise.owner?.mobile,
        franchise.address?.street,
        franchise.address?.city,
        franchise.address?.state,
        franchise.address?.pincode,
        franchise.contactInfo?.phone,
      ];
      const missingProfileFields = [
        ['Franchise name', franchise.name],
        ['Franchise code', franchise.code],
        ['Owner name', franchise.owner?.name],
        ['Owner email', franchise.owner?.email],
        ['Owner mobile', franchise.owner?.mobile],
        ['Street address', franchise.address?.street],
        ['City', franchise.address?.city],
        ['State', franchise.address?.state],
        ['PIN code', franchise.address?.pincode],
        ['Center phone', franchise.contactInfo?.phone],
      ].filter(([, value]) => !String(value || '').trim()).map(([label]) => label);
      const completedCount = requiredProfile.length - missingProfileFields.length;

      return {
        _id: franchise._id,
        name: franchise.name || '',
        code: franchise.code || '',
        location: [
          franchise.address?.street,
          franchise.address?.city,
          franchise.address?.state,
          franchise.address?.pincode,
        ].filter(Boolean).join(', '),
        ownerName: franchise.owner?.name || '',
        ownerEmail: franchise.owner?.email || '',
        ownerMobile: franchise.owner?.mobile || '',
        status: franchise.status || 'unknown',
        planName: franchise.plan?.name || '',
        establishedDate: franchise.establishedDate || null,
        studentCount: franchise.students?.length || 0,
        courseCount: new Set([...(franchise.courses || []), ...(franchise.additionalCourses || [])].map(String)).size,
        profileReadiness: Math.round((completedCount / requiredProfile.length) * 100),
        missingProfileFields,
      };
    });

    res.status(200).json({
      success: true,
      data: complianceData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate compliance report',
      error: error.message
    });
  }
};

// @desc    Get staff performance report
// @route   GET /api/reports/staff-performance
// @access  Private (Super Admin)
exports.getStaffPerformanceReport = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    
    let matchQuery = {};
    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = new Date(startDate);
      if (endDate) matchQuery.date.$lte = new Date(endDate);
    }
    if (department) matchQuery.department = department;
    
    const performanceData = await Staff.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "staffattendances",
          localField: "_id",
          foreignField: "staff",
          as: "attendances",
        },
      },
      {
        $project: {
          name: 1,
          department: 1,
          performanceScore: { $ifNull: ["$performanceScore", 0] }, // Ensure this field exists
          classesTaught: { $ifNull: ["$classesTaught", 0] },
          studentSatisfaction: { $ifNull: ["$studentSatisfaction", 0] },
          attendanceRate: {
            $cond: { if: { $gt: [{ $size: "$attendances" }, 0] }, then: { $multiply: [{ $divide: [{ $size: { $filter: { input: "$attendances", as: "att", cond: { $eq: ["$$att.status", "present"] } } } }, { $size: "$attendances" }] }, 100] }, else: 0 },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: performanceData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate staff performance report',
      error: error.message
    });
  }
};

// @desc    Get staff attendance report
// @route   GET /api/reports/staff-attendance
// @access  Private (Super Admin)
exports.getStaffAttendanceReport = async (req, res) => {
  try {
    const { startDate, endDate, department, staffId, franchiseId } = req.query;
    
    let matchQuery = {};
    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = new Date(startDate);
      if (endDate) matchQuery.date.$lte = new Date(endDate);
    }
    if (staffId) matchQuery.staff = new mongoose.Types.ObjectId(staffId);
    if (franchiseId) matchQuery.franchise = new mongoose.Types.ObjectId(franchiseId);
    
    const attendanceData = await StaffAttendance.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "staff",
          localField: "staff",
          foreignField: "_id",
          as: "staffInfo"
        }
      },
      {
        $lookup: {
          from: "franchises",
          localField: "franchise",
          foreignField: "_id",
          as: "franchiseInfo"
        }
      },
      {
        $match: {
          ...(department ? { "staffInfo.employmentDetails.department": department } : {})
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          leave: { $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] } },
          halfDay: { $sum: { $cond: [{ $eq: ["$status", "half-day"] }, 1, 0] } },
          uniqueStaff: { $addToSet: "$staff" },
          totalRecords: { $sum: 1 }
        }
      },
      {
        $project: {
          date: "$_id",
          present: 1,
          absent: 1,
          leave: 1,
          halfDay: 1,
          totalStaff: { $size: "$uniqueStaff" },
          attendanceRate: {
            $cond: { 
              if: { $gt: [{ $size: "$uniqueStaff" }, 0] }, 
              then: { $multiply: [{ $divide: ["$present", { $size: "$uniqueStaff" }] }, 100] }, 
              else: 0 
            }
          }
        }
      },
      { $sort: { date: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: attendanceData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate staff attendance report',
      error: error.message
    });
  }
};

// @desc    Get payroll report
// @route   GET /api/reports/payroll
// @access  Private (Super Admin)
exports.getPayrollReport = async (req, res) => {
  try {
    const { startDate, endDate, department, franchiseId, paymentStatus } = req.query;

    console.log('Payroll Report Query Params:', { startDate, endDate, department, franchiseId, paymentStatus });

    // Build match query step by step
    const matchQuery = {};
    if (startDate) {
      matchQuery.paymentDate = {};
      matchQuery.paymentDate.$gte = new Date(startDate);
    }
    if (endDate) {
      if (!matchQuery.paymentDate) matchQuery.paymentDate = {};
      matchQuery.paymentDate.$lte = new Date(endDate);
    }
    if (paymentStatus) {
      matchQuery.status = paymentStatus;
    }

    console.log('Initial Match Query:', JSON.stringify(matchQuery, null, 2));

    // First, get all staff salaries with basic filtering
    const payrollData = await StaffSalary.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "staff",
          localField: "staff",
          foreignField: "_id",
          as: "staffInfo",
        },
      },
      { $unwind: "$staffInfo" },
      {
        $lookup: {
          from: "users",
          localField: "staffInfo.user",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $lookup: {
          from: "franchises",
          localField: "staffInfo.franchise",
          foreignField: "_id",
          as: "franchiseInfo",
        },
      },
      { $unwind: { path: "$franchiseInfo", preserveNullAndEmptyArrays: true } }
    ]);

    console.log('After lookups, before department filter:', payrollData.length, 'records');

    // Apply department and school filters after lookups
    let filteredData = payrollData;
    if (department || franchiseId) {
      filteredData = payrollData.filter(record => {
        let matches = true;
        
        if (department && record.staff?.employmentDetails?.department !== department) {
          matches = false;
        }
        
        if (franchiseId && record.staff?.franchise?._id?.toString() !== franchiseId) {
          matches = false;
        }
        
        return matches;
      });
      
      console.log('After filtering:', filteredData.length, 'records');
    }

    // Project the final data
    const projectedData = filteredData.map(record => ({
      payrollId: record._id,
      staff: {
        _id: record.staffInfo?._id,
        personalInfo: record.staffInfo?.personalInfo,
        user: {
          _id: record.userInfo?._id,
          email: record.userInfo?.email,
        },
      },
      department: record.staffInfo?.employmentDetails?.department || 'N/A',
      franchise: { name: record.franchiseInfo?.name || 'N/A' },
      baseSalary: record.basicSalary || 0,
      overtimePay: 0,
      bonuses: record.allowances?.other || 0,
      deductions: record.totalDeductions || 0,
      netSalary: record.netSalary || 0,
      payPeriod: record.year && record.month ? `${record.year}-${record.month}` : 'N/A',
      paymentDate: record.paymentDate,
      status: record.status || 'pending',
    }));

    console.log('Final projected data:', projectedData.length, 'records');

    res.status(200).json({
      success: true,
      data: projectedData,
    });
  } catch (error) {
    console.error('Payroll Report Error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to generate payroll report",
      error: error.message,
    });
  }
};

