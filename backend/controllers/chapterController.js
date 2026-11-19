const Chapter = require('../models/Chapter');
const Topic = require('../models/Topic');
const MCQ = require('../models/MCQ');
const { ensureCourseCurriculumSynced } = require('../utils/curriculumBridge');

// @desc    Get all chapters
// @route   GET /api/chapters
// @access  Private
exports.getAllChapters = async (req, res) => {
  try {
    const { course } = req.query;
    const query = { isActive: true };
    
    if (course) {
      query.course = course;
    }

    const chapters = await Chapter.find(query)
      .populate('createdBy', 'name email')
      .populate('course', 'title')
      .sort('order');

    res.status(200).json({
      success: true,
      count: chapters.length,
      chapters
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single chapter
// @route   GET /api/chapters/:id
// @access  Private
exports.getChapter = async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
    }

    // Get topics count
    const topicsCount = await Topic.countDocuments({ chapter: chapter._id, isActive: true });

    res.status(200).json({
      success: true,
      chapter: {
        ...chapter.toObject(),
        topicsCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create chapter
// @route   POST /api/chapters
// @access  Private/Admin
exports.createChapter = async (req, res) => {
  try {
    const { title, description, course, order } = req.body;

    const chapter = await Chapter.create({
      title,
      description,
      course,
      order,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Chapter created successfully',
      chapter
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update chapter
// @route   PUT /api/chapters/:id
// @access  Private/Admin
exports.updateChapter = async (req, res) => {
  try {
    const { title, description, course, order, isActive } = req.body;

    let chapter = await Chapter.findById(req.params.id);

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
    }

    chapter.title = title || chapter.title;
    chapter.description = description || chapter.description;
    chapter.course = course || chapter.course;
    chapter.order = order !== undefined ? order : chapter.order;
    chapter.isActive = isActive !== undefined ? isActive : chapter.isActive;

    await chapter.save();

    res.status(200).json({
      success: true,
      message: 'Chapter updated successfully',
      chapter
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Check chapter dependencies before deletion
// @route   GET /api/chapters/:id/check-dependencies
// @access  Private/Admin
exports.checkChapterDependencies = async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id);

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
    }

    // Check if chapter has topics
    const topicsCount = await Topic.countDocuments({ chapter: req.params.id });
    console.log(`Chapter ${req.params.id} has ${topicsCount} topics`);
    
    const associatedItems = [];
    if (topicsCount > 0) {
      // Count MCQs for these topics
      const topics = await Topic.find({ chapter: req.params.id });
      const topicIds = topics.map(topic => topic._id);
      console.log(`Topic IDs: ${topicIds}`);
      
      let mcqsCount = 0;
      if (topicIds.length > 0) {
        mcqsCount = await MCQ.countDocuments({ topic: { $in: topicIds } });
        console.log(`Found ${mcqsCount} MCQs for these topics`);
      }
      
      associatedItems.push({
        type: 'topics',
        count: topicsCount
      });
      
      if (mcqsCount > 0) {
        associatedItems.push({
          type: 'mcqs',
          count: mcqsCount
        });
      }
    }

    res.status(200).json({
      success: true,
      hasAssociated: associatedItems.length > 0,
      associatedItems,
      message: associatedItems.length > 0 
        ? `Chapter has ${associatedItems.reduce((sum, item) => sum + item.count, 0)} associated item(s)`
        : 'Chapter has no associated items'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete chapter
// @route   DELETE /api/chapters/:id
// @access  Private/Admin
exports.deleteChapter = async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id);

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found'
      });
    }

    // If deleteAssociated is true, delete all associated topics and MCQs
    if (req.body.deleteAssociated) {
      const topics = await Topic.find({ chapter: req.params.id });
      console.log(`Deleting ${topics.length} topics and their MCQs`);
      
      // Delete all MCQs associated with these topics
      for (const topic of topics) {
        const deletedMcqs = await MCQ.deleteMany({ topic: topic._id });
        console.log(`Deleted ${deletedMcqs.deletedCount} MCQs for topic ${topic._id}`);
      }
      
      // Delete all topics
      const deletedTopics = await Topic.deleteMany({ chapter: req.params.id });
      console.log(`Deleted ${deletedTopics.deletedCount} topics`);
    } else {
      // Check if chapter has associated items and prevent deletion if not explicitly requested
      const topicsCount = await Topic.countDocuments({ chapter: req.params.id });
      if (topicsCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete chapter. It has ${topicsCount} topic(s) associated with it. Use deleteAssociated flag to delete all.`
        });
      }
    }

    await chapter.deleteOne();

    res.status(200).json({
      success: true,
      message: req.body.deleteAssociated 
        ? 'Chapter and all associated items deleted successfully'
        : 'Chapter deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
