const MCQ = require('../models/MCQ');
const { isSchoolTenantUser, getSchoolTenantId } = require('../utils/tenantAccess');
const Franchise = require('../models/SchoolCampus');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const Chapter = require('../models/Chapter');
const Topic = require('../models/Topic');
const mongoose = require('mongoose');

// @desc    Get all MCQs with rich filtering, search and pagination
// @route   GET /api/mcqs
// @access  Private
exports.getAllMCQs = async (req, res, next) => {
  try {
    const {
      course,
      module: moduleId,
      lesson: lessonId,
      chapter,
      topic,
      difficulty,
      questionType,
      status,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const query = {};

    if (course) {
      query.course = course;
    }

    // Module / Chapter filtering
    const modId = moduleId || chapter;
    if (modId) {
      query.$or = [{ module: modId }, { chapter: modId }];
    }

    // Lesson / Topic filtering
    const lsnId = lessonId || topic;
    if (lsnId) {
      if (query.$or) {
        query.$and = [
          { $or: [{ module: modId }, { chapter: modId }] },
          { $or: [{ lesson: lsnId }, { topic: lsnId }] }
        ];
        delete query.$or;
      } else {
        query.$or = [{ lesson: lsnId }, { topic: lsnId }];
      }
    }

    if (difficulty) query.difficulty = difficulty;
    if (questionType) query.questionType = questionType;
    if (status) {
      query.status = status;
    } else if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    if (search) {
      query.question = { $regex: search, $options: 'i' };
    }

    // School admin access filter
    if (isSchoolTenantUser(req.user)) {
      const franchise = await Franchise.findById(getSchoolTenantId(req.user))
        .populate({ path: 'plan', select: 'courseAccess' })
        .populate('additionalCourses', '_id');
      if (franchise) {
        const planCourses = franchise.plan ? franchise.plan.courseAccess.map(c => c._id) : [];
        const additionalCourses = franchise.additionalCourses.map(c => c._id);
        const allCourseIds = [...new Set([...planCourses, ...additionalCourses])];
        query.course = { $in: allCourseIds };
      } else {
        query.course = { $in: [] };
      }
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [total, mcqsRaw] = await Promise.all([
      MCQ.countDocuments(query),
      MCQ.find(query)
        .populate('course', 'title courseCode')
        .populate('module', 'title order')
        .populate('lesson', 'title order')
        .populate('chapter', 'title')
        .populate('topic', 'title')
        .populate('createdBy', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    // Ensure fallback for module/lesson display from chapter/topic
    const mcqs = mcqsRaw.map(m => ({
      ...m,
      module: m.module || m.chapter || null,
      lesson: m.lesson || m.topic || null
    }));

    res.status(200).json({
      success: true,
      count: mcqs.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      mcqs,
      data: mcqs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get summary statistics of Question Bank for a course
// @route   GET /api/mcqs/stats
// @access  Private
exports.getMCQStats = async (req, res, next) => {
  try {
    const { course: courseId } = req.query;
    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course ID is required' });
    }

    const filter = { course: courseId, isActive: true };

    const mcqs = await MCQ.find(filter).select('difficulty module chapter marks status').lean();

    const stats = {
      total: mcqs.length,
      easy: 0,
      medium: 0,
      hard: 0,
      totalMarks: 0,
      byModule: {}
    };

    for (const q of mcqs) {
      const diff = q.difficulty || 'medium';
      if (stats[diff] !== undefined) stats[diff]++;
      stats.totalMarks += Number(q.marks) || 1;

      const mid = String(q.module || q.chapter || 'unassigned');
      if (!stats.byModule[mid]) stats.byModule[mid] = { total: 0, easy: 0, medium: 0, hard: 0 };
      stats.byModule[mid].total++;
      if (stats.byModule[mid][diff] !== undefined) stats.byModule[mid][diff]++;
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single MCQ
// @route   GET /api/mcqs/:id
// @access  Private
exports.getMCQ = async (req, res, next) => {
  try {
    const mcq = await MCQ.findById(req.params.id)
      .populate('course', 'title courseCode')
      .populate('module', 'title order')
      .populate('lesson', 'title order')
      .populate('chapter', 'title')
      .populate('topic', 'title')
      .populate('createdBy', 'name email')
      .lean();

    if (!mcq) {
      return res.status(404).json({ success: false, message: 'MCQ not found' });
    }

    res.status(200).json({
      success: true,
      mcq: {
        ...mcq,
        module: mcq.module || mcq.chapter || null,
        lesson: mcq.lesson || mcq.topic || null
      },
      data: mcq
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create MCQ
// @route   POST /api/mcqs
// @access  Private (Admin / Super Admin / School Admin)
exports.createMCQ = async (req, res, next) => {
  try {
    const {
      question,
      image,
      questionType,
      options,
      course,
      module: moduleId,
      lesson: lessonId,
      chapter,
      topic,
      explanation,
      difficulty,
      marks,
      negativeMarks,
      status
    } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Question text is required' });
    }
    if (!course) {
      return res.status(400).json({ success: false, message: 'Course is required' });
    }

    const assignedModule = moduleId || chapter;
    if (!assignedModule) {
      return res.status(400).json({ success: false, message: 'Module selection is required' });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, message: 'Question must have at least 2 options' });
    }

    const correctAnswers = options.filter(o => o.isCorrect);
    if (correctAnswers.length < 1) {
      return res.status(400).json({ success: false, message: 'Please specify at least one correct option' });
    }

    // Ensure options have valid IDs
    const preparedOptions = options.map(opt => ({
      _id: opt._id ? new mongoose.Types.ObjectId(opt._id) : new mongoose.Types.ObjectId(),
      text: opt.text ? String(opt.text).trim() : '',
      isCorrect: Boolean(opt.isCorrect)
    }));

    const assignedLesson = lessonId || topic || null;

    const newMCQ = await MCQ.create({
      question: question.trim(),
      image: image || '',
      questionType: questionType || 'single_choice',
      options: preparedOptions,
      course,
      module: assignedModule,
      lesson: assignedLesson,
      chapter: assignedModule,
      topic: assignedLesson,
      explanation: explanation ? explanation.trim() : '',
      difficulty: difficulty || 'medium',
      marks: Number(marks) || 1,
      negativeMarks: Number(negativeMarks) || 0,
      status: status || 'active',
      isActive: status !== 'inactive',
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Question created successfully in Question Bank',
      mcq: newMCQ,
      data: newMCQ
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update MCQ
// @route   PUT /api/mcqs/:id
// @access  Private (Admin / Super Admin / School Admin)
exports.updateMCQ = async (req, res, next) => {
  try {
    const mcq = await MCQ.findById(req.params.id);
    if (!mcq) {
      return res.status(404).json({ success: false, message: 'MCQ not found' });
    }

    const {
      question,
      image,
      questionType,
      options,
      course,
      module: moduleId,
      lesson: lessonId,
      chapter,
      topic,
      explanation,
      difficulty,
      marks,
      negativeMarks,
      status
    } = req.body;

    if (question !== undefined) mcq.question = question.trim();
    if (image !== undefined) mcq.image = image;
    if (questionType !== undefined) mcq.questionType = questionType;
    if (course !== undefined) mcq.course = course;

    const assignedModule = moduleId !== undefined ? moduleId : chapter;
    if (assignedModule !== undefined) {
      mcq.module = assignedModule;
      mcq.chapter = assignedModule;
    }

    const assignedLesson = lessonId !== undefined ? lessonId : topic;
    if (assignedLesson !== undefined) {
      mcq.lesson = assignedLesson || null;
      mcq.topic = assignedLesson || null;
    }

    if (Array.isArray(options) && options.length >= 2) {
      mcq.options = options.map(opt => ({
        _id: opt._id ? new mongoose.Types.ObjectId(opt._id) : new mongoose.Types.ObjectId(),
        text: opt.text ? String(opt.text).trim() : '',
        isCorrect: Boolean(opt.isCorrect)
      }));
    }

    if (explanation !== undefined) mcq.explanation = explanation.trim();
    if (difficulty !== undefined) mcq.difficulty = difficulty;
    if (marks !== undefined) mcq.marks = Number(marks) || 1;
    if (negativeMarks !== undefined) mcq.negativeMarks = Number(negativeMarks) || 0;
    if (status !== undefined) {
      mcq.status = status;
      mcq.isActive = status !== 'inactive';
    }

    await mcq.save();

    res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      mcq,
      data: mcq
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete MCQ
// @route   DELETE /api/mcqs/:id
// @access  Private (Admin / Super Admin / School Admin)
exports.deleteMCQ = async (req, res, next) => {
  try {
    const mcq = await MCQ.findById(req.params.id);
    if (!mcq) {
      return res.status(404).json({ success: false, message: 'MCQ not found' });
    }

    await mcq.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully from Question Bank'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Duplicate MCQ
// @route   POST /api/mcqs/:id/duplicate
// @access  Private (Admin / Super Admin / School Admin)
exports.duplicateMCQ = async (req, res, next) => {
  try {
    const source = await MCQ.findById(req.params.id).lean();
    if (!source) {
      return res.status(404).json({ success: false, message: 'Source question not found' });
    }

    const { _id, createdAt, updatedAt, __v, ...data } = source;
    const duplicatedOptions = (data.options || []).map(opt => ({
      ...opt,
      _id: new mongoose.Types.ObjectId()
    }));

    const duplicated = await MCQ.create({
      ...data,
      question: `${data.question} (Copy)`,
      options: duplicatedOptions,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Question duplicated successfully',
      data: duplicated,
      mcq: duplicated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk create MCQs
// @route   POST /api/mcqs/bulk
// @access  Private (Admin / Super Admin / School Admin)
exports.bulkCreateMCQs = async (req, res, next) => {
  try {
    const { questions, course, module: defaultModule } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Questions array is required' });
    }

    const createdList = [];
    for (const q of questions) {
      const modId = q.module || defaultModule || q.chapter;
      if (!q.question || !modId) continue;

      const opts = (q.options || []).map(o => ({
        _id: o._id ? new mongoose.Types.ObjectId(o._id) : new mongoose.Types.ObjectId(),
        text: String(o.text || '').trim(),
        isCorrect: Boolean(o.isCorrect)
      }));

      const newMCQ = await MCQ.create({
        question: q.question.trim(),
        image: q.image || '',
        questionType: q.questionType || 'single_choice',
        options: opts,
        course: q.course || course,
        module: modId,
        lesson: q.lesson || q.topic || null,
        chapter: modId,
        topic: q.lesson || q.topic || null,
        explanation: q.explanation || '',
        difficulty: q.difficulty || 'medium',
        marks: Number(q.marks) || 1,
        negativeMarks: Number(q.negativeMarks) || 0,
        status: q.status || 'active',
        isActive: q.status !== 'inactive',
        createdBy: req.user._id
      });
      createdList.push(newMCQ);
    }

    res.status(201).json({
      success: true,
      count: createdList.length,
      message: `Successfully imported ${createdList.length} questions`,
      data: createdList
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get MCQs for test (student testing)
// @route   GET /api/mcqs/test
// @access  Private/Student
exports.getMCQsForTest = async (req, res, next) => {
  try {
    const { topic, chapter, module: moduleId, lesson: lessonId, course, testType } = req.query;
    const query = { isActive: true };

    const targetModule = moduleId || chapter;
    const targetLesson = lessonId || topic;

    if (testType === 'topic' || testType === 'lesson') {
      if (targetLesson) query.$or = [{ lesson: targetLesson }, { topic: targetLesson }];
    } else if (testType === 'chapter' || testType === 'module') {
      if (targetModule) query.$or = [{ module: targetModule }, { chapter: targetModule }];
    } else if (testType === 'full' && course) {
      query.course = course;
    }

    let mcqs = await MCQ.find(query)
      .select('-options.isCorrect -explanation')
      .populate('module', 'title')
      .populate('lesson', 'title')
      .populate('course', 'title');

    if (mcqs.length === 0 && course) {
      mcqs = await MCQ.find({ course, isActive: true })
        .select('-options.isCorrect -explanation')
        .populate('course', 'title');
    }

    // Shuffle MCQs
    const shuffled = mcqs.sort(() => Math.random() - 0.5);

    res.status(200).json({
      success: true,
      count: shuffled.length,
      mcqs: shuffled
    });
  } catch (error) {
    next(error);
  }
};
