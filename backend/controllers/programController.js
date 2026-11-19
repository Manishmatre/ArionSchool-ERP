const Program = require('../models/Program');
const Course = require('../models/Course');
const Topic = require('../models/Topic');
const MCQ = require('../models/MCQ');

// @desc    Get all programs
// @route   GET /api/programs
// @access  Public
exports.getAllPrograms = async (req, res, next) => {
  try {
    const programs = await Program.find({ isActive: true })
      .sort('order name')
      .populate('courseCount');

    res.status(200).json({
      success: true,
      count: programs.length,
      data: programs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single program
// @route   GET /api/programs/:id
// @access  Public
exports.getProgram = async (req, res, next) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Get courses under this program
    const courses = await Course.find({ program: req.params.id, isActive: true });

    res.status(200).json({
      success: true,
      data: {
        ...program.toObject(),
        courses
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create program
// @route   POST /api/programs
// @access  Private (Admin)
exports.createProgram = async (req, res, next) => {
  try {
    req.body.createdBy = req.user._id;

    const program = await Program.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Program created successfully',
      data: program
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Program code already exists'
      });
    }
    next(error);
  }
};

// @desc    Update program
// @route   PUT /api/programs/:id
// @access  Private (Admin)
exports.updateProgram = async (req, res, next) => {
  try {
    let program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    program = await Program.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Program updated successfully',
      data: program
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check program dependencies before deletion
// @route   GET /api/programs/admin/:id/check-dependencies
// @access  Private (Super Admin)
exports.checkProgramDependencies = async (req, res, next) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Check if program has courses
    const coursesCount = await Course.countDocuments({ program: req.params.id });
    
    const associatedItems = [];
    if (coursesCount > 0) {
      associatedItems.push({
        type: 'courses',
        count: coursesCount
      });
    }

    res.status(200).json({
      success: true,
      hasAssociated: associatedItems.length > 0,
      associatedItems,
      message: associatedItems.length > 0 
        ? `Program has ${associatedItems.reduce((sum, item) => sum + item.count, 0)} associated item(s)`
        : 'Program has no associated items'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete program
// @route   DELETE /api/programs/admin/:id
// @access  Private (Super Admin)
exports.deleteProgram = async (req, res, next) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Check if program has courses
    const coursesCount = await Course.countDocuments({ program: req.params.id });
    
    if (coursesCount > 0 && !req.body.deleteAssociated) {
      // Return associated items information for frontend confirmation
      return res.status(200).json({
        success: true,
        hasAssociated: true,
        associatedItems: [
          {
            type: 'courses',
            count: coursesCount
          }
        ],
        message: `Program has ${coursesCount} course(s) associated with it.`
      });
    }

    // If deleteAssociated is true, delete all associated courses first
    if (req.body.deleteAssociated && coursesCount > 0) {
      const courses = await Course.find({ program: req.params.id });
      
      // Delete all topics associated with these courses
      for (const course of courses) {
        const topics = await Topic.find({ course: course._id });
        
        // Delete all MCQs associated with these topics
        for (const topic of topics) {
          await MCQ.deleteMany({ topic: topic._id });
        }
        
        // Delete all topics
        await Topic.deleteMany({ course: course._id });
      }
      
      // Delete all courses
      await Course.deleteMany({ program: req.params.id });
    }

    await program.deleteOne();

    res.status(200).json({
      success: true,
      message: req.body.deleteAssociated 
        ? `Program and ${coursesCount} associated course(s) deleted successfully`
        : 'Program deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get program stats
// @route   GET /api/programs/stats
// @access  Private (Admin)
exports.getProgramStats = async (req, res, next) => {
  try {
    const stats = await Program.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: 'program',
          as: 'courses'
        }
      },
      {
        $project: {
          name: 1,
          code: 1,
          courseCount: { $size: '$courses' },
          activeCourses: {
            $size: {
              $filter: {
                input: '$courses',
                as: 'course',
                cond: { $eq: ['$$course.isActive', true] }
              }
            }
          }
        }
      },
      { $sort: { courseCount: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};
