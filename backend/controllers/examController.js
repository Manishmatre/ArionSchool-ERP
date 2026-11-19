const Exam = require('../models/Exam');
const { isSchoolTenantUser } = require('../utils/tenantAccess');
const MCQ = require('../models/MCQ');
const TestResult = require('../models/TestResult');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const Chapter = require('../models/Chapter');
const Topic = require('../models/Topic');
const ExamAttempt = require('../models/ExamAttempt');

const fisherYatesShuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const StudentCertificate = require('../models/StudentCertificate');
const StudentCertificateTemplate = require('../models/StudentCertificateTemplate');
const { getMarksheetNumberForStudent } = require('../utils/marksheetNumber');
const { getOrGenerateExamCertificate } = require('../utils/examCertificate');
const CompanyInformation = require('../models/CompanyInformation');
const studentCertificateController = require('./studentCertificateController');
const { createExamResultNotifications } = require('../utils/examNotifications');
const { checkExamFeeEligibility } = require('../utils/examAccess');
const { uploadGeneratedImage, queueGeneratedImageUpload } = require('../utils/cloudinary');
const isServerPdfDisabled = process.env.DISABLE_SERVER_PDF === 'true';

// Helper: Robustly parse date/time string respecting Indian Standard Time (+05:30)
// when no explicit timezone offset is provided (e.g. from HTML datetime-local inputs)
const parseExamTimestamp = (dateVal) => {
  if (!dateVal) return NaN;
  if (typeof dateVal === 'number') return dateVal;
  if (dateVal instanceof Date) return dateVal.getTime();
  const str = String(dateVal).trim();
  if (!str) return NaN;
  if (!str.includes('Z') && !str.match(/[+-]\d\d:?\d\d$/)) {
    const parsedIst = new Date(`${str}+05:30`).getTime();
    if (!isNaN(parsedIst)) return parsedIst;
  }
  return new Date(str).getTime();
};

// Helper: update exam status based on current time
const updateExamStatus = (exam) => {
  // Draft exams must remain explicitly unpublished regardless of schedule timestamps
  if (exam.status === 'draft' || exam.status === 'cancelled') {
    return;
  }

  const now = Date.now();
  const startTime = parseExamTimestamp(exam.startTime);
  if (isNaN(startTime)) return;

  const durationMinutes = Number(exam.duration) || 60;
  const calculatedEndTime = exam.endTime
    ? parseExamTimestamp(exam.endTime)
    : startTime + durationMinutes * 60000;

  if (now > calculatedEndTime) {
    exam.status = 'completed';
  } else if (now >= startTime && now <= calculatedEndTime) {
    if (exam.status !== 'completed') {
      exam.status = 'active';
    }
  } else if (now < startTime) {
    exam.status = 'scheduled';
  }
};

