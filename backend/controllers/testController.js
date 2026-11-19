const TestResult = require('../models/TestResult');
const { isSchoolTenantUser } = require('../utils/tenantAccess');
const Progress = require('../models/Progress');
const MCQ = require('../models/MCQ');
const Topic = require('../models/Topic');
const User = require('../models/User');
const Chapter = require('../models/Chapter');
const Course = require('../models/Course');
const Certificate = require('../models/Certificate');
const Student = require('../models/Student');

// @desc    Submit test
// @route   POST /api/tests/submit
// @access  Private/Student
exports.submitTest = async (req, res) => {
  try {
    const { testType, chapter, topic, course: submittedCourse, answers, totalTimeTaken } = req.body;

    if (!testType || !answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test submission data'
      });
    }

    // Validate test type parameters
    if (testType === 'topic' && !topic) {
      return res.status(400).json({
        success: false,
        message: 'Topic ID is required for topic test'
      });
    }

    if (testType === 'chapter' && !chapter) {
      return res.status(400).json({
        success: false,
        message: 'Chapter ID is required for chapter test'
      });
    }

    // Get all MCQ IDs from answers
    const mcqIds = answers.map(a => a.question);
    const mcqs = await MCQ.find({ _id: { $in: mcqIds } });

    if (mcqs.length !== answers.length) {
      return res.status(400).json({
        success: false,
        message: 'Some questions not found'
      });
    }

    // Evaluate answers
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let totalScore = 0;

    const evaluatedAnswers = answers.map(answer => {
      const mcq = mcqs.find(m => m._id.toString() === answer.question);
      const correctOptionIndex = mcq.options.findIndex(opt => opt.isCorrect);
      const isCorrect = correctOptionIndex === answer.selectedOption;

      if (isCorrect) {
        correctAnswers++;
        totalScore += mcq.marks;
      } else {
        wrongAnswers++;
      }

      return {
        question: answer.question,
        selectedOption: answer.selectedOption,
        isCorrect,
        timeTaken: answer.timeTaken || 0
      };
    });

    const totalQuestions = answers.length;
    const maxScore = mcqs.reduce((sum, mcq) => sum + mcq.marks, 0);
    const percentage = Math.round((totalScore / maxScore) * 100);

    // Determine course for certificate generation & test tracking
    let courseId = submittedCourse || null;
    let courseTitle = null;
    try {
      if (courseId) {
        const cDoc = await Course.findById(courseId);
        if (cDoc) courseTitle = cDoc.title;
      }
      if (!courseId) {
        if (testType === 'topic' && topic) {
          const topicDoc = await Topic.findById(topic).populate({ path: 'chapter', populate: { path: 'course' } });
          if (topicDoc?.chapter?.course) {
            courseId = topicDoc.chapter.course._id || topicDoc.chapter.course;
            courseTitle = topicDoc.chapter.course.title;
          }
        } else if (testType === 'chapter' && chapter) {
          const chapterDoc = await Chapter.findById(chapter).populate('course');
          if (chapterDoc?.course) {
            courseId = chapterDoc.course._id || chapterDoc.course;
            courseTitle = chapterDoc.course.title;
          }
        } else if (testType === 'full') {
          if (mcqs[0]?.course) {
            const course = await Course.findById(mcqs[0].course);
            if (course) {
              courseId = course._id;
              courseTitle = course.title;
            }
          }
        }
      }
    } catch (e) {
      // ignore course resolution errors
    }

    // Create test result
    const testResult = await TestResult.create({
      student: req.user.id,
      testType,
      course: courseId || null,
      chapter: chapter || null,
      topic: topic || null,
      answers: evaluatedAnswers,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      score: totalScore,
      percentage,
      totalTimeTaken: totalTimeTaken || 0
    });

    // Auto-generate certificate if passed
    const passThreshold = parseInt(process.env.EXAM_PASS_PERCENTAGE || '60', 10);
    let certificateId = null;
    try {
      if (percentage >= passThreshold && courseId) {
        const student = await Student.findOne({ user: req.user.id }).populate('franchise');
        if (student) {
          const existing = await Certificate.findOne({
            student: student._id,
            course: courseId,
            status: 'active',
            certificateType: 'exam_pass'
          });

          if (!existing) {
            const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B+' : 'Pass';
            const certificate = await Certificate.create({
              student: student._id,
              course: courseId,
              franchise: student.franchise,
              studentName: student.fullName || `${student.personalInfo?.firstName || ''} ${student.personalInfo?.lastName || ''}`.trim(),
              courseName: courseTitle || '',
              grade,
              percentage,
              certificateType: 'exam_pass',
              issuedBy: req.user.id,
              issueDate: new Date()
            });

            // Note: PDF generation removed - certificates now generated through new template system
            
            await Student.updateOne({ _id: student._id }, { $addToSet: { certificates: certificate._id } });
            testResult.certificate = certificate._id;
            await testResult.save();
            certificateId = certificate._id;
          } else {
            testResult.certificate = existing._id;
            await testResult.save();
            certificateId = existing._id;
          }
        }
      }
    } catch (_) {}

    // Update progress if topic test
    if (testType === 'topic' && topic) {
      const topicData = await Topic.findById(topic).populate('chapter');
      
      // Get chapter with course
      const Chapter = require('../models/Chapter');
      const chapterData = await Chapter.findById(topicData.chapter).populate('course');
      
      let progress = await Progress.findOne({
        student: req.user.id,
        topic: topic
      });

      if (!progress) {
        progress = await Progress.create({
          student: req.user.id,
          course: chapterData.course._id || chapterData.course,
          chapter: topicData.chapter,
          topic: topic,
          quizCompleted: true,
          quizScore: percentage,
          quizAttempts: 1
        });
      } else {
        progress.quizCompleted = true;
        progress.quizScore = Math.max(progress.quizScore, percentage);
        progress.quizAttempts += 1;
        progress.lastAccessed = Date.now();
        await progress.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Test submitted successfully',
      result: {
        id: testResult._id,
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        score: totalScore,
        maxScore,
        percentage,
        totalTimeTaken,
        certificateId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get my test results
// @route   GET /api/tests/my-results
// @access  Private/Student
exports.getMyResults = async (req, res) => {
  try {
    const { testType, chapter, topic } = req.query;
    let query = { student: req.user.id };

    if (testType) query.testType = testType;
    if (chapter) query.chapter = chapter;
    if (topic) query.topic = topic;

    const results = await TestResult.find(query)
      .populate('course', 'title')
      .populate('chapter', 'title')
      .populate('topic', 'title')
      .populate('certificate')
      .sort('-completedAt');

    res.status(200).json({
      success: true,
      count: results.length,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single test result with detailed answers
// @route   GET /api/tests/results/:id
// @access  Private
exports.getTestResult = async (req, res) => {
  try {
    const result = await TestResult.findById(req.params.id)
      .populate('student', 'name email')
      .populate('chapter', 'title')
      .populate('topic', 'title')
      .populate('exam', 'title passPercentage')
      .populate('course', 'title')
      .populate('studentCertificate', 'certificateNumber fileUrl issueDate')
      .populate('marksheet', 'issueDate grade percentage fileUrl')
      .populate('certificate')
      .populate({
        path: 'answers.question',
        select: 'question options explanation difficulty marks'
      });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Test result not found'
      });
    }

    // Check authorization
    const isAdmin = ['super_admin', 'franchise_admin'].includes(req.user.role);
    if (!isAdmin && result.student._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this result'
      });
    }

    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all test results (Admin)
// @route   GET /api/tests/all-results
// @access  Private/Admin
exports.getAllResults = async (req, res) => {
  try {
    const { studentId, testType, chapter, topic } = req.query;
    let query = {};

    if (studentId) query.student = studentId;
    if (testType) query.testType = testType;
    if (chapter) query.chapter = chapter;
    if (topic) query.topic = topic;

    const results = await TestResult.find(query)
      .populate('student', 'name email mobile')
      .populate('chapter', 'title')
      .populate('topic', 'title')
      .sort('-completedAt');

    res.status(200).json({
      success: true,
      count: results.length,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Generate student report
// @route   GET /api/tests/report/:studentId
// @access  Private/Admin
exports.generateStudentReport = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId).populate('user');

    if (isSchoolTenantUser(req.user) && student.franchise.toString() !== req.user.franchise.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this report'
      });
    }
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get all test results
    const testResults = await TestResult.find({ student: studentId })
      .populate('chapter', 'title')
      .populate('topic', 'title')
      .sort('-completedAt');

    // Get progress summary
    const progress = await Progress.find({ student: studentId })
      .populate('chapter', 'title')
      .populate('topic', 'title');

    // Calculate statistics
    const totalTests = testResults.length;
    const averageScore = totalTests > 0
      ? testResults.reduce((sum, r) => sum + r.percentage, 0) / totalTests
      : 0;

    const testsByType = {
      topic: testResults.filter(r => r.testType === 'topic').length,
      chapter: testResults.filter(r => r.testType === 'chapter').length,
      full: testResults.filter(r => r.testType === 'full').length
    };

    const completedTopics = progress.filter(p => p.videoWatched && p.quizCompleted).length;
    const totalTopics = await Topic.countDocuments({ isActive: true });
    const overallProgress = totalTopics > 0 
      ? Math.round((completedTopics / totalTopics) * 100) 
      : 0;

    res.status(200).json({
      success: true,
      report: {
        student: {
          id: student._id,
          name: student.user.name,
          email: student.user.email,
          mobile: student.user.mobile
        },
        statistics: {
          totalTests,
          averageScore: Math.round(averageScore),
          testsByType,
          overallProgress,
          completedTopics,
          totalTopics
        },
        recentTests: testResults.slice(0, 10),
        progressDetails: progress
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
