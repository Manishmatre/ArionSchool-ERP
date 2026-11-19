const MCQ = require('../models/MCQ');
const Topic = require('../models/Topic');
const Chapter = require('../models/Chapter');

// @desc    Get all MCQs
// @route   GET /api/mcqs
// @access  Private
exports.getAllMCQs = async (req, res) => {
  try {
    const { topic, chapter, difficulty } = req.query;
    let query = { isActive: true };

    if (topic) query.topic = topic;
    if (chapter) query.chapter = chapter;
    if (difficulty) query.difficulty = difficulty;

    const mcqs = await MCQ.find(query)
      .populate('topic', 'title')
      .populate('chapter', 'title')
      .populate('createdBy', 'name email')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: mcqs.length,
      mcqs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get MCQs for test (without correct answers)
// @route   GET /api/mcqs/test
// @access  Private/Student
exports.getMCQsForTest = async (req, res) => {
  try {
    const { topic, chapter, testType } = req.query;
    let query = { isActive: true };

    if (testType === 'topic' && topic) {
      query.topic = topic;
    } else if (testType === 'chapter' && chapter) {
      query.chapter = chapter;
    } else if (testType === 'full') {
      // Get all MCQs
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid test type or missing parameters'
      });
    }

    const mcqs = await MCQ.find(query)
      .select('-options.isCorrect -explanation')
      .populate('topic', 'title')
      .populate('chapter', 'title');

    // Shuffle MCQs
    const shuffledMCQs = mcqs.sort(() => Math.random() - 0.5);

    res.status(200).json({
      success: true,
      count: shuffledMCQs.length,
      mcqs: shuffledMCQs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single MCQ
// @route   GET /api/mcqs/:id
// @access  Private
exports.getMCQ = async (req, res) => {
  try {
    const mcq = await MCQ.findById(req.params.id)
      .populate('topic', 'title')
      .populate('chapter', 'title')
      .populate('createdBy', 'name email');

    if (!mcq) {
      return res.status(404).json({
        success: false,
        message: 'MCQ not found'
      });
    }

    res.status(200).json({
      success: true,
      mcq
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create MCQ (UPDATED - Handles embedded topic/chapter creation)
// @route   POST /api/mcqs
// @access  Private/Admin
exports.createMCQ = async (req, res) => {
  try {
    let { question, options, topic, chapter, course, explanation, difficulty, marks, topicData, moduleData } = req.body;

    console.log('Creating MCQ with:', { topic, chapter, course, topicData: !!topicData, moduleData: !!moduleData });

    let topicId = topic;
    let chapterId = chapter;
    let courseId = course;

    // If topicData is provided (embedded from curriculum), create the topic first
    if (topicData && !topic) {
      console.log('Creating topic from embedded data:', topicData);
      
      // First, ensure chapter (module) exists
      if (moduleData && !chapter && courseId) {
        const existingChapter = await Chapter.findOne({
          title: moduleData.title,
          course: courseId
        });
        
        if (existingChapter) {
          chapterId = existingChapter._id;
          console.log('Using existing chapter:', chapterId);
        } else {
          // Create chapter (module)
          const newChapter = await Chapter.create({
            title: moduleData.title,
            description: moduleData.description || '',
            course: courseId,
            order: moduleData.order || 1,
            createdBy: req.user.id
          });
          chapterId = newChapter._id;
          console.log('Created new chapter:', chapterId);
        }
      }

      // Now create topic
      if (chapterId) {
        const existingTopic = await Topic.findOne({
          title: topicData.title,
          chapter: chapterId
        });

        if (existingTopic) {
          topicId = existingTopic._id;
          console.log('Using existing topic:', topicId);
        } else {
          const newTopic = await Topic.create({
            title: topicData.title,
            description: topicData.description || '',
            chapter: chapterId,
            order: topicData.order || 1,
            createdBy: req.user.id
          });
          topicId = newTopic._id;
          console.log('Created new topic:', topicId);
        }
      }
    } else {
      // Topic/chapter are already ObjectIds, verify they exist
      console.log('Using provided ObjectIds:', { topicId, chapterId });
      const topicExists = await Topic.findById(topicId);
      const chapterExists = await Chapter.findById(chapterId).populate('course');

      if (!topicExists || !chapterExists) {
        return res.status(404).json({
          success: false,
          message: 'Topic or Chapter not found'
        });
      }

      // Get course if not provided
      if (!courseId && chapterExists) {
        courseId = chapterExists.course._id || chapterExists.course;
      }
    }

    // Final validation - ensure we have all required IDs
    if (!topicId || !chapterId || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: course, chapter, or topic'
      });
    }

    // Validate options
    if (!options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 options are required'
      });
    }

    const correctOptions = options.filter(opt => opt.isCorrect);
    if (correctOptions.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Exactly one correct answer is required'
      });
    }

    const mcq = await MCQ.create({
      question,
      options,
      topic: topicId,
      chapter: chapterId,
      course: courseId,
      explanation,
      difficulty,
      marks,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'MCQ created successfully',
      mcq
    });
  } catch (error) {
    console.error('Error creating MCQ:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update MCQ
// @route   PUT /api/mcqs/:id
// @access  Private/Admin
exports.updateMCQ = async (req, res) => {
  try {
    const { question, options, topic, chapter, explanation, difficulty, marks, isActive } = req.body;

    let mcq = await MCQ.findById(req.params.id);

    if (!mcq) {
      return res.status(404).json({
        success: false,
        message: 'MCQ not found'
      });
    }

    // If chapter is being updated, get the course from the new chapter
    let course = mcq.course;
    if (chapter && chapter !== mcq.chapter.toString()) {
      const chapterExists = await Chapter.findById(chapter).populate('course');
      if (chapterExists) {
        course = chapterExists.course._id || chapterExists.course;
      }
    }

    // Validate options if provided
    if (options) {
      if (options.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'At least 2 options are required'
        });
      }

      const correctOptions = options.filter(opt => opt.isCorrect);
      if (correctOptions.length !== 1) {
        return res.status(400).json({
          success: false,
          message: 'Exactly one correct answer is required'
        });
      }
    }

    mcq.question = question || mcq.question;
    mcq.options = options || mcq.options;
    mcq.topic = topic || mcq.topic;
    mcq.chapter = chapter || mcq.chapter;
    mcq.course = course;
    mcq.explanation = explanation !== undefined ? explanation : mcq.explanation;
    mcq.difficulty = difficulty || mcq.difficulty;
    mcq.marks = marks !== undefined ? marks : mcq.marks;
    mcq.isActive = isActive !== undefined ? isActive : mcq.isActive;

    await mcq.save();

    res.status(200).json({
      success: true,
      message: 'MCQ updated successfully',
      mcq
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete MCQ
// @route   DELETE /api/mcqs/:id
// @access  Private/Admin
exports.deleteMCQ = async (req, res) => {
  try {
    const mcq = await MCQ.findById(req.params.id);

    if (!mcq) {
      return res.status(404).json({
        success: false,
        message: 'MCQ not found'
      });
    }

    await mcq.deleteOne();

    res.status(200).json({
      success: true,
      message: 'MCQ deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Bulk create MCQs
// @route   POST /api/mcqs/bulk
// @access  Private/Admin
exports.bulkCreateMCQs = async (req, res) => {
  try {
    const { mcqs } = req.body;

    if (!mcqs || !Array.isArray(mcqs) || mcqs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of MCQs'
      });
    }

    // Add createdBy to each MCQ
    const mcqsWithCreator = mcqs.map(mcq => ({
      ...mcq,
      createdBy: req.user.id
    }));

    const createdMCQs = await MCQ.insertMany(mcqsWithCreator);

    res.status(201).json({
      success: true,
      message: `${createdMCQs.length} MCQs created successfully`,
      count: createdMCQs.length,
      mcqs: createdMCQs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
