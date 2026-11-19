const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const Chapter = require('../models/Chapter');
const Topic = require('../models/Topic');
const Course = require('../models/Course');
const { ensureCourseCurriculumSynced, syncAllCoursesCurriculum } = require('../utils/curriculumBridge');

// @desc    Get all modules for a course
// @route   GET /api/modules
// @access  Public / Protected
exports.getModules = async (req, res, next) => {
  try {
    const { course, status, publicationStatus, search } = req.query;

    // Auto-sync legacy chapters/topics or Course.curriculum if needed
    if (course) {
      await ensureCourseCurriculumSynced(course);
    } else {
      const existingCount = await Module.estimatedDocumentCount();
      if (existingCount === 0) {
        await syncAllCoursesCurriculum();
      }
    }

    const filter = {};

    if (course) {
      filter.course = course;
    }
    if (status) {
      filter.status = status;
    }
    if (publicationStatus) {
      filter.publicationStatus = publicationStatus;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const modules = await Module.find(filter)
      .populate('course', 'title courseCode')
      .sort({ order: 1, createdAt: 1 })
      .lean();

    // Attach lessons and lesson stats to each module
    const moduleIds = modules.map(m => m._id);
    const lessons = await Lesson.find({ module: { $in: moduleIds } })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const lessonsByModule = {};
    for (const l of lessons) {
      const mid = String(l.module);
      if (!lessonsByModule[mid]) lessonsByModule[mid] = [];
      lessonsByModule[mid].push(l);
    }

    const enrichedModules = modules.map(m => {
      const modLessons = lessonsByModule[String(m._id)] || [];
      const totalLessons = modLessons.length;
      const publishedLessons = modLessons.filter(l => l.publicationStatus !== 'draft').length;
      const totalDurationMinutes = modLessons.reduce((sum, l) => sum + (Number(l.duration) || 0), 0);

      return {
        ...m,
        lessons: modLessons,
        totalLessons,
        publishedLessons,
        totalDurationMinutes
      };
    });

    res.status(200).json({
      success: true,
      count: enrichedModules.length,
      data: enrichedModules
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single module
// @route   GET /api/modules/:id
// @access  Public / Protected
exports.getModule = async (req, res, next) => {
  try {
    const moduleItem = await Module.findById(req.params.id)
      .populate('course', 'title courseCode')
      .lean();

    if (!moduleItem) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    const lessons = await Lesson.find({ module: moduleItem._id })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        ...moduleItem,
        lessons
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new module
// @route   POST /api/modules
// @access  Private (Admin / Super Admin)
exports.createModule = async (req, res, next) => {
  try {
    const {
      title,
      description,
      thumbnail,
      course,
      duration,
      durationUnit,
      order,
      status,
      publicationStatus
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Module title is required' });
    }
    if (!course) {
      return res.status(400).json({ success: false, message: 'Course is required' });
    }

    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Determine order
    let assignedOrder = order;
    if (assignedOrder === undefined || assignedOrder === null || assignedOrder === '') {
      const highest = await Module.findOne({ course }).sort('-order').select('order').lean();
      assignedOrder = highest?.order ? highest.order + 1 : 1;
    }

    const newModule = await Module.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      thumbnail: thumbnail || '',
      course,
      duration: Number(duration) || 0,
      durationUnit: durationUnit || 'hours',
      order: Number(assignedOrder),
      status: status || 'active',
      publicationStatus: publicationStatus || 'published',
      createdBy: req.user?._id
    });

    // Mirror to Chapter collection for legacy safety
    try {
      await Chapter.create({
        _id: newModule._id,
        title: newModule.title,
        description: newModule.description || 'Module description',
        course: newModule.course,
        order: newModule.order,
        isActive: newModule.status === 'active',
        createdBy: req.user?._id
      });
    } catch (e) {
      // Ignored if duplicate or already synced
    }

    res.status(201).json({
      success: true,
      message: 'Module created successfully',
      data: newModule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a module
// @route   PUT /api/modules/:id
// @access  Private (Admin / Super Admin)
exports.updateModule = async (req, res, next) => {
  try {
    const moduleItem = await Module.findById(req.params.id);
    if (!moduleItem) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    const {
      title,
      description,
      thumbnail,
      duration,
      durationUnit,
      order,
      status,
      publicationStatus
    } = req.body;

    if (title !== undefined) moduleItem.title = title.trim();
    if (description !== undefined) moduleItem.description = description.trim();
    if (thumbnail !== undefined) moduleItem.thumbnail = thumbnail;
    if (duration !== undefined) moduleItem.duration = Number(duration) || 0;
    if (durationUnit !== undefined) moduleItem.durationUnit = durationUnit;
    if (order !== undefined) moduleItem.order = Number(order);
    if (status !== undefined) moduleItem.status = status;
    if (publicationStatus !== undefined) moduleItem.publicationStatus = publicationStatus;

    await moduleItem.save();

    // Mirror updates to Chapter
    try {
      await Chapter.findByIdAndUpdate(moduleItem._id, {
        title: moduleItem.title,
        description: moduleItem.description || 'Module description',
        order: moduleItem.order,
        isActive: moduleItem.status === 'active'
      });
    } catch (e) { }

    res.status(200).json({
      success: true,
      message: 'Module updated successfully',
      data: moduleItem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a module and its lessons
// @route   DELETE /api/modules/:id
// @access  Private (Admin / Super Admin)
exports.deleteModule = async (req, res, next) => {
  try {
    const moduleItem = await Module.findById(req.params.id);
    if (!moduleItem) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    // Delete associated lessons
    await Lesson.deleteMany({ module: moduleItem._id });
    await Topic.deleteMany({ chapter: moduleItem._id });

    // Delete legacy chapter
    await Chapter.findByIdAndDelete(moduleItem._id);

    // Delete module
    await moduleItem.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Module and associated lessons deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder modules in a course
// @route   PUT /api/modules/reorder
// @access  Private (Admin / Super Admin)
exports.reorderModules = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: 'orderedIds must be an array of module IDs' });
    }

    const updates = orderedIds.map((id, index) =>
      Module.findByIdAndUpdate(id, { order: index + 1 })
    );
    const chapterUpdates = orderedIds.map((id, index) =>
      Chapter.findByIdAndUpdate(id, { order: index + 1 })
    );

    await Promise.all([...updates, ...chapterUpdates]);

    res.status(200).json({
      success: true,
      message: 'Modules reordered successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Duplicate module and all its lessons
// @route   POST /api/modules/:id/duplicate
// @access  Private (Admin / Super Admin)
exports.duplicateModule = async (req, res, next) => {
  try {
    const sourceModule = await Module.findById(req.params.id).lean();
    if (!sourceModule) {
      return res.status(404).json({ success: false, message: 'Source module not found' });
    }

    const highest = await Module.findOne({ course: sourceModule.course }).sort('-order').select('order').lean();
    const nextOrder = highest?.order ? highest.order + 1 : 1;

    const newModule = await Module.create({
      title: `${sourceModule.title} (Copy)`,
      description: sourceModule.description,
      thumbnail: sourceModule.thumbnail,
      course: sourceModule.course,
      duration: sourceModule.duration,
      durationUnit: sourceModule.durationUnit,
      order: nextOrder,
      status: sourceModule.status,
      publicationStatus: 'draft',
      createdBy: req.user?._id
    });

    // Copy all lessons from source module
    const sourceLessons = await Lesson.find({ module: sourceModule._id }).sort('order').lean();
    for (const sl of sourceLessons) {
      const { _id, createdAt, updatedAt, __v, ...lessonData } = sl;
      await Lesson.create({
        ...lessonData,
        title: `${lessonData.title}`,
        module: newModule._id,
        course: newModule.course,
        publicationStatus: 'draft',
        createdBy: req.user?._id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Module duplicated successfully with all lessons',
      data: newModule
    });
  } catch (error) {
    next(error);
  }
};

