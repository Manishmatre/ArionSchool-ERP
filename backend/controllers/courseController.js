const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Chapter = require('../models/Chapter');
const { ensureCourseCurriculumSynced } = require('../utils/curriculumBridge');
const Topic = require('../models/Topic');
const User = require('../models/User'); // Needed for querying students by school
const SeatRequest = require('../models/SeatRequest');
const Franchise = require('../models/SchoolCampus');
const MCQ = require('../models/MCQ');
const { getIO } = require('../utils/socket');
const { getUploadedUrl } = require('../utils/cloudinary');
const { getOrCreateFeePolicyForCourse } = require('../utils/transactionService');
const { getFranchiseStudentUserIds, countFranchiseFilledSeats } = require('../utils/seatUtils');

// @desc    Allocate seats to a school for a specific course
// @route   POST /api/courses/:id/allocate-seats
// @access  Private/SuperAdmin
exports.allocateFranchiseSeats = async (req, res, next) => {
  try {
    const { franchiseId, seats } = req.body;
    const courseId = req.params.id;

    if (!franchiseId || seats === undefined) {
      return res.status(400).json({ success: false, message: 'School ID and seats are required.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const seatAllocationIndex = course.franchiseSeats.findIndex(fs => fs.franchise.toString() === franchiseId);

    if (seatAllocationIndex > -1) {
      // Update existing allocation
      course.franchiseSeats[seatAllocationIndex].seats = seats;
    } else {
      // Add new allocation
      course.franchiseSeats.push({ franchise: franchiseId, seats });
    }

    await course.save();

    // Create a corresponding seat request record for tracking
    await SeatRequest.create({
      franchise: franchiseId,
      course: courseId,
      requestedSeats: seats,
      status: 'approved',
      requestedBy: req.user.id, // The super admin is the requester in this case
      reviewedBy: req.user.id, // and also the reviewer
      reviewedAt: Date.now(),
      requestedAt: Date.now()
    });

    res.status(200).json({
      success: true,
      message: `Successfully allocated ${seats} seats to school for this course.`,
      data: course
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get all courses with seat info for the logged-in school
// @route   GET /api/courses/school
// @access  Private/FranchiseAdmin
exports.getCoursesForFranchise = async (req, res, next) => {
  try {
    const franchiseId = req.user.franchise;
    console.log('School Admin requesting courses for school:', franchiseId);
    
    if (!franchiseId) {
      return res.status(400).json({ success: false, message: 'User is not associated with a school.' });
    }

    const franchise = await Franchise.findById(franchiseId).populate('plan');

    if (!franchise) {
      return res.status(404).json({ success: false, message: 'School not found.' });
    }

    console.log('School found:', school.name, 'Plan:', franchise.plan?.name);

    let accessibleCourseIds = [];

    // Add courses from the school's active plan
    if (franchise.plan && franchise.plan.isActive) {
      accessibleCourseIds.push(...franchise.plan.courseAccess.map(id => id.toString()));
      console.log('Plan course access:', school.plan.courseAccess.length);
    }

    // Add individually assigned additional courses
    if (franchise.additionalCourses && franchise.additionalCourses.length > 0) {
      accessibleCourseIds.push(...franchise.additionalCourses.map(id => id.toString()));
      console.log('Additional courses:', school.additionalCourses.length);
    }

    // Remove duplicates
    const uniqueCourseIds = [...new Set(accessibleCourseIds)];
    console.log('Total unique course IDs:', uniqueCourseIds.length);

    let courseQuery = { isActive: true, _id: { $in: uniqueCourseIds } };

    console.log('Final course query:', courseQuery);

    const courses = await Course.find(courseQuery)
      .populate('primaryTrainer', 'personalInfo.firstName personalInfo.lastName')
      .lean();

    console.log('Courses found:', courses.length);

    const franchiseStudentIds = await getFranchiseStudentUserIds(franchiseId);

    for (const course of courses) {
      if (Array.isArray(course.franchiseSeats)) {
        const seatAllocation = course.franchiseSeats.find(fs => fs.franchise && fs.franchise.toString() === franchiseId.toString());
        course.allocatedSeats = seatAllocation ? seatAllocation.seats : 0;
      } else {
        course.allocatedSeats = 0;
      }

      const filledSeats = await countFranchiseFilledSeats(course._id, franchiseId, franchiseStudentIds);
      course.filledSeats = filledSeats;
      course.availableSeats = Math.max(0, course.allocatedSeats - filledSeats);

      // Also, calculate total enrollments for the 'STUDENTS' column
      const totalEnrolled = await Enrollment.countDocuments({ course: course._id });
      course.totalEnrolled = totalEnrolled;
    }

    console.log('Final courses data:', courses.map(c => ({
      title: c.title,
      allocatedSeats: c.allocatedSeats,
      filledSeats: c.filledSeats,
      available: c.allocatedSeats - c.filledSeats
    })));

    res.status(200).json({ success: true, data: courses });

  } catch (error) {
    next(error);
  }
};

// @desc    Get courses for a specific school (for super admin)
// @route   GET /api/courses/school/:franchiseId
// @access  Private (Super Admin)
exports.getCoursesForSpecificFranchise = async (req, res, next) => {
  try {
    const { franchiseId } = req.params;
    
    console.log('Super Admin requesting courses for school:', franchiseId);

    const franchise = await Franchise.findById(franchiseId).populate('plan');

    if (!franchise) {
      return res.status(404).json({ success: false, message: 'School not found.' });
    }

    console.log('School found:', school.name, 'Plan:', franchise.plan?.name);

    let accessibleCourseIds = [];

    // Add courses from the school's active plan
    if (franchise.plan && franchise.plan.isActive) {
      accessibleCourseIds.push(...franchise.plan.courseAccess.map(id => id.toString()));
      console.log('Plan course access:', school.plan.courseAccess.length);
    }

    // Add individually assigned additional courses
    if (franchise.additionalCourses && franchise.additionalCourses.length > 0) {
      accessibleCourseIds.push(...franchise.additionalCourses.map(id => id.toString()));
      console.log('Additional courses:', school.additionalCourses.length);
    }

    // Remove duplicates
    const uniqueCourseIds = [...new Set(accessibleCourseIds)];
    console.log('Total unique course IDs:', uniqueCourseIds.length);

    let courseQuery = { isActive: true, _id: { $in: uniqueCourseIds } };

    const courses = await Course.find(courseQuery)
      .populate('primaryTrainer', 'personalInfo.firstName personalInfo.lastName')
      .lean();

    const franchiseStudentIds = await getFranchiseStudentUserIds(franchiseId);

    for (const course of courses) {
      const seatAllocation = Array.isArray(course.franchiseSeats)
        ? course.franchiseSeats.find(fs => fs.franchise && fs.franchise.toString() === franchiseId.toString())
        : null;

      course.allocatedSeats = seatAllocation ? seatAllocation.seats : 0;

      const filledSeats = await countFranchiseFilledSeats(course._id, franchiseId, franchiseStudentIds);
      course.filledSeats = filledSeats;
      course.availableSeats = Math.max(0, course.allocatedSeats - filledSeats);

      const totalEnrolled = await Enrollment.countDocuments({ course: course._id });
      course.totalEnrolled = totalEnrolled;
    }

    res.status(200).json({ success: true, data: courses });

  } catch (error) {
    next(error);
  }
};

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
exports.getAllCourses = async (req, res) => {
  try {
    const { category, level, search } = req.query;
    let query = { isActive: true };

    if (category) query.category = category;
    if (level) query.level = level;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const courseDocs = await Course.find(query)
      .populate('program', 'name code')
      .populate('primaryTrainer', 'personalInfo.firstName personalInfo.lastName')
      .populate('trainers', 'personalInfo.firstName personalInfo.lastName')
      .sort({ order: 1, createdAt: -1 });

    const courses = await Promise.all(courseDocs.map(async (course) => {
      const totalEnrolled = await Enrollment.countDocuments({ course: course._id });
      const courseObject = course.toObject();
      courseObject.totalEnrolled = totalEnrolled;
      // Manually ensure price and isPaid are set correctly
      courseObject.isPaid = course.price != null && parseFloat(course.price) > 0;
      return courseObject;
    }));

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
exports.getCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    await ensureCourseCurriculumSynced(courseId);
    const course = await Course.findById(courseId)
      .populate('program', 'name code color')
      .populate('primaryTrainer', 'personalInfo.firstName personalInfo.lastName personalInfo.email')
      .populate('trainers', 'personalInfo.firstName personalInfo.lastName');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get chapters and calculate total duration
    const chapters = await Chapter.find({ course: course._id, isActive: true });
    const chapterIds = chapters.map(c => c._id);
    const topics = await Topic.find({ chapter: { $in: chapterIds } });
    const totalDuration = topics.reduce((acc, topic) => acc + (topic.duration || 0), 0);

    const chaptersCount = chapters.length;

    res.status(200).json({
      success: true,
      data: {
        ...course.toObject(),
        chaptersCount,
        totalDuration, // in minutes
        instructor: course.primaryTrainer ? {
          name: `${course.primaryTrainer.personalInfo?.firstName || ''} ${course.primaryTrainer.personalInfo?.lastName || ''}`.trim(),
          email: course.primaryTrainer.personalInfo?.email || ''
        } : (course.trainerName ? { name: course.trainerName } : course.instructor)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create course
// @route   POST /api/courses
// @access  Private/Admin
exports.createCourse = async (req, res) => {
  try {
    // Parse JSON fields if they're strings
    const courseData = {
      ...req.body
    };
    
    console.log('Received courseData:', {
      curriculum: typeof courseData.curriculum,
      curriculumValue: courseData.curriculum
    });
    
    // Handle typable trainerName or primaryTrainer
    const incomingTrainer = courseData.trainerName || courseData.primaryTrainer;
    if (incomingTrainer) {
      if (mongoose.Types.ObjectId.isValid(incomingTrainer) && String(new mongoose.Types.ObjectId(incomingTrainer)) === String(incomingTrainer)) {
        courseData.primaryTrainer = incomingTrainer;
      } else {
        courseData.primaryTrainer = null;
        courseData.trainerName = String(incomingTrainer).trim();
        if (!courseData.instructor) courseData.instructor = {};
        if (typeof courseData.instructor === 'object') {
          courseData.instructor.name = String(incomingTrainer).trim();
        }
      }
    } else if (!courseData.primaryTrainer && req.user) {
      courseData.primaryTrainer = req.user.id;
    }

    if (courseData.durationValue && !courseData.duration) {
      const unit = courseData.durationType ? (courseData.durationType.charAt(0).toUpperCase() + courseData.durationType.slice(1)) : 'Months';
      courseData.duration = `${courseData.durationValue} ${unit}`;
    }

    // Parse curriculum if it's a JSON string
    if (typeof courseData.curriculum === 'string') {
      try {
        courseData.curriculum = JSON.parse(courseData.curriculum);
        // Filter out empty curriculum items
        courseData.curriculum = courseData.curriculum.filter(item => item.title && item.title.trim());
      } catch (e) {
        console.error('Error parsing curriculum:', e);
        courseData.curriculum = [];
      }
    }
    
    // Ensure curriculum is an array
    if (!Array.isArray(courseData.curriculum)) {
      courseData.curriculum = [];
    }

    // Parse prerequisites if it's a JSON string
    if (typeof courseData.prerequisites === 'string') {
      try {
        courseData.prerequisites = JSON.parse(courseData.prerequisites);
      } catch (e) {
        console.error('Error parsing prerequisites:', e);
        courseData.prerequisites = [];
      }
    }
    
    // Ensure prerequisites is an array
    if (!Array.isArray(courseData.prerequisites)) {
      courseData.prerequisites = [];
    }

    // Parse learningOutcomes if it's a JSON string
    if (typeof courseData.learningOutcomes === 'string') {
      try {
        courseData.learningOutcomes = JSON.parse(courseData.learningOutcomes);
      } catch (e) {
        console.error('Error parsing learningOutcomes:', e);
        courseData.learningOutcomes = [];
      }
    }
    
    // Ensure learningOutcomes is an array
    if (!Array.isArray(courseData.learningOutcomes)) {
      courseData.learningOutcomes = [];
    }

    // Parse tags if it's a comma-separated string
    if (typeof courseData.tags === 'string' && courseData.tags) {
      courseData.tags = courseData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    // Parse franchiseSeats if it's a JSON string
    if (typeof courseData.franchiseSeats === 'string' && courseData.franchiseSeats) {
      try {
        courseData.franchiseSeats = JSON.parse(courseData.franchiseSeats);
      } catch (e) {
        console.error('Error parsing franchiseSeats:', e);
        courseData.franchiseSeats = [];
      }
    }

    // Ensure franchiseSeats is an array
    if (!Array.isArray(courseData.franchiseSeats)) {
      courseData.franchiseSeats = [];
    }

    // Parse website-specific arrays & objects
    if (typeof courseData.highlights === 'string') {
      try {
        courseData.highlights = JSON.parse(courseData.highlights);
      } catch (e) {
        courseData.highlights = courseData.highlights ? [courseData.highlights] : [];
      }
    }
    if (!Array.isArray(courseData.highlights)) courseData.highlights = [];

    if (typeof courseData.requirements === 'string') {
      try {
        courseData.requirements = JSON.parse(courseData.requirements);
      } catch (e) {
        courseData.requirements = courseData.requirements ? [courseData.requirements] : [];
      }
    }
    if (!Array.isArray(courseData.requirements)) courseData.requirements = [];

    if (typeof courseData.faqs === 'string') {
      try {
        courseData.faqs = JSON.parse(courseData.faqs);
      } catch (e) {
        courseData.faqs = [];
      }
    }
    if (!Array.isArray(courseData.faqs)) courseData.faqs = [];

    if (typeof courseData.instructor === 'string') {
      try {
        courseData.instructor = JSON.parse(courseData.instructor);
      } catch (e) {
        // ignore
      }
    }

    if (courseData.popular !== undefined) {
      courseData.popular = courseData.popular === 'true' || courseData.popular === true;
    }
    if (courseData.comingSoon !== undefined) {
      courseData.comingSoon = courseData.comingSoon === 'true' || courseData.comingSoon === true;
    }
    if (courseData.originalPrice !== undefined) {
      courseData.originalPrice = parseFloat(courseData.originalPrice) || 0;
    }

    // Normalize totalSeats to a number when provided
    if (courseData.totalSeats !== undefined && courseData.totalSeats !== null && courseData.totalSeats !== '') {
      const parsedTotalSeats = Number(courseData.totalSeats);
      courseData.totalSeats = Number.isNaN(parsedTotalSeats) ? 0 : parsedTotalSeats;
    }

    // Set isPaid based on price
    if (courseData.price && parseFloat(courseData.price) > 0) {
      courseData.isPaid = true;
    }

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      const thumbnailFile = req.files.find(file => file.fieldname === 'thumbnail');
      if (thumbnailFile) {
        courseData.thumbnail = getUploadedUrl(thumbnailFile);
      }

      // Associate topic PDFs with their topics
      courseData.curriculum.forEach(module => {
        if (module.topics && Array.isArray(module.topics)) {
          module.topics.forEach(topic => {
            if (topic.pdfFileKey) {
              const pdfFile = req.files.find(file => file.fieldname === topic.pdfFileKey);
              if (pdfFile) {
                topic.pdfUrl = getUploadedUrl(pdfFile);
              }
              delete topic.pdfFileKey; // Clean up the key
            }
          });
        }
      });
    }

    const course = await Course.create(courseData);

    // Emit real-time course statistics update
    const io = getIO();
    io.emit('course-stats-updated', {
      message: `New course "${course.title}" has been created`,
      courseId: course._id,
      action: 'created',
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Admin
exports.updateCourse = async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    console.log('Update - Received curriculum:', {
      type: typeof updateData.curriculum,
      value: updateData.curriculum
    });
    
    // Parse curriculum if it's a JSON string
    if (typeof updateData.curriculum === 'string') {
      try {
        updateData.curriculum = JSON.parse(updateData.curriculum);
        updateData.curriculum = updateData.curriculum.filter(item => item.title && item.title.trim());
      } catch (e) {
        console.error('Error parsing curriculum:', e);
        updateData.curriculum = [];
      }
    }
    
    if (!Array.isArray(updateData.curriculum)) {
      updateData.curriculum = [];
    }

    // Parse prerequisites if it's a JSON string
    if (typeof updateData.prerequisites === 'string') {
      try {
        updateData.prerequisites = JSON.parse(updateData.prerequisites);
      } catch (e) {
        console.error('Error parsing prerequisites:', e);
        updateData.prerequisites = [];
      }
    }
    
    if (!Array.isArray(updateData.prerequisites)) {
      updateData.prerequisites = [];
    }

    // Parse learningOutcomes if it's a JSON string
    if (typeof updateData.learningOutcomes === 'string') {
      try {
        updateData.learningOutcomes = JSON.parse(updateData.learningOutcomes);
      } catch (e) {
        console.error('Error parsing learningOutcomes:', e);
        updateData.learningOutcomes = [];
      }
    }
    
    if (!Array.isArray(updateData.learningOutcomes)) {
      updateData.learningOutcomes = [];
    }

    // Parse tags if it's a comma-separated string
    if (typeof updateData.tags === 'string' && updateData.tags) {
      updateData.tags = updateData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    // Parse franchiseSeats if it's a JSON string
    if (typeof updateData.franchiseSeats === 'string' && updateData.franchiseSeats) {
      try {
        updateData.franchiseSeats = JSON.parse(updateData.franchiseSeats);
      } catch (e) {
        console.error('Error parsing franchiseSeats:', e);
        updateData.franchiseSeats = [];
      }
    }

    if (!Array.isArray(updateData.franchiseSeats)) {
      updateData.franchiseSeats = [];
    }

    // Parse website-specific arrays & objects
    if (typeof updateData.highlights === 'string') {
      try {
        updateData.highlights = JSON.parse(updateData.highlights);
      } catch (e) {
        updateData.highlights = updateData.highlights ? [updateData.highlights] : [];
      }
    }
    if (!Array.isArray(updateData.highlights)) updateData.highlights = [];

    if (typeof updateData.requirements === 'string') {
      try {
        updateData.requirements = JSON.parse(updateData.requirements);
      } catch (e) {
        updateData.requirements = updateData.requirements ? [updateData.requirements] : [];
      }
    }
    if (!Array.isArray(updateData.requirements)) updateData.requirements = [];

    if (typeof updateData.faqs === 'string') {
      try {
        updateData.faqs = JSON.parse(updateData.faqs);
      } catch (e) {
        updateData.faqs = [];
      }
    }
    if (!Array.isArray(updateData.faqs)) updateData.faqs = [];

    if (typeof updateData.instructor === 'string') {
      try {
        updateData.instructor = JSON.parse(updateData.instructor);
      } catch (e) {
        // ignore
      }
    }

    if (updateData.popular !== undefined) {
      updateData.popular = updateData.popular === 'true' || updateData.popular === true;
    }
    if (updateData.comingSoon !== undefined) {
      updateData.comingSoon = updateData.comingSoon === 'true' || updateData.comingSoon === true;
    }
    if (updateData.originalPrice !== undefined) {
      updateData.originalPrice = parseFloat(updateData.originalPrice) || 0;
    }

    // Normalize totalSeats to a number when provided
    if (updateData.totalSeats !== undefined && updateData.totalSeats !== null && updateData.totalSeats !== '') {
      const parsedTotalSeats = Number(updateData.totalSeats);
      updateData.totalSeats = Number.isNaN(parsedTotalSeats) ? 0 : parsedTotalSeats;
    }

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      const thumbnailFile = req.files.find(file => file.fieldname === 'thumbnail');
      if (thumbnailFile) {
        updateData.thumbnail = getUploadedUrl(thumbnailFile);
      }

      // Associate topic PDFs with their topics
      if (updateData.curriculum) {
        updateData.curriculum.forEach(module => {
          if (module.topics && Array.isArray(module.topics)) {
            module.topics.forEach(topic => {
              if (topic.pdfFileKey) {
                const pdfFile = req.files.find(file => file.fieldname === topic.pdfFileKey);
                if (pdfFile) {
                  topic.pdfUrl = getUploadedUrl(pdfFile);
                }
                delete topic.pdfFileKey; // Clean up the key
              }
            });
          }
        });
      }
    }
    
    // Handle typable trainerName or primaryTrainer
    const incomingTrainer = updateData.trainerName !== undefined ? updateData.trainerName : updateData.primaryTrainer;
    if (incomingTrainer !== undefined) {
      if (incomingTrainer && mongoose.Types.ObjectId.isValid(incomingTrainer) && String(new mongoose.Types.ObjectId(incomingTrainer)) === String(incomingTrainer)) {
        updateData.primaryTrainer = incomingTrainer;
      } else if (incomingTrainer) {
        updateData.primaryTrainer = null;
        updateData.trainerName = String(incomingTrainer).trim();
        if (!updateData.instructor) updateData.instructor = {};
        if (typeof updateData.instructor === 'object') {
          updateData.instructor.name = String(incomingTrainer).trim();
        }
      } else {
        updateData.primaryTrainer = null;
        updateData.trainerName = '';
      }
    }

    if (updateData.durationValue && !updateData.duration) {
      const unit = updateData.durationType ? (updateData.durationType.charAt(0).toUpperCase() + updateData.durationType.slice(1)) : 'Months';
      updateData.duration = `${updateData.durationValue} ${unit}`;
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const policy = await getOrCreateFeePolicyForCourse(course, null, req.user._id);
    policy.components = {
      registrationFee: course.registrationFee || 0,
      courseFee: course.discountedFee || course.regularFee || course.price || 0,
      examFee: course.examFee || 0,
      certificateFee: course.certificateFee || 0,
      otherFees: policy.components?.otherFees || 0
    };
    await policy.save();

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });

    // Emit real-time course statistics update
    const io = getIO();
    io.emit('course-stats-updated', {
      message: `Course "${course.title}" has been updated`,
      courseId: course._id,
      action: 'updated',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Check course dependencies before deletion
// @route   GET /api/courses/:id/check-dependencies
// @access  Private/Admin
exports.checkCourseDependencies = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course has topics/chapters
    const chaptersCount = await Chapter.countDocuments({ course: req.params.id });
    console.log(`Course ${req.params.id} has ${chaptersCount} chapters`);
    
    // Let's also check what chapters exist for this course
    const allChapters = await Chapter.find({ course: req.params.id });
    console.log(`All chapters for course:`, allChapters.map(c => ({ id: c._id, title: c.title })));
    
    const associatedItems = [];
    let topicsCount = 0;
    let mcqsCount = 0;
    
    if (chaptersCount > 0) {
      // Get all chapter IDs for this course
      const chapterIds = allChapters.map(chapter => chapter._id);
      console.log(`Chapter IDs: ${chapterIds}`);
      
      // Count topics for these chapters
      topicsCount = await Topic.countDocuments({ chapter: { $in: chapterIds } });
      console.log(`Found ${topicsCount} topics for these chapters`);
      
      if (topicsCount > 0) {
        // Get all topics for these chapters
        const topics = await Topic.find({ chapter: { $in: chapterIds } });
        const topicIds = topics.map(topic => topic._id);
        console.log(`Topic IDs: ${topicIds}`);
        
        // Count MCQs for these topics
        mcqsCount = await MCQ.countDocuments({ topic: { $in: topicIds } });
        console.log(`Found ${mcqsCount} MCQs for these topics`);
      }
      
      associatedItems.push({
        type: 'chapters',
        count: chaptersCount
      });
      
      if (topicsCount > 0) {
        associatedItems.push({
          type: 'topics',
          count: topicsCount
        });
      }
      
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
        ? `Course has ${associatedItems.reduce((sum, item) => sum + item.count, 0)} associated item(s)`
        : 'Course has no associated items'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Admin
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // If deleteAssociated is true, delete all associated chapters, topics and MCQs
    if (req.body.deleteAssociated) {
      const chapters = await Chapter.find({ course: req.params.id });
      console.log(`Deleting ${chapters.length} chapters, their topics and MCQs`);
      
      // For each chapter, delete its topics and MCQs
      for (const chapter of chapters) {
        const topics = await Topic.find({ chapter: chapter._id });
        console.log(`Chapter ${chapter._id} has ${topics.length} topics`);
        
        // Delete all MCQs associated with these topics
        for (const topic of topics) {
          const deletedMcqs = await MCQ.deleteMany({ topic: topic._id });
          console.log(`Deleted ${deletedMcqs.deletedCount} MCQs for topic ${topic._id}`);
        }
        
        // Delete all topics for this chapter
        const deletedTopics = await Topic.deleteMany({ chapter: chapter._id });
        console.log(`Deleted ${deletedTopics.deletedCount} topics for chapter ${chapter._id}`);
      }
      
      // Delete all chapters
      const deletedChapters = await Chapter.deleteMany({ course: req.params.id });
      console.log(`Deleted ${deletedChapters.deletedCount} chapters`);
    } else {
      // Check if course has associated items and prevent deletion if not explicitly requested
      const chaptersCount = await Chapter.countDocuments({ course: req.params.id });
      if (chaptersCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete course. It has ${chaptersCount} chapter(s) associated with it. Use deleteAssociated flag to delete all.`
        });
      }
    }

    // Delete the course
    await Course.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: req.body.deleteAssociated 
        ? 'Course and all associated items deleted successfully'
        : 'Course deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Enroll student in course
// @route   POST /api/courses/:id/enroll
// @access  Private/Student
exports.enrollCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: req.user.id,
      course: req.params.id
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    // Create enrollment
    const enrollment = await Enrollment.create({
      student: req.user.id,
      course: req.params.id
    });

    // Add student to course's enrolled students
    course.enrolledStudents.push(req.user.id);
    await course.save();

    // Emit a WebSocket event for the new enrollment
    const io = getIO();
    
    // Get populated enrollment data for real-time updates
    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('student', 'name email personalInfo.firstName personalInfo.lastName')
      .populate('course', 'title');
    
    io.emit('new-enrollment', {
      message: `A new student has enrolled in ${course.title}`,
      courseId: course._id,
      studentId: req.user.id,
      enrollment: populatedEnrollment,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Enrolled successfully',
      data: enrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get student's enrolled courses
// @route   GET /api/courses/my-courses
// @access  Private/Student
exports.getMyCourses = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user.id, isActive: true })
      .populate({
        path: 'course',
        populate: [
          {
            path: 'program',
            select: 'name code'
          },
          {
            path: 'primaryTrainer',
            select: 'personalInfo.firstName personalInfo.lastName personalInfo.email'
          }
        ]
      })
      .sort({ enrolledAt: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get course statistics (Admin)
// @route   GET /api/courses/:id/stats
// @access  Private/Admin
exports.getCourseStats = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const enrollmentsCount = await Enrollment.countDocuments({ course: req.params.id });
    const chaptersCount = await Chapter.countDocuments({ course: req.params.id, isActive: true });

    res.status(200).json({
      success: true,
      data: {
        enrolledStudents: enrollmentsCount,
        totalChapters: chaptersCount,
        courseDetails: course
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get enrolled students for a course (school specific)
// @route   GET /api/courses/:id/school-students
// @access  Private/FranchiseAdmin
exports.getFranchiseEnrolledStudents = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const franchiseId = req.user.franchise;

    if (!franchiseId) {
      return res.status(400).json({ success: false, message: 'User is not associated with a school.' });
    }

    const franchiseStudentIds = await getFranchiseStudentUserIds(franchiseId);

    const enrollments = await Enrollment.find({ course: courseId, student: { $in: franchiseStudentIds } })
      .populate('student', 'name email mobile createdAt')
      .sort({ enrolledAt: -1 });

    const students = enrollments.map(enrollment => ({
      ...enrollment.student.toObject(),
      enrolledAt: enrollment.enrolledAt,
      progress: enrollment.progress,
      lastAccessedAt: enrollment.lastAccessedAt
    }));

    res.status(200).json({ success: true, count: students.length, data: students });

  } catch (error) {
    next(error);
  }
};

// @desc    Get enrolled students for a course
// @route   GET /api/courses/:id/students
// @access  Private/Admin
exports.getEnrolledStudents = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ course: req.params.id })
      .populate('student', 'name email mobile createdAt')
      .sort({ enrolledAt: -1 });

    const students = enrollments.map(enrollment => ({
      ...enrollment.student.toObject(),
      enrolledAt: enrollment.enrolledAt,
      progress: enrollment.progress,
      lastAccessedAt: enrollment.lastAccessedAt
    }));

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get seat info for a specific course for the logged-in school
// @route   GET /api/courses/:id/school-seats
// @access  Private/FranchiseAdmin
exports.getFranchiseCourseSeatInfo = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const franchiseId = req.user.franchise;

    if (!franchiseId) {
      return res.status(400).json({ success: false, message: 'User is not associated with a school.' });
    }

    const course = await Course.findById(courseId).select('franchiseSeats');
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const seatAllocation = course.franchiseSeats.find(fs => fs.franchise.toString() === franchiseId.toString());
    const allocated = seatAllocation ? seatAllocation.seats : 0;

    // Count enrollments for this course from the school's students
    const filled = await countFranchiseFilledSeats(courseId, franchiseId);

    res.status(200).json({
      success: true,
      data: { allocated, filled, available: Math.max(0, allocated - filled) }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Mark a topic as complete for a student
// @route   POST /api/courses/:courseId/topics/:topicId/complete
// @access  Private/Student
exports.markTopicAsComplete = async (req, res) => {
  try {
    const { courseId, topicId } = req.params;
    const studentId = req.user.id;

    const enrollment = await Enrollment.findOne({ course: courseId, student: studentId });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found.' });
    }

    // Always store topic identifiers as strings so we can track both
    // standalone Topic docs and embedded curriculum topics
    const topicKey = String(topicId);

    const completedSet = new Set((enrollment.completedTopics || []).map(String));
    if (!completedSet.has(topicKey)) {
      completedSet.add(topicKey);
      enrollment.completedTopics = Array.from(completedSet);
    }

    // Recalculate progress based on course content model
    const course = await Course.findById(courseId).select('curriculum');

    let totalTopics = 0;

    if (course && Array.isArray(course.curriculum) && course.curriculum.length > 0) {
      // New model: embedded curriculum modules + topics
      totalTopics = course.curriculum.reduce((acc, module) => {
        return acc + ((module.topics || []).length);
      }, 0);
    } else {
      // Legacy model: Chapters + Topic documents
      const chapters = await Chapter.find({ course: courseId });
      const chapterIds = chapters.map(c => c._id);
      totalTopics = await Topic.countDocuments({ chapter: { $in: chapterIds } });
    }

    if (totalTopics > 0) {
      const uniqueCompletedCount = new Set((enrollment.completedTopics || []).map(String)).size;
      const progress = Math.round((uniqueCompletedCount / totalTopics) * 100);
      enrollment.progress = Math.min(progress, 100);
    } else {
      enrollment.progress = 0;
    }

    // Mark course as completed if progress is 100%
    if (enrollment.progress === 100 && !enrollment.completedAt) {
      enrollment.completedAt = Date.now();
    }

    await enrollment.save();

    // Emit real-time progress update
    const io = getIO();
    
    // Get populated enrollment data
    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('student', 'name email personalInfo.firstName personalInfo.lastName')
      .populate('course', 'title');
    
    io.emit('progress-updated', {
      message: `Progress updated for ${populatedEnrollment.course.title}`,
      courseId: courseId,
      studentId: studentId,
      progress: enrollment.progress,
      completedTopics: enrollment.completedTopics,
      enrollment: populatedEnrollment,
      timestamp: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Topic marked as complete.',
      data: enrollment
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