// @desc    Create a new exam
// @route   POST /api/exams
// @access  Private (Super Admin / School Admin)
exports.createExam = async (req, res, next) => {
  try {
    const {
      title,
      description,
      course,
      questions,
      masterQuestions,
      startTime,
      endTime,
      duration, // e.g., 60
      durationType, // 'minutes' or 'hours'
      passPercentage,
      maxAttempts,
      negativeMarking,
      negativeMarksPerQuestion,
      instructions,
      generationConfig,
      blueprint,
      status,
      franchise,
      isFinalExam
    } = req.body;

    const rawQuestions = Array.isArray(questions) && questions.length > 0
      ? questions
      : Array.isArray(masterQuestions) && masterQuestions.length > 0
      ? masterQuestions
      : [];

    if (!title || !course || !startTime || !duration || rawQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'title, course, startTime, duration and at least one question are required'
      });
    }

    // Sanitize question IDs into unique string IDs
    const sanitizedQuestions = [...new Set(
      rawQuestions.map((q) => (typeof q === 'object' && q !== null ? q._id || q.id : q)).filter(Boolean)
    )];

    if (sanitizedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid question is required'
      });
    }

    // Calculate duration in minutes
    let durationInMinutes = parseInt(duration, 10);
    if (durationType === 'hours') {
      durationInMinutes *= 60;
    }

    // Validate course
    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Validate MCQs exist in database
    const mcqCount = await MCQ.countDocuments({ _id: { $in: sanitizedQuestions } });
    if (mcqCount !== sanitizedQuestions.length) {
      return res.status(400).json({
        success: false,
        message: 'Some questions selected are no longer valid or found in Question Bank'
      });
    }

    // Determine school context
    let franchiseId = null;
    if (isSchoolTenantUser(req.user)) {
      franchiseId = req.user.franchise;
    } else if (franchise) {
      franchiseId = franchise;
    }

    // Time-based initial status check:
    // If startTime is in the future, it CANNOT be active yet; it MUST be scheduled or draft!
    const startTimestamp = parseExamTimestamp(startTime);
    const normalizedStartTime = !isNaN(startTimestamp) ? new Date(startTimestamp).toISOString() : startTime;
    const endTimestamp = endTime ? parseExamTimestamp(endTime) : NaN;
    const normalizedEndTime = !isNaN(endTimestamp) ? new Date(endTimestamp).toISOString() : (endTime || undefined);

    let computedStatus = status || 'scheduled';
    if (computedStatus === 'draft') {
      // Retain draft if explicitly chosen
    } else if (!isNaN(startTimestamp) && Date.now() < startTimestamp) {
      computedStatus = 'scheduled';
    } else if (!isNaN(startTimestamp) && Date.now() >= startTimestamp) {
      computedStatus = 'active';
    }

    const exam = new Exam({
      title: title.trim(),
      description: description ? description.trim() : '',
      course,
      franchise: franchiseId,
      questions: sanitizedQuestions,
      masterQuestions: sanitizedQuestions,
      startTime: normalizedStartTime,
      endTime: normalizedEndTime,
      duration: durationInMinutes,
      passPercentage: Number(passPercentage) || 60,
      maxAttempts: Number(maxAttempts) || 1,
      negativeMarking: Boolean(negativeMarking),
      negativeMarksPerQuestion: negativeMarking ? (Number(negativeMarksPerQuestion) || 0) : 0,
      instructions: instructions || '',
      isFinalExam: Boolean(isFinalExam),
      generationConfig: generationConfig || (blueprint ? {
        mode: req.body.mode || 'automatic',
        modules: blueprint.moduleIds || [],
        totalQuestions: sanitizedQuestions.length,
        difficultyDistribution: blueprint.difficultyDistribution || {}
      } : undefined),
      status: computedStatus,
      createdBy: req.user._id
    });

    if (computedStatus !== 'draft') {
      updateExamStatus(exam);
    }
    await exam.save();

    res.status(201).json({
      success: true,
      message: computedStatus === 'draft' ? 'Exam saved as draft' : 'Exam created and scheduled successfully',
      data: exam
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get analytics for an exam (admin)
// @route   GET /api/exams/:id/analytics
// @access  Private (Super Admin / School Admin)
exports.getExamAnalytics = async (req, res, next) => {
  try {
    const examId = req.params.id;

    const exam = await Exam.findById(examId)
      .populate('course', 'title')
      .populate('questions');

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const results = await TestResult.find({ exam: examId, testType: 'exam' })
      .populate('student', 'name email')
      .sort('-completedAt');

    const totalAttempts = results.length;
    if (totalAttempts === 0) {
      return res.status(200).json({
        success: true,
        data: {
          exam,
          totalAttempts: 0,
          passRate: 0,
          averageScore: 0,
          questionStats: {},
          studentResults: [],
        },
      });
    }

    const passedCount = results.filter((r) => r.isPassed).length;
    const passRate = (passedCount / totalAttempts) * 100;
    const averageScore = results.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalAttempts;

    // Per-question stats
    const questionStats = {};
    (exam.questions || []).forEach((q) => {
      const optionsLen = Array.isArray(q.options) ? q.options.length : 0;
      questionStats[String(q._id)] = {
        questionId: q._id,
        question: q.question,
        totalAttempts: 0,
        correctAttempts: 0,
        optionsSelected: Array(optionsLen).fill(0),
      };
    });

    results.forEach((result) => {
      (result.answers || []).forEach((answer) => {
        const qId = String(answer.question);
        const stat = questionStats[qId];
        if (!stat) return;

        stat.totalAttempts += 1;
        if (answer.isCorrect) stat.correctAttempts += 1;

        if (
          typeof answer.selectedOption === 'number' &&
          answer.selectedOption >= 0 &&
          answer.selectedOption < stat.optionsSelected.length
        ) {
          stat.optionsSelected[answer.selectedOption] += 1;
        }
      });
    });

    const studentResults = results.map((r) => ({
      resultId: r._id,
      studentId: r.student?._id,
      studentName: r.student?.name || r.student?.email || 'Student',
      score: r.percentage,
      isPassed: r.isPassed,
      startedAt: r.createdAt, // Use createdAt as the start time
      completedAt: r.completedAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        exam,
        totalAttempts,
        passRate,
        averageScore,
        questionStats,
        studentResults,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Copy an exam
// @route   POST /api/exams/:id/copy
// @access  Private (Super Admin / School Admin)
exports.copyExam = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const existingExam = await Exam.findById(examId);

    if (!existingExam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check authorization for school admins
    if (isSchoolTenantUser(req.user) && existingExam.franchise && String(existingExam.franchise) !== String(req.user.franchise)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to copy this exam'
      });
    }

    const newExam = new Exam({
      title: `${existingExam.title} (Copy)`,
      description: existingExam.description,
      course: existingExam.course,
      franchise: existingExam.franchise,
      questions: existingExam.questions,
      masterQuestions: existingExam.masterQuestions,
      generationConfig: existingExam.generationConfig,
      mode: existingExam.mode,
      startTime: existingExam.startTime, // Keep same so admin can reschedule/publish when ready
      endTime: existingExam.endTime,
      duration: existingExam.duration,
      passPercentage: existingExam.passPercentage,
      maxAttempts: existingExam.maxAttempts,
      negativeMarking: existingExam.negativeMarking,
      negativeMarksPerQuestion: existingExam.negativeMarksPerQuestion,
      instructions: existingExam.instructions,
      isFinalExam: existingExam.isFinalExam,
      status: 'draft', // Always copy as draft
      createdBy: req.user._id
    });

    await newExam.save();
    await newExam.populate([
      { path: 'course', select: 'title' },
      { path: 'franchise', select: 'name code' },
      { path: 'createdBy', select: 'name email' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Exam copied successfully as draft',
      data: newExam
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update exam (admin)
// @route   PUT /api/exams/:id
// @access  Private (Super Admin / School Admin)
exports.updateExam = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const updates = req.body || {};

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // Optional: validate and apply updates
    if (updates.title !== undefined) exam.title = updates.title;
    if (updates.description !== undefined) exam.description = updates.description;

    if (updates.course) {
      const courseDoc = await Course.findById(updates.course);
      if (!courseDoc) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }
      exam.course = updates.course;
    }

    if (Array.isArray(updates.questions) && updates.questions.length > 0) {
      const mcqCount = await MCQ.countDocuments({ _id: { $in: updates.questions } });
      if (mcqCount !== updates.questions.length) {
        return res.status(400).json({
          success: false,
          message: 'Some questions are invalid',
        });
      }
      exam.questions = updates.questions;
      exam.masterQuestions = Array.isArray(updates.masterQuestions) && updates.masterQuestions.length > 0
        ? updates.masterQuestions
        : updates.questions;
    } else if (Array.isArray(updates.masterQuestions)) {
      exam.masterQuestions = updates.masterQuestions;
    }

    if (updates.generationConfig && typeof updates.generationConfig === 'object') {
      exam.generationConfig = {
        ...(exam.generationConfig?.toObject ? exam.generationConfig.toObject() : exam.generationConfig || {}),
        ...updates.generationConfig,
      };
    } else if (updates.blueprint || updates.mode) {
      const prevGen = exam.generationConfig?.toObject ? exam.generationConfig.toObject() : (exam.generationConfig || {});
      exam.generationConfig = {
        ...prevGen,
        mode: updates.mode || prevGen.mode || 'manual',
        modules: updates.blueprint?.moduleIds || prevGen.modules || [],
        totalQuestions: updates.blueprint?.totalQuestions || (Array.isArray(updates.questions) ? updates.questions.length : prevGen.totalQuestions),
        difficultyDistribution: updates.blueprint?.difficultyDistribution || prevGen.difficultyDistribution || {}
      };
    }

    if (updates.startTime) {
      exam.startTime = updates.startTime;
    }

    if (updates.duration) {
      let durationInMinutes = parseInt(updates.duration, 10);
      if (updates.durationType === 'hours') {
        durationInMinutes *= 60;
      }
      exam.duration = durationInMinutes;
    }

    if (updates.passPercentage !== undefined) {
      exam.passPercentage = Number(updates.passPercentage) || exam.passPercentage;
    }

    if (updates.maxAttempts !== undefined) {
      exam.maxAttempts = Number(updates.maxAttempts) || 1;
    }

    if (updates.negativeMarking !== undefined) {
      exam.negativeMarking = Boolean(updates.negativeMarking);
    }

    if (updates.negativeMarksPerQuestion !== undefined) {
      exam.negativeMarksPerQuestion = Number(updates.negativeMarksPerQuestion) || 0;
    }

    if (updates.instructions !== undefined) {
      exam.instructions = updates.instructions;
    }

    if (updates.endTime !== undefined) {
      exam.endTime = updates.endTime || null;
    }

    if (updates.franchise !== undefined) {
      // Allow setting to null or a specific school
      exam.franchise = updates.franchise || null;
    }

    if (updates.status !== undefined) {
      exam.status = updates.status;
    }

    if (updates.isFinalExam !== undefined) {
      exam.isFinalExam = Boolean(updates.isFinalExam);
    }

    updateExamStatus(exam);
    await exam.save();
    await exam.populate([
      { path: 'course', select: 'title' },
      { path: 'franchise', select: 'name code' },
      { path: 'createdBy', select: 'name email' },
    ]);

    res.status(200).json({ success: true, message: 'Exam updated successfully', data: exam });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete exam (admin)
// @route   DELETE /api/exams/:id
// @access  Private (Super Admin / School Admin)
exports.deleteExam = async (req, res, next) => {
  try {
    const examId = req.params.id;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // Delete all test results associated with this exam
    await TestResult.deleteMany({ exam: examId });

    // Now, delete the exam itself
    await exam.deleteOne();

    res.status(200).json({ success: true, message: 'Exam deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get exams (admin)
// @route   GET /api/exams
// @access  Private (Super Admin / School Admin)
exports.getExams = async (req, res, next) => {
  try {
    let query = {};

    if (isSchoolTenantUser(req.user)) {
      query.franchise = req.user.franchise?._id || req.user.franchise;
    }

    if (req.query.course) query.course = req.query.course;
    if (req.query.status) query.status = req.query.status;

    const exams = await Exam.find(query)
      .populate('course', 'title')
      .populate('franchise', 'name code')
      .populate('createdBy', 'name email')
      .sort('-startTime');

    // Update status for all exams in the result set
    exams.forEach(updateExamStatus);

    res.status(200).json({
      success: true,
      count: exams.length,
      data: exams
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single exam (admin)
// @route   GET /api/exams/:id
// @access  Private (Super Admin / School Admin)
exports.getExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('course', 'title')
      .populate('franchise', 'name code')
      .populate('createdBy', 'name email')
      .populate('questions');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    updateExamStatus(exam);

    const resultsRaw = await TestResult.find({ exam: exam._id, testType: 'exam' })
      .populate('student', 'name email')
      .populate('studentCertificate', 'certificateNumber issueDate')
      .sort('-completedAt');

    const studentProfiles = await Student.find({
      user: { $in: resultsRaw.map((r) => r.student?._id).filter(Boolean) }
    }).select('user personalInfo studentId');

    const profileByUser = new Map(studentProfiles.map((s) => [String(s.user), s]));
    const maxScore = (exam.questions || []).reduce((sum, q) => sum + (q.marks || 1), 0);

    const results = resultsRaw.map((result) => ({
      ...result.toObject(),
      studentProfile: profileByUser.get(String(result.student?._id)) || null,
      maxScore: result.maxScore || maxScore
    }));

    const passedCount = results.filter((r) => r.isPassed).length;

    res.status(200).json({
      success: true,
      data: {
        ...exam.toObject(),
        results,
        attemptsCount: results.length,
        resultSummary: {
          total: results.length,
          passed: passedCount,
          failed: results.length - passedCount,
          passRate: results.length ? Math.round((passedCount / results.length) * 100) : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all exams for logged-in student
// @route   GET /api/exams/student/my-exams
// @access  Private/Student
exports.getExamsForStudent = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user.id }).populate({ 
      path: 'enrolledCourses', 
      populate: { 
        path: 'course', 
        model: 'Course' 
      } 
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const courseIds = (student.enrolledCourses || [])
      .map((ec) => ec.course?._id)
      .filter(Boolean);

    const examQuery = {
      course: { $in: courseIds },
      status: { $ne: 'draft' }
    };

    let exams = await Exam.find(examQuery)
      .populate('course', 'title')
      .sort('startTime');

    const studentFranchiseId = student.franchise ? String(student.franchise) : null;
    exams = exams.filter((e) => {
      if (!e.franchise) return true;
      if (!studentFranchiseId) return false;
      return String(e.franchise) === studentFranchiseId;
    });

    const examIds = exams.map(e => e._id);

    const attempted = await TestResult.find({
      student: req.user._id,
      exam: { $in: examIds }
    })
    .populate({
      path: 'exam',
      select: 'title passPercentage',
      populate: {
        path: 'course',
        select: 'title'
      }
    })
    .populate('studentCertificate', 'certificateNumber issueDate')
    .populate('marksheet', 'issueDate grade percentage');

    const attemptedMap = new Map(attempted.map(r => [String(r.exam?._id), r]));

    // Check if student has already completed & passed the course (e.g. passed isFinalExam or holds certificate)
    const passedResults = await TestResult.find({
      student: req.user._id,
      isPassed: true
    }).populate('exam', 'course isFinalExam');

    const passedCourseIds = new Set();
    passedResults.forEach(r => {
      if (r.exam?.isFinalExam && r.exam?.course) {
        passedCourseIds.add(String(r.exam.course));
      }
    });

    const passedCertificates = await StudentCertificate.find({
      student: student._id
    }).select('course');
    passedCertificates.forEach(c => {
      if (c.course) passedCourseIds.add(String(c.course));
    });

    const availableExams = [];
    const attemptedExams = [];

    exams.forEach(exam => {
      const examCourseId = String(exam.course?._id || exam.course);
      if (attemptedMap.has(String(exam._id))) {
        const result = attempted.find(r => String(r.exam?._id) === String(exam._id));
        if (result) attemptedExams.push(result);
      } else {
        // Only include in available if student has NOT already passed this course
        if (!passedCourseIds.has(examCourseId)) {
          availableExams.push(exam);
        }
      }
    });

    const nowTs = Date.now();
    availableExams.forEach(updateExamStatus);

    const enrichedAvailable = await Promise.all(
      availableExams.map(async (exam) => {
        const courseId = exam.course?._id || exam.course;
        const feeAccess = await checkExamFeeEligibility(student, courseId);
        const unifiedFeeAccess = feeAccess ? {
          ...feeAccess,
          isEligible: feeAccess.allowed === true
        } : { allowed: true, isEligible: true };
        const examData = exam.toObject ? exam.toObject() : { ...exam };

        const startTs = parseExamTimestamp(exam.startTime);
        const durationMinutes = Number(exam.duration) || 60;
        const endTs = exam.endTime ? parseExamTimestamp(exam.endTime) : (startTs + durationMinutes * 60000);

        const isUpcoming = !isNaN(startTs) && nowTs < startTs;
        const isExpired = !isNaN(endTs) && nowTs > endTs;
        const isLive = !isUpcoming && !isExpired && exam.status !== 'completed' && exam.status !== 'draft';

        return {
          ...examData,
          status: isUpcoming ? 'scheduled' : isExpired ? 'completed' : 'active',
          isUpcoming,
          isLive,
          isExpired,
          feeAccess: unifiedFeeAccess
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        available: enrichedAvailable,
        attempted: attemptedExams
      }
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/exams/student/:id/start
// @access  Private/Student
exports.getExamForStudent = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('course', 'title')
      .populate('franchise', 'name code');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    const nowTs = Date.now();
    const startTs = parseExamTimestamp(exam.startTime);
    const durationMinutes = Number(exam.duration) || 60;
    const endTs = exam.endTime ? parseExamTimestamp(exam.endTime) : (startTs + durationMinutes * 60000);

    if (!isNaN(startTs) && nowTs < startTs) {
      const formattedStart = new Date(startTs).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      return res.status(400).json({
        success: false,
        message: `This examination has not started yet. It is scheduled to start on ${formattedStart}. Please return when the exam begins.`,
        notStarted: true,
        startTime: exam.startTime
      });
    }

    if (!isNaN(endTs) && nowTs > endTs) {
      return res.status(400).json({
        success: false,
        message: 'This examination session has ended and is no longer accepting new attempts.',
        expired: true
      });
    }

    const student = await Student.findOne({ user: req.user.id }).populate({ 
      path: 'enrolledCourses', 
      populate: { 
        path: 'course', 
        model: 'Course' 
      } 
    });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const isEnrolled = student.enrolledCourses.some(ec => String(ec.course._id) === String(exam.course._id));
    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    // Check if student already passed the final exam or has certificate for this course
    const alreadyPassedFinal = await TestResult.findOne({
      student: req.user._id,
      course: exam.course._id,
      isPassed: true
    }).populate('exam', 'isFinalExam');

    if (alreadyPassedFinal && alreadyPassedFinal.exam?.isFinalExam) {
      return res.status(400).json({
        success: false,
        message: 'You have already completed and passed the final examination for this course.'
      });
    }

    const alreadyAwardedCert = await StudentCertificate.findOne({
      student: student._id,
      course: exam.course._id
    });
    if (alreadyAwardedCert) {
      return res.status(400).json({
        success: false,
        message: 'You have already completed this course and received your certificate.'
      });
    }

    const feeAccess = await checkExamFeeEligibility(student, exam.course._id);
    if (!feeAccess.allowed) {
      return res.status(403).json({
        success: false,
        message: feeAccess.message,
        feeAccess
      });
    }

    const previousAttemptsCount = await TestResult.countDocuments({ student: req.user._id, exam: exam._id });
    const maxAllowed = exam.maxAttempts || 1;
    if (previousAttemptsCount >= maxAllowed) {
      return res.status(400).json({
        success: false,
        message: `You have reached the maximum allowed attempts (${maxAllowed}) for this exam`
      });
    }

    let attempt = await ExamAttempt.findOne({
      exam: exam._id,
      student: req.user._id,
      status: 'in_progress'
    });

    if (attempt) {
      const expiresTs = new Date(attempt.expiresAt).getTime();
      if (nowTs > expiresTs) {
        attempt.status = 'timed_out';
        await attempt.save();
        return res.status(400).json({
          success: false,
          message: 'Your exam attempt has timed out'
        });
      }
    } else {
      const examQuestionIds = (Array.isArray(exam.questions) && exam.questions.length > 0)
        ? exam.questions
        : (Array.isArray(exam.masterQuestions) && exam.masterQuestions.length > 0)
        ? exam.masterQuestions
        : [];
      const rawMcqs = await MCQ.find({ _id: { $in: examQuestionIds }, isActive: true }).lean();
      if (rawMcqs.length === 0) {
        return res.status(400).json({ success: false, message: 'No questions found for this exam' });
      }

      // Shuffled Questions via Fisher-Yates
      const shuffledMcqs = fisherYatesShuffle(rawMcqs);

      // Shuffled Options per Question via Fisher-Yates with stable IDs
      const randomizedQuestions = shuffledMcqs.map((mcq, idx) => {
        const shuffledOpts = fisherYatesShuffle(mcq.options || []).map((opt) => ({
          _id: opt._id,
          text: opt.text
        }));
        return {
          questionId: mcq._id,
          order: idx + 1,
          options: shuffledOpts,
          selectedOptionId: null,
          isMarkedForReview: false,
          timeSpentSeconds: 0
        };
      });

      let expiresAt = new Date(nowTs + exam.duration * 60000);
      if (exam.endTime) {
        const calculatedEndTime = new Date(exam.endTime);
        if (calculatedEndTime < expiresAt) {
          expiresAt = calculatedEndTime;
        }
      }

      attempt = await ExamAttempt.create({
        exam: exam._id,
        student: req.user._id,
        course: exam.course._id || exam.course,
        attemptNumber: previousAttemptsCount + 1,
        status: 'in_progress',
        startedAt: new Date(nowTs),
        expiresAt,
        randomizedQuestions
      });
    }

    // Prepare questions for student (strictly without isCorrect or explanation)
    const mcqIds = attempt.randomizedQuestions.map((rq) => rq.questionId);
    const metaList = await MCQ.find({ _id: { $in: mcqIds } }).select('question image questionType marks').lean();
    const metaMap = new Map(metaList.map((m) => [String(m._id), m]));

    const mcqsForStudent = attempt.randomizedQuestions.map((rq) => {
      const meta = metaMap.get(String(rq.questionId));
      return {
        _id: rq.questionId,
        order: rq.order,
        question: meta?.question || '',
        image: meta?.image || '',
        questionType: meta?.questionType || 'single_choice',
        marks: meta?.marks || 1,
        options: rq.options,
        selectedOptionId: rq.selectedOptionId || null,
        isMarkedForReview: rq.isMarkedForReview || false
      };
    });

    const remainingSeconds = Math.max(0, Math.floor((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000));

    res.status(200).json({
      success: true,
      data: {
        exam: {
          _id: exam._id,
          title: exam.title,
          description: exam.description,
          course: exam.course,
          startTime: exam.startTime,
          endTime: exam.endTime ? new Date(exam.endTime) : new Date(new Date(exam.startTime).getTime() + exam.duration * 60000),
          passPercentage: exam.passPercentage,
          duration: exam.duration,
          instructions: exam.instructions || ''
        },
        attemptId: attempt._id,
        remainingSeconds,
        mcqs: mcqsForStudent
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit exam answers
// @route   POST /api/exams/student/:id/submit
// @access  Private/Student
exports.submitExam = async (req, res, next) => {
  try {
    const { answers, totalTimeTaken } = req.body;
    const examId = req.params.id;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid exam submission data'
      });
    }

    const exam = await Exam.findById(examId).populate('course', 'title');
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    const now = Date.now();
    const startTime = parseExamTimestamp(exam.startTime);
    // Use the same logic as updateExamStatus for consistency
    const calculatedEndTime = exam.endTime ? parseExamTimestamp(exam.endTime) : (startTime + exam.duration * 60000);
    
    if (now < startTime || now > calculatedEndTime) {
      return res.status(400).json({
        success: false,
        message: 'Exam is not active at this time'
      });
    }

    // Prevent multiple attempts
    const existingResult = await TestResult.findOne({ student: req.user._id, exam: exam._id });
    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted this exam'
      });
    }

    const student = await Student.findOne({ user: req.user.id })
      .populate('user', 'name email profilePicture')
      .populate('franchise')
      .populate({
        path: 'enrolledCourses',
        populate: { path: 'course', model: 'Course' }
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const feeAccess = await checkExamFeeEligibility(student, exam.course._id || exam.course);
    if (!feeAccess.allowed) {
      return res.status(403).json({
        success: false,
        message: feeAccess.message,
        feeAccess
      });
    }

    const mcqIds = answers.map(a => a.question);
    const mcqs = await MCQ.find({ _id: { $in: mcqIds } });

    if (mcqs.length !== answers.length) {
      return res.status(400).json({
        success: false,
        message: 'Some questions not found'
      });
    }

    // Ensure all questions belong to this exam
    const examQuestionSet = new Set(exam.questions.map(id => String(id)));
    const allBelongToExam = mcqIds.every(id => examQuestionSet.has(String(id)));
    if (!allBelongToExam) {
      return res.status(400).json({
        success: false,
        message: 'Invalid questions for this exam'
      });
    }

    // Evaluate answers
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let totalScore = 0;

    const evaluatedAnswers = answers.map(answer => {
      const mcq = mcqs.find(m => m._id.toString() === String(answer.question));
      let isCorrect = false;
      let matchedIndex = typeof answer.selectedOption === 'number' ? answer.selectedOption : -1;

      if (mcq) {
        if (answer.selectedOptionId) {
          const optMatch = mcq.options.find(opt => String(opt._id) === String(answer.selectedOptionId));
          if (optMatch) {
            isCorrect = optMatch.isCorrect === true;
            matchedIndex = mcq.options.findIndex(opt => String(opt._id) === String(answer.selectedOptionId));
          }
        } else if (typeof answer.selectedOption === 'number' && answer.selectedOption >= 0 && mcq.options[answer.selectedOption]) {
          isCorrect = mcq.options[answer.selectedOption].isCorrect === true;
        }
      }

      if (isCorrect) {
        correctAnswers++;
        totalScore += (mcq?.marks || 1);
      } else {
        wrongAnswers++;
        if (exam.negativeMarking && exam.negativeMarksPerQuestion) {
          totalScore = Math.max(0, totalScore - Number(exam.negativeMarksPerQuestion));
        }
      }

      return {
        question: answer.question,
        selectedOption: matchedIndex,
        selectedOptionId: answer.selectedOptionId || null,
        isCorrect,
        timeTaken: answer.timeTaken || 0
      };
    });

    const totalQuestions = answers.length;
    const maxScore = mcqs.reduce((sum, mcq) => sum + mcq.marks, 0);
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    const passThreshold = exam.passPercentage || parseInt(process.env.EXAM_PASS_PERCENTAGE || '60', 10);
    const isPassed = percentage >= passThreshold;

    const testResult = await TestResult.create({
      student: req.user._id,
      testType: 'exam',
      exam: exam._id,
      course: exam.course,
      answers: evaluatedAnswers,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      score: totalScore,
      maxScore,
      percentage,
      isPassed,
      totalTimeTaken: totalTimeTaken || 0
    });

    if (student) {
      let grade;
      if (percentage >= 75) grade = 'A+';
      else if (percentage >= 60) grade = 'A';
      else if (percentage >= 36) grade = 'B';
      else grade = 'C';
      student.examResults.push({
        exam: testResult._id,
        score: totalScore,
        percentage,
        grade,
        isPassed,
        date: new Date()
      });
      await student.save();
    }

    let certificateId = null;
    let marksheetId = null;
    let certificateGenerated = false;

    if (isPassed && exam.isFinalExam && student && !isServerPdfDisabled) {
      try {
        const course = await Course.findById(exam.course);
        const studentFranchise = student.franchise;
        const isMainBranch = studentFranchise?.isMainBranch === true;
        const targetType = isMainBranch ? 'main_branch' : 'franchise';

        // Retrieve all prior exam attempts for this student and course to aggregate all module subjects
        const priorResults = await TestResult.find({
          student: req.user._id,
          course: course._id,
          testType: 'exam',
          _id: { $ne: testResult._id }
        }).populate({
          path: 'exam',
          select: 'title generationConfig maxScore questions',
          populate: { path: 'generationConfig.modules', select: 'title' }
        }).sort({ completedAt: 1 });

        // Collect all exam results including this final exam
        const allExamResults = [
          ...priorResults.filter(r => r.exam),
          {
            exam,
            score: totalScore,
            maxScore,
            percentage,
            isPassed,
            completedAt: new Date()
          }
        ];

        // Group by subject/module and keep the best score if an assessment was taken multiple times
        const subjectsMap = new Map();

        for (const resItem of allExamResults) {
          let subjectTitle = '';
          if (resItem.exam?.generationConfig?.modules?.length === 1 && resItem.exam.generationConfig.modules[0]?.title) {
            subjectTitle = resItem.exam.generationConfig.modules[0].title.trim();
          } else if (resItem.exam?.title) {
            subjectTitle = resItem.exam.title.trim();
          } else {
            subjectTitle = course.title.trim();
          }

          const key = subjectTitle.toLowerCase();
          const rMax = Number(resItem.maxScore) || 100;
          const rObtained = Number(resItem.score) || 0;
          const rMin = Math.round(rMax * 0.4);

          if (!subjectsMap.has(key)) {
            subjectsMap.set(key, {
              subject: subjectTitle,
              totalMarks: rMax,
              minMarks: rMin,
              obtainedMarks: rObtained
            });
          } else {
            const existing = subjectsMap.get(key);
            if (rObtained > existing.obtainedMarks) {
              existing.obtainedMarks = rObtained;
              existing.totalMarks = rMax;
              existing.minMarks = rMin;
            }
          }
        }

        const marksData = Array.from(subjectsMap.values());
        const totalAggregateMarks = marksData.reduce((acc, m) => acc + (Number(m.totalMarks) || 0), 0);
        const totalAggregateObtained = marksData.reduce((acc, m) => acc + (Number(m.obtainedMarks) || 0), 0);
        const aggregatePercentage = totalAggregateMarks > 0 ? (totalAggregateObtained / totalAggregateMarks) * 100 : percentage;

        const calculateGradeLetter = (pct) => {
          if (pct >= 85) return 'A+';
          if (pct >= 70) return 'A';
          if (pct >= 55) return 'B+';
          if (pct >= 40) return 'B';
          return 'C';
        };
        const finalGrade = calculateGradeLetter(aggregatePercentage);

        // Preserve any existing certificate and generate one only when missing.
        // The marksheet is still generated from the official system default template.
        let certificateNumber = '';
        const existingCertificate = await StudentCertificate.findOne({
          student: student._id,
          course: course._id
        });

        const companyInfo = await CompanyInformation.findOne();

        const certificate = await getOrGenerateExamCertificate(existingCertificate, async () => {
          // Passing template: null guarantees renderDefaultStudentCertificateCanvas (Official System Default) is used
          const generatedCertificate = await studentCertificateController.renderStudentCertificate({
            student,
            course,
            template: null,
            companyInfo,
            studentId: student._id,
            courseId: course._id,
            grade: finalGrade,
            percentage: aggregatePercentage,
            issueDate: new Date()
          });
          certificateGenerated = true;
          return generatedCertificate;
        });
        certificateId = certificate._id;
        certificateNumber = certificate.certificateNumber || '';
        testResult.studentCertificate = certificate._id;

        try {
          const marksheetController = require('./marksheetController');
          const Marksheet = require('../models/Marksheet');

          let marksheet = await Marksheet.findOne({
            student: student._id,
            course: course._id
          });

          const marksheetNumber = (marksheet && marksheet.marksheetNumber)
            ? marksheet.marksheetNumber
            : getMarksheetNumberForStudent(student, new Date().getFullYear(), certificateNumber);

          // Passing template: null guarantees renderDefaultMarksheetCanvas (Official System Default) is used
          const marksheetBuffer = await marksheetController.generateMarksheetCanvas({
            student,
            course,
            template: null,
            companyInfo,
            marks: marksData,
            totalMarks: totalAggregateMarks,
            totalObtainedMarks: totalAggregateObtained,
            percentage: aggregatePercentage,
            grade: finalGrade,
            issueDate: (marksheet && marksheet.issueDate) ? marksheet.issueDate : new Date(),
            marksheetNumber,
            certificateNumber
          });

          if (!marksheet || marksheet.template) {
            if (marksheet) {
              marksheet.template = undefined;
              marksheet.marks = marksData;
              marksheet.totalMarks = totalAggregateMarks;
              marksheet.totalObtainedMarks = totalAggregateObtained;
              marksheet.percentage = aggregatePercentage;
              marksheet.grade = finalGrade;
              marksheet.issueDate = marksheet.issueDate || new Date();
              marksheet.marksheetNumber = marksheetNumber;
              marksheet.file = marksheetBuffer;
              await marksheet.save();
            } else {
              marksheet = await Marksheet.create({
                student: student._id,
                course: course._id,
                template: undefined,
                marks: marksData,
                totalMarks: totalAggregateMarks,
                totalObtainedMarks: totalAggregateObtained,
                percentage: aggregatePercentage,
                grade: finalGrade,
                issueDate: new Date(),
                marksheetNumber,
                file: marksheetBuffer
              });
            }
          } else {
            // Update marks and re-render if marks changed
            marksheet.marks = marksData;
            marksheet.totalMarks = totalAggregateMarks;
            marksheet.totalObtainedMarks = totalAggregateObtained;
            marksheet.percentage = aggregatePercentage;
            marksheet.grade = finalGrade;
            marksheet.marksheetNumber = marksheetNumber;
            marksheet.file = marksheetBuffer;
            await marksheet.save();
          }

          marksheetId = marksheet._id;
          testResult.marksheet = marksheetId;

          queueGeneratedImageUpload(
            (fileUrl) =>
              Marksheet.findByIdAndUpdate(marksheet._id, {
                fileUrl,
                $unset: { file: 1 }
              }),
            marksheetBuffer,
            'ses-lms/marksheets'
          );
        } catch (marksheetError) {
          console.error('Error auto-generating marksheet:', marksheetError.message);
        }
      } catch (certError) {
        console.error('Error auto-generating certificate:', certError.message);
      }
    }

    if (certificateId) {
      testResult.studentCertificate = certificateId;
    }
    if (marksheetId) {
      testResult.marksheet = marksheetId;
    }
    if (certificateId || marksheetId) {
      await testResult.save();
    }

    const studentName = student?.personalInfo
      ? `${student.personalInfo.firstName || ''} ${student.personalInfo.lastName || ''}`.trim()
      : req.user.name;

    try {
      await createExamResultNotifications({
        studentUserId: req.user._id,
        studentName: studentName || req.user.email,
        examTitle: exam.title,
        examId: exam._id,
        resultId: testResult._id,
        isPassed,
        percentage,
        certificateId,
        marksheetId,
        franchiseId: student?.franchise?._id || student?.franchise || null,
        createdBy: exam.createdBy
      });
    } catch (notifyError) {
      console.error('Exam notification error:', notifyError.message);
    }

    res.status(201).json({
      success: true,
      message: isPassed
        ? marksheetId
          ? certificateGenerated
            ? 'Exam passed! Certificate and marksheet generated successfully.'
            : 'Exam passed! Existing certificate preserved and marksheet generated successfully.'
          : certificateId
            ? 'Exam passed! Existing certificate preserved; marksheet generation failed. Please retry marksheet generation.'
            : 'Exam passed! Result saved successfully.'
        : 'Exam submitted successfully',
      result: {
        id: testResult._id,
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        score: totalScore,
        maxScore,
        percentage,
        isPassed,
        grade: student?.examResults?.[student.examResults.length - 1]?.grade || null,
        certificateId,
        marksheetId,
        examTitle: exam.title,
        courseTitle: exam.course?.title || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student exam results by course for marksheet generation
// @route   GET /api/exams/student/:studentId/course/:courseId/results
// @access  Private (Super Admin / School Admin)
exports.getStudentExamResultsByCourse = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.params;

    // Verify student exists and populate user for name
    const student = await Student.findById(studentId).populate('user', 'name email');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Check permissions for school admin
    if (isSchoolTenantUser(req.user)) {
      if (student.franchise?.toString() !== req.user.franchise?.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this student\'s exam results' });
      }
    }

    // Fetch test results for this student and course
    const testResults = await TestResult.find({ 
      student: student.user._id,  // TestResult uses User ID, not Student ID
      course: courseId,
      testType: 'exam'
    })
    .populate('exam', 'title description')
    .populate('course', 'title')
    .sort({ completedAt: -1 });

    // Format the results
    const formattedResults = testResults.map(result => ({
      _id: result._id,
      examId: result.exam?._id,
      examTitle: result.exam?.title || 'Unknown Exam',
      examDescription: result.exam?.description || '',
      totalQuestions: result.totalQuestions,
      correctAnswers: result.correctAnswers,
      wrongAnswers: result.wrongAnswers,
      score: result.score,
      percentage: result.percentage,
      isPassed: result.isPassed,
      completedAt: result.completedAt,
      maxScore: result.totalQuestions // Each question is 1 mark typically
    }));

    res.status(200).json({
      success: true,
      count: formattedResults.length,
      data: formattedResults
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Validate question bank availability for automatic exam generation
// @route   POST /api/exams/validate-generation
// @access  Private (Admin / Super Admin / School Admin)
exports.validateGeneration = async (req, res, next) => {
  try {
    const courseId = req.body.course || req.body.courseId;
    const moduleIds = req.body.moduleIds;
    const difficultyDistribution = req.body.difficultyDistribution || req.body.difficultyCounts;
    const totalQuestions = req.body.totalQuestions || (difficultyDistribution ? (Number(difficultyDistribution.easy || 0) + Number(difficultyDistribution.medium || 0) + Number(difficultyDistribution.hard || 0)) : 10);

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course ID is required' });
    }

    const query = { course: courseId, isActive: true };
    if (Array.isArray(moduleIds) && moduleIds.length > 0) {
      query.$or = [{ module: { $in: moduleIds } }, { chapter: { $in: moduleIds } }];
    }

    const eligible = await MCQ.find(query).select('_id difficulty module chapter marks').lean();

    const availableCounts = {
      total: eligible.length,
      easy: eligible.filter(q => q.difficulty === 'easy').length,
      medium: eligible.filter(q => (q.difficulty || 'medium') === 'medium').length,
      hard: eligible.filter(q => q.difficulty === 'hard').length
    };

    const requestedTotal = Number(totalQuestions) || 0;
    const requestedDiff = difficultyDistribution || { easy: 0, medium: 0, hard: 0 };
    const diffSum = (Number(requestedDiff.easy) || 0) + (Number(requestedDiff.medium) || 0) + (Number(requestedDiff.hard) || 0);

    const issues = [];
    if (availableCounts.total < requestedTotal) {
      issues.push(`Requested ${requestedTotal} questions, but only ${availableCounts.total} active questions are available in the selected modules.`);
    }
    if (diffSum > 0) {
      if (Number(requestedDiff.easy) > availableCounts.easy) {
        issues.push(`Requested ${requestedDiff.easy} Easy questions, but only ${availableCounts.easy} are available.`);
      }
      if (Number(requestedDiff.medium) > availableCounts.medium) {
        issues.push(`Requested ${requestedDiff.medium} Medium questions, but only ${availableCounts.medium} are available.`);
      }
      if (Number(requestedDiff.hard) > availableCounts.hard) {
        issues.push(`Requested ${requestedDiff.hard} Hard questions, but only ${availableCounts.hard} are available.`);
      }
    }

    res.status(200).json({
      success: true,
      valid: issues.length === 0,
      issues,
      availableCounts,
      eligibleTotal: eligible.length,
      data: {
        canGenerate: issues.length === 0,
        availableTotal: availableCounts.total,
        availableCounts,
        issues
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate a draft set of questions for exam review
// @route   POST /api/exams/generate-draft
// @access  Private (Admin / Super Admin / School Admin)
exports.generateExamDraft = async (req, res, next) => {
  try {
    const courseId = req.body.course || req.body.courseId;
    const moduleIds = req.body.moduleIds;
    const reqDiff = req.body.difficultyDistribution || req.body.difficultyCounts || { easy: 0, medium: 0, hard: 0 };
    const diffSum = (Number(reqDiff.easy) || 0) + (Number(reqDiff.medium) || 0) + (Number(reqDiff.hard) || 0);
    const reqTotal = parseInt(req.body.totalQuestions || (diffSum > 0 ? diffSum : 10), 10) || 10;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course ID is required' });
    }

    const query = { course: courseId, isActive: true };
    if (Array.isArray(moduleIds) && moduleIds.length > 0) {
      query.$or = [{ module: { $in: moduleIds } }, { chapter: { $in: moduleIds } }];
    }

    const allEligible = await MCQ.find(query)
      .populate('module', 'title order')
      .populate('lesson', 'title order')
      .populate('chapter', 'title')
      .populate('topic', 'title')
      .lean();

    if (allEligible.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active questions found in Question Bank for this course and modules.'
      });
    }

    let selectedQuestions = [];

    if (diffSum > 0) {
      const easyPool = fisherYatesShuffle(allEligible.filter(q => q.difficulty === 'easy'));
      const medPool = fisherYatesShuffle(allEligible.filter(q => (q.difficulty || 'medium') === 'medium'));
      const hardPool = fisherYatesShuffle(allEligible.filter(q => q.difficulty === 'hard'));

      const takeEasy = Math.min(Number(reqDiff.easy) || 0, easyPool.length);
      const takeMed = Math.min(Number(reqDiff.medium) || 0, medPool.length);
      const takeHard = Math.min(Number(reqDiff.hard) || 0, hardPool.length);

      selectedQuestions = [
        ...easyPool.slice(0, takeEasy),
        ...medPool.slice(0, takeMed),
        ...hardPool.slice(0, takeHard)
      ];

      const selectedIds = new Set(selectedQuestions.map(q => String(q._id)));
      if (selectedQuestions.length < reqTotal) {
        const remainingPool = fisherYatesShuffle(allEligible.filter(q => !selectedIds.has(String(q._id))));
        const needed = reqTotal - selectedQuestions.length;
        selectedQuestions.push(...remainingPool.slice(0, needed));
      }
    } else {
      const shuffled = fisherYatesShuffle(allEligible);
      selectedQuestions = shuffled.slice(0, Math.min(reqTotal, shuffled.length));
    }

    const totalMarks = selectedQuestions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
    const difficultySummary = {
      easy: selectedQuestions.filter(q => q.difficulty === 'easy').length,
      medium: selectedQuestions.filter(q => (q.difficulty || 'medium') === 'medium').length,
      hard: selectedQuestions.filter(q => q.difficulty === 'hard').length
    };

    const formattedQuestions = selectedQuestions.map(q => ({
      ...q,
      module: q.module || q.chapter || null,
      lesson: q.lesson || q.topic || null
    }));

    res.status(200).json({
      success: true,
      data: {
        draftQuestions: formattedQuestions,
        questions: formattedQuestions,
        totalQuestions: formattedQuestions.length,
        totalMarks,
        difficultySummary,
        eligiblePoolCount: allEligible.length
      },
      draftQuestions: formattedQuestions,
      questions: formattedQuestions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Replace a single question in draft review
// @route   POST /api/exams/replace-question
// @access  Private (Admin / Super Admin / School Admin)
exports.replaceQuestion = async (req, res, next) => {
  try {
    const { course: courseId, currentQuestionId, moduleId, difficulty, excludeQuestionIds } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course ID is required' });
    }

    const excludeSet = new Set((excludeQuestionIds || []).map(id => String(id)));
    if (currentQuestionId) excludeSet.add(String(currentQuestionId));

    const query = {
      course: courseId,
      isActive: true,
      _id: { $nin: Array.from(excludeSet) }
    };

    if (difficulty) query.difficulty = difficulty;
    if (moduleId) {
      query.$or = [{ module: moduleId }, { chapter: moduleId }];
    }

    let candidates = await MCQ.find(query)
      .populate('module', 'title order')
      .populate('lesson', 'title order')
      .populate('chapter', 'title')
      .populate('topic', 'title')
      .lean();

    if (candidates.length === 0 && moduleId) {
      delete query.$or;
      candidates = await MCQ.find(query)
        .populate('module', 'title order')
        .populate('lesson', 'title order')
        .populate('chapter', 'title')
        .populate('topic', 'title')
        .lean();
    }

    if (candidates.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No eligible replacement question found in Question Bank matching these criteria.'
      });
    }

    const randomPick = candidates[Math.floor(Math.random() * candidates.length)];
    const formatted = {
      ...randomPick,
      module: randomPick.module || randomPick.chapter || null,
      lesson: randomPick.lesson || randomPick.topic || null
    };

    res.status(200).json({
      success: true,
      message: 'Question replaced successfully',
      replacementQuestion: formatted
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save exam progress in real-time (autosave)
// @route   POST /api/exams/student/:id/save-progress
// @access  Private/Student
exports.saveExamProgress = async (req, res, next) => {
  try {
    const { questionId, selectedOptionId, isMarkedForReview, timeSpentSeconds } = req.body;
    const examId = req.params.id;

    const attempt = await ExamAttempt.findOne({
      exam: examId,
      student: req.user._id,
      status: 'in_progress'
    });

    if (!attempt) {
      return res.status(200).json({ success: true, message: 'No active attempt' });
    }

    const q = attempt.randomizedQuestions.find(item => String(item.questionId) === String(questionId));
    if (q) {
      if (selectedOptionId !== undefined) q.selectedOptionId = selectedOptionId || null;
      if (isMarkedForReview !== undefined) q.isMarkedForReview = Boolean(isMarkedForReview);
      if (timeSpentSeconds !== undefined) q.timeSpentSeconds = Number(timeSpentSeconds) || 0;
      await attempt.save();
    }

    res.status(200).json({ success: true, message: 'Progress saved' });
  } catch (error) {
    next(error);
  }
};
