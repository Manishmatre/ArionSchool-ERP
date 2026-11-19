const Lesson = require('../models/Lesson');
const Module = require('../models/Module');
const Topic = require('../models/Topic');
const { ensureCourseCurriculumSynced } = require('../utils/curriculumBridge');

// @desc    Get lessons by module or course
// @route   GET /api/lessons
// @access  Public / Protected
exports.getLessons = async (req, res, next) => {
  try {
    const { module: moduleId, course: courseId, status, publicationStatus, search } = req.query;

    if (courseId) {
      await ensureCourseCurriculumSynced(courseId);
    } else if (moduleId) {
      const modDoc = await Module.findById(moduleId).select('course');
      if (modDoc?.course) {
        await ensureCourseCurriculumSynced(modDoc.course);
      }
    }

    const filter = {};

    if (moduleId) filter.module = moduleId;
    if (courseId) filter.course = courseId;
    if (status) filter.status = status;
    if (publicationStatus) filter.publicationStatus = publicationStatus;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const lessons = await Lesson.find(filter)
      .populate('module', 'title order')
      .populate('course', 'title courseCode')
      .sort({ order: 1, createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: lessons.length,
      data: lessons
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single lesson
// @route   GET /api/lessons/:id
// @access  Public / Protected
exports.getLesson = async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id)
      .populate('module', 'title order course')
      .populate('course', 'title courseCode')
      .lean();

    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    res.status(200).json({
      success: true,
      data: lesson
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new lesson
// @route   POST /api/lessons
// @access  Private (Admin / Super Admin)
exports.createLesson = async (req, res, next) => {
  try {
    const {
      title,
      description,
      module: moduleId,
      course: courseId,
      contentType,
      duration,
      order,
      thumbnail,
      videoUrl,
      videoProvider,
      videoThumbnail,
      documentUrl,
      documentName,
      resourceUrl,
      resourceTitle,
      resourceDescription,
      textContent,
      mixedContent,
      isFreePreview,
      isMandatory,
      status,
      publicationStatus
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Lesson title is required' });
    }
    if (!moduleId) {
      return res.status(400).json({ success: false, message: 'Module association is required' });
    }

    const moduleDoc = await Module.findById(moduleId);
    if (!moduleDoc) {
      return res.status(404).json({ success: false, message: 'Parent module not found' });
    }

    const assignedCourse = courseId || moduleDoc.course;

    // Determine order
    let assignedOrder = order;
    if (assignedOrder === undefined || assignedOrder === null || assignedOrder === '') {
      const highest = await Lesson.findOne({ module: moduleId }).sort('-order').select('order').lean();
      assignedOrder = highest?.order ? highest.order + 1 : 1;
    }

    const newLesson = await Lesson.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      course: assignedCourse,
      module: moduleId,
      contentType: contentType || 'video',
      duration: Number(duration) || 0,
      order: Number(assignedOrder),
      thumbnail: thumbnail || '',
      videoUrl: videoUrl || '',
      videoProvider: videoProvider || 'custom',
      videoThumbnail: videoThumbnail || '',
      documentUrl: documentUrl || '',
      documentName: documentName || '',
      resourceUrl: resourceUrl || '',
      resourceTitle: resourceTitle || '',
      resourceDescription: resourceDescription || '',
      textContent: textContent || '',
      mixedContent: mixedContent || {},
      isFreePreview: Boolean(isFreePreview),
      isMandatory: isMandatory !== undefined ? Boolean(isMandatory) : true,
      status: status || 'active',
      publicationStatus: publicationStatus || 'published',
      createdBy: req.user?._id
    });

    // Mirror to Topic for backward compatibility
    try {
      await Topic.create({
        _id: newLesson._id,
        title: newLesson.title,
        description: newLesson.description || 'Lesson description',
        chapter: newLesson.module,
        order: newLesson.order,
        videoUrl: newLesson.videoUrl || '',
        duration: newLesson.duration || 0,
        studyMaterialUrl: newLesson.documentUrl || '',
        studyMaterialName: newLesson.documentName || '',
        isActive: newLesson.status === 'active',
        createdBy: req.user?._id
      });
    } catch (e) { }

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: newLesson
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a lesson
// @route   PUT /api/lessons/:id
// @access  Private (Admin / Super Admin)
exports.updateLesson = async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    const {
      title,
      description,
      contentType,
      duration,
      order,
      thumbnail,
      videoUrl,
      videoProvider,
      videoThumbnail,
      documentUrl,
      documentName,
      resourceUrl,
      resourceTitle,
      resourceDescription,
      textContent,
      mixedContent,
      isFreePreview,
      isMandatory,
      status,
      publicationStatus
    } = req.body;

    if (title !== undefined) lesson.title = title.trim();
    if (description !== undefined) lesson.description = description.trim();
    if (contentType !== undefined) lesson.contentType = contentType;
    if (duration !== undefined) lesson.duration = Number(duration) || 0;
    if (order !== undefined) lesson.order = Number(order);
    if (thumbnail !== undefined) lesson.thumbnail = thumbnail;
    if (videoUrl !== undefined) lesson.videoUrl = videoUrl;
    if (videoProvider !== undefined) lesson.videoProvider = videoProvider;
    if (videoThumbnail !== undefined) lesson.videoThumbnail = videoThumbnail;
    if (documentUrl !== undefined) lesson.documentUrl = documentUrl;
    if (documentName !== undefined) lesson.documentName = documentName;
    if (resourceUrl !== undefined) lesson.resourceUrl = resourceUrl;
    if (resourceTitle !== undefined) lesson.resourceTitle = resourceTitle;
    if (resourceDescription !== undefined) lesson.resourceDescription = resourceDescription;
    if (textContent !== undefined) lesson.textContent = textContent;
    if (mixedContent !== undefined) lesson.mixedContent = mixedContent;
    if (isFreePreview !== undefined) lesson.isFreePreview = Boolean(isFreePreview);
    if (isMandatory !== undefined) lesson.isMandatory = Boolean(isMandatory);
    if (status !== undefined) lesson.status = status;
    if (publicationStatus !== undefined) lesson.publicationStatus = publicationStatus;

    await lesson.save();

    // Mirror updates to Topic
    try {
      await Topic.findByIdAndUpdate(lesson._id, {
        title: lesson.title,
        description: lesson.description || 'Lesson description',
        chapter: lesson.module,
        order: lesson.order,
        videoUrl: lesson.videoUrl || '',
        duration: lesson.duration || 0,
        studyMaterialUrl: lesson.documentUrl || '',
        studyMaterialName: lesson.documentName || '',
        isActive: lesson.status === 'active'
      });
    } catch (e) { }

    res.status(200).json({
      success: true,
      message: 'Lesson updated successfully',
      data: lesson
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a lesson
// @route   DELETE /api/lessons/:id
// @access  Private (Admin / Super Admin)
exports.deleteLesson = async (req, res, next) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    await Topic.findByIdAndDelete(lesson._id);
    await lesson.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Move lesson to another module
// @route   PUT /api/lessons/:id/move
// @access  Private (Admin / Super Admin)
exports.moveLesson = async (req, res, next) => {
  try {
    const { targetModuleId } = req.body;
    if (!targetModuleId) {
      return res.status(400).json({ success: false, message: 'Target module ID is required' });
    }

    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    const targetModule = await Module.findById(targetModuleId);
    if (!targetModule) {
      return res.status(404).json({ success: false, message: 'Target module not found' });
    }

    // Next order in target module
    const highest = await Lesson.findOne({ module: targetModuleId }).sort('-order').select('order').lean();
    const nextOrder = highest?.order ? highest.order + 1 : 1;

    lesson.module = targetModuleId;
    lesson.course = targetModule.course;
    lesson.order = nextOrder;
    await lesson.save();

    // Mirror to Topic
    try {
      await Topic.findByIdAndUpdate(lesson._id, {
        chapter: targetModuleId,
        order: nextOrder
      });
    } catch (e) { }

    res.status(200).json({
      success: true,
      message: `Lesson moved to ${targetModule.title} successfully`,
      data: lesson
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Duplicate lesson
// @route   POST /api/lessons/:id/duplicate
// @access  Private (Admin / Super Admin)
exports.duplicateLesson = async (req, res, next) => {
  try {
    const sourceLesson = await Lesson.findById(req.params.id).lean();
    if (!sourceLesson) {
      return res.status(404).json({ success: false, message: 'Source lesson not found' });
    }

    const highest = await Lesson.findOne({ module: sourceLesson.module }).sort('-order').select('order').lean();
    const nextOrder = highest?.order ? highest.order + 1 : 1;

    const { _id, createdAt, updatedAt, __v, ...lessonData } = sourceLesson;

    const newLesson = await Lesson.create({
      ...lessonData,
      title: `${sourceLesson.title} (Copy)`,
      order: nextOrder,
      publicationStatus: 'draft',
      createdBy: req.user?._id
    });

    try {
      await Topic.create({
        _id: newLesson._id,
        title: newLesson.title,
        description: newLesson.description || 'Lesson description',
        chapter: newLesson.module,
        order: newLesson.order,
        videoUrl: newLesson.videoUrl || '',
        duration: newLesson.duration || 0,
        studyMaterialUrl: newLesson.documentUrl || '',
        studyMaterialName: newLesson.documentName || '',
        isActive: newLesson.status === 'active',
        createdBy: req.user?._id
      });
    } catch (e) { }

    res.status(201).json({
      success: true,
      message: 'Lesson duplicated successfully',
      data: newLesson
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder lessons in a module
// @route   PUT /api/lessons/reorder
// @access  Private (Admin / Super Admin)
exports.reorderLessons = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: 'orderedIds must be an array of lesson IDs' });
    }

    const updates = orderedIds.map((id, index) =>
      Lesson.findByIdAndUpdate(id, { order: index + 1 })
    );
    const topicUpdates = orderedIds.map((id, index) =>
      Topic.findByIdAndUpdate(id, { order: index + 1 })
    );

    await Promise.all([...updates, ...topicUpdates]);

    res.status(200).json({
      success: true,
      message: 'Lessons reordered successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload media for lesson (video, document, learning resource)
// @route   POST /api/lessons/upload-media
// @access  Private (Admin / Super Admin)
exports.uploadLessonMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a file to upload' });
    }

    const fileUrl = req.file.url || req.file.path || req.file.secure_url;
    if (!fileUrl) {
      return res.status(500).json({ success: false, message: 'Failed to upload media file' });
    }

    res.status(200).json({
      success: true,
      message: 'Media uploaded successfully',
      data: {
        url: fileUrl,
        name: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    next(error);
  }
};

