const Topic = require('../models/Topic');
const Chapter = require('../models/Chapter');
const MCQ = require('../models/MCQ');

// @desc    Get all topics
// @route   GET /api/topics
// @access  Private
exports.getAllTopics = async (req, res) => {
  try {
    const { chapter } = req.query;
    let query = { isActive: true };

    if (chapter) {
      query.chapter = chapter;
    }

    const topics = await Topic.find(query)
      .populate('chapter', 'title')
      .populate('createdBy', 'name email')
      .sort('order');

    res.status(200).json({
      success: true,
      count: topics.length,
      topics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single topic
// @route   GET /api/topics/:id
// @access  Private
exports.getTopic = async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id)
      .populate('chapter', 'title description')
      .populate('createdBy', 'name email');

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    // Get MCQs count
    const mcqsCount = await MCQ.countDocuments({ topic: topic._id, isActive: true });

    res.status(200).json({
      success: true,
      topic: {
        ...topic.toObject(),
        mcqsCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create topic
// @route   POST /api/topics
// @access  Private/Admin
exports.createTopic = async (req, res) => {
  try {
    const { title, description, chapter, order, videoUrl, videoDuration, studyMaterialUrl, studyMaterialName } = req.body;

    // Verify chapter exists
    const chapterExists = await Chapter.findById(chapter);
    if (!chapterExists) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
    }

    const topic = await Topic.create({
      title,
      description,
      chapter,
      order,
      videoUrl,
      videoDuration,
      studyMaterialUrl,
      studyMaterialName,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Topic created successfully',
      topic
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update topic
// @route   PUT /api/topics/:id
// @access  Private/Admin
exports.updateTopic = async (req, res) => {
  try {
    const { title, description, chapter, order, videoUrl, videoDuration, studyMaterialUrl, studyMaterialName, isActive } = req.body;

    let topic = await Topic.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    // Verify chapter exists if updating
    if (chapter && chapter !== topic.chapter.toString()) {
      const chapterExists = await Chapter.findById(chapter);
      if (!chapterExists) {
        return res.status(404).json({
          success: false,
          message: 'Chapter not found'
        });
      }
    }

    topic.title = title || topic.title;
    topic.description = description || topic.description;
    topic.chapter = chapter || topic.chapter;
    topic.order = order !== undefined ? order : topic.order;
    topic.videoUrl = videoUrl !== undefined ? videoUrl : topic.videoUrl;
    topic.videoDuration = videoDuration !== undefined ? videoDuration : topic.videoDuration;
    topic.studyMaterialUrl = studyMaterialUrl !== undefined ? studyMaterialUrl : topic.studyMaterialUrl;
    topic.studyMaterialName = studyMaterialName !== undefined ? studyMaterialName : topic.studyMaterialName;
    topic.isActive = isActive !== undefined ? isActive : topic.isActive;

    await topic.save();

    res.status(200).json({
      success: true,
      message: 'Topic updated successfully',
      topic
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete topic
// @route   DELETE /api/topics/:id
// @access  Private/Admin
exports.deleteTopic = async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found'
      });
    }

    // Check if topic has MCQs
    const mcqsCount = await MCQ.countDocuments({ topic: topic._id });
    if (mcqsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete topic with existing MCQs. Delete MCQs first.'
      });
    }

    await topic.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Topic deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
