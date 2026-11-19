const Progress = require('../models/Progress');
const Topic = require('../models/Topic');
const Chapter = require('../models/Chapter');
const Course = require('../models/Course');
const { updateCourseProgress } = require('../utils/progressUtils');

// @desc    Get student progress
// @route   GET /api/progress
// @access  Private/Student
exports.getMyProgress = async (req, res) => {
  try {
    const { chapter, topic } = req.query;
    let query = { student: req.user.id };

    if (chapter) query.chapter = chapter;
    if (topic) query.topic = topic;

    const progress = await Progress.find(query)
      .populate('chapter', 'title')
      .populate('topic', 'title')
      .sort('-lastAccessed');

    res.status(200).json({
      success: true,
      count: progress.length,
      progress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get chapter-wise progress summary
// @route   GET /api/progress/summary
// @access  Private/Student
exports.getProgressSummary = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get all chapters
    const student = await Student.findOne({ user: studentId }).populate('enrolledCourses');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const courses = await Course.find({ _id: { $in: student.enrolledCourses.map(e => e.course) } });
    const totalCourses = courses.length;
    const completedCourses = student.enrolledCourses.filter(e => e.progress === 100).length;

    const chapters = await Chapter.find({ isActive: true, course: { $in: courses.map(c => c._id) } }).sort('order');

    const summary = await Promise.all(chapters.map(async (chapter) => {
      // Get all topics in this chapter
      const topics = await Topic.find({ chapter: chapter._id, isActive: true });
      const totalTopics = topics.length;

      if (totalTopics === 0) {
        return {
          chapter: {
            id: chapter._id,
            title: chapter.title,
            description: chapter.description
          },
          totalTopics: 0,
          completedTopics: 0,
          progressPercentage: 0
        };
      }

      // Get progress for all topics in this chapter
      const progressRecords = await Progress.find({
        student: studentId,
        chapter: chapter._id
      });

      // Calculate completed topics (video watched + quiz completed)
      const completedTopics = progressRecords.filter(p => 
        p.videoWatched && p.quizCompleted
      ).length;

      const progressPercentage = Math.round((completedTopics / totalTopics) * 100);

      return {
        chapter: {
          id: chapter._id,
          title: chapter.title,
          description: chapter.description
        },
        totalTopics,
        completedTopics,
        progressPercentage,
        lastAccessed: progressRecords.length > 0 
          ? progressRecords.sort((a, b) => b.lastAccessed - a.lastAccessed)[0].lastAccessed 
          : null
      };
    }));

    // Calculate overall progress
    const totalTopicsAll = summary.reduce((sum, item) => sum + item.totalTopics, 0);
    const completedTopicsAll = summary.reduce((sum, item) => sum + item.completedTopics, 0);
    const overallProgress = totalTopicsAll > 0 
      ? Math.round((completedTopicsAll / totalTopicsAll) * 100) 
      : 0;

    res.status(200).json({
      success: true,
      overallProgress,
      totalChapters: chapters.length,
      totalTopics: totalTopicsAll,
      completedTopics: completedTopicsAll,
      totalCourses,
      completedCourses,
      chapterProgress: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update video progress
// @route   PUT /api/progress/video/:topicId
// @access  Private/Student
exports.updateVideoProgress = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { watchedPercentage } = req.body;

    const topic = await Topic.findById(topicId).populate('chapter');
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    // Get chapter with course
    const chapter = await Chapter.findById(topic.chapter).populate('course');
    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
    }

    let progress = await Progress.findOne({
      student: req.user.id,
      topic: topicId
    });

    if (!progress) {
      progress = await Progress.create({
        student: req.user.id,
        course: chapter.course._id || chapter.course,
        chapter: topic.chapter,
        topic: topicId,
        videoWatchedPercentage: watchedPercentage || 0,
        videoWatched: watchedPercentage >= 80 // Consider watched if 80% or more
      });
    } else {
      progress.videoWatchedPercentage = watchedPercentage || progress.videoWatchedPercentage;
      progress.videoWatched = watchedPercentage >= 80;
      progress.lastAccessed = Date.now();
      await progress.save();

      // After updating topic progress, update the overall course progress
      if (progress.videoWatched) {
        await updateCourseProgress(req.user.id, chapter.course._id || chapter.course);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Video progress updated',
      progress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark material as downloaded
// @route   PUT /api/progress/material/:topicId
// @access  Private/Student
exports.markMaterialDownloaded = async (req, res) => {
  try {
    const { topicId } = req.params;

    const topic = await Topic.findById(topicId).populate('chapter');
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    // Get chapter with course
    const chapter = await Chapter.findById(topic.chapter).populate('course');
    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
    }

    let progress = await Progress.findOne({
      student: req.user.id,
      topic: topicId
    });

    if (!progress) {
      progress = await Progress.create({
        student: req.user.id,
        course: chapter.course._id || chapter.course,
        chapter: topic.chapter,
        topic: topicId,
        materialDownloaded: true
      });
    } else {
      progress.materialDownloaded = true;
      progress.lastAccessed = Date.now();
      await progress.save();
    }

    res.status(200).json({
      success: true,
      message: 'Material download tracked',
      progress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all students progress (Admin)
// @route   GET /api/progress/all
// @access  Private/Admin
exports.getAllStudentsProgress = async (req, res) => {
  try {
    const { studentId } = req.query;

    let query = {};
    if (studentId) {
      query.student = studentId;
    }

    const progress = await Progress.find(query)
      .populate('student', 'name email mobile')
      .populate('chapter', 'title')
      .populate('topic', 'title')
      .sort('-lastAccessed');

    res.status(200).json({
      success: true,
      count: progress.length,
      progress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
