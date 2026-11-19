const Batch = require('../models/Batch');
const { isSchoolTenantUser } = require('../utils/tenantAccess');
const Course = require('../models/Course');
const Student = require('../models/Student');
const { getIO } = require('../utils/socket');

// @desc    Get all batches
// @route   GET /api/batches
// @access  Private
exports.getAllBatches = async (req, res, next) => {
  try {
    let query = {};

    // Filter by school for franchise admin
    if (isSchoolTenantUser(req.user)) {
      query.franchise = req.user.franchise;
    }

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by course
    if (req.query.course) {
      query.course = req.query.course;
    }

    // Filter by trainer
    if (req.query.trainer) {
      query.trainer = req.query.trainer;
    }

    const batches = await Batch.find(query)
      .populate('course', 'title courseCode durationValue durationType')
      .populate('trainer', 'personalInfo')
      .populate('franchise', 'name code')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: batches.length,
      data: batches
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single batch
// @route   GET /api/batches/:id
// @access  Private
exports.getBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('course')
      .populate('trainer', 'personalInfo contactInfo')
      .populate('assistantTrainers', 'personalInfo')
      .populate('students.student', 'studentId personalInfo contactInfo')
      .populate('franchise', 'name code');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    res.status(200).json({
      success: true,
      data: batch
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create batch
// @route   POST /api/batches
// @access  Private (Admin)
exports.createBatch = async (req, res, next) => {
  try {
    // Verify course exists
    const course = await Course.findById(req.body.course);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    req.body.createdBy = req.user._id;

    // Set school for franchise admin
    if (isSchoolTenantUser(req.user)) {
      req.body.franchise = req.user.franchise;
    }

    const batch = await Batch.create(req.body);

    // Emit real-time batch update
    const io = getIO();
    const populatedBatch = await Batch.findById(batch._id)
      .populate('course', 'title')
      .populate('trainer', 'personalInfo.firstName personalInfo.lastName')
      .populate('franchise', 'name');
    
    io.emit('batch-created', {
      message: `New batch "${populatedBatch.name}" has been created`,
      batch: populatedBatch,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: batch
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Batch code already exists'
      });
    }
    next(error);
  }
};

// @desc    Update batch
// @route   PUT /api/batches/:id
// @access  Private (Admin)
exports.updateBatch = async (req, res, next) => {
  try {
    let batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    batch = await Batch.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Batch updated successfully',
      data: batch
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete batch
// @route   DELETE /api/batches/:id
// @access  Private (Admin)
exports.deleteBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Check if batch has active students
    const activeStudents = batch.students.filter(s => s.status === 'active').length;
    
    if (activeStudents > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete batch. It has ${activeStudents} active student(s).`
      });
    }

    await batch.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Batch deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add student to batch
// @route   POST /api/batches/:id/students
// @access  Private (Admin)
exports.addStudentToBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Check capacity
    if (batch.currentStrength >= batch.maxCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Batch is full'
      });
    }

    // Check if student already in batch
    const studentExists = batch.students.some(
      s => s.student.toString() === req.body.studentId
    );

    if (studentExists) {
      return res.status(400).json({
        success: false,
        message: 'Student already enrolled in this batch'
      });
    }

    // Add student
    batch.students.push({
      student: req.body.studentId,
      enrollmentDate: new Date(),
      status: 'active'
    });

    await batch.save();

    res.status(200).json({
      success: true,
      message: 'Student added to batch successfully',
      data: batch
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove student from batch
// @route   DELETE /api/batches/:id/students/:studentId
// @access  Private (Admin)
exports.removeStudentFromBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Remove student
    batch.students = batch.students.filter(
      s => s.student.toString() !== req.params.studentId
    );

    await batch.save();

    res.status(200).json({
      success: true,
      message: 'Student removed from batch successfully',
      data: batch
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get batch stats
// @route   GET /api/batches/stats
// @access  Private (Admin)
exports.getBatchStats = async (req, res, next) => {
  try {
    let matchQuery = {};
    
    if (isSchoolTenantUser(req.user)) {
      matchQuery.franchise = req.user.franchise;
    }

    const stats = await Batch.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalStudents: { $sum: '$currentStrength' }
        }
      }
    ]);

    const totalBatches = await Batch.countDocuments(matchQuery);
    const activeBatches = await Batch.countDocuments({ ...matchQuery, status: 'ongoing' });

    res.status(200).json({
      success: true,
      data: {
        totalBatches,
        activeBatches,
        statusWise: stats
      }
    });
  } catch (error) {
    next(error);
  }
};
