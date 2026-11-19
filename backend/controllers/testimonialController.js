const Testimonial = require('../models/Testimonial');
const { isSchoolTenantUser } = require('../utils/tenantAccess');
const Course = require('../models/Course');
const Franchise = require('../models/SchoolCampus');
const Student = require('../models/Student');

// @desc    Get approved testimonials for public website / course pages
// @route   GET /api/testimonials
// @access  Public
exports.getPublicTestimonials = async (req, res) => {
  try {
    const { 
      type, 
      course, 
      role, 
      featured, 
      hasVideo, 
      limit = 20, 
      page = 1 
    } = req.query;

    const query = { status: 'approved' };

    if (type && type !== 'all') {
      query.type = type;
    }

    if (course) {
      query.course = course;
    }

    if (role && role !== 'all') {
      query.userRole = role;
    }

    if (featured === 'true') {
      query.isFeatured = true;
    }

    if (hasVideo === 'true') {
      query.videoUrl = { $exists: true, $ne: '' };
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [testimonials, total] = await Promise.all([
      Testimonial.find(query)
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('course', 'title thumbnail')
        .populate('franchise', 'franchiseName centerCode city'),
      Testimonial.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: testimonials.length,
      total,
      data: testimonials
    });
  } catch (error) {
    console.error('Error fetching public testimonials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch testimonials',
      error: error.message
    });
  }
};

// @desc    Get user's own submitted reviews / testimonials
// @route   GET /api/testimonials/my
// @access  Private (student, franchise_admin, super_admin)
exports.getMyTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('course', 'title thumbnail courseCode');

    const formatted = testimonials.map(t => {
      const obj = t.toObject ? t.toObject() : t;
      return {
        ...obj,
        content: obj.content || obj.message
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
      testimonials: formatted
    });
  } catch (error) {
    console.error('Error fetching user testimonials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your testimonials',
      error: error.message
    });
  }
};

// @desc    Create a new review / testimonial
// @route   POST /api/testimonials
// @access  Private (student, franchise_admin, super_admin)
exports.createTestimonial = async (req, res) => {
  try {
    const {
      rating,
      title,
      message,
      content,
      text,
      videoUrl,
      videoDuration,
      videoThumbnail,
      course,
      designation,
      type,
      // Admin specific fields
      userName,
      userRole,
      userEmail,
      avatar,
      isFeatured,
      status
    } = req.body;

    const reviewContent = (message || content || text || '').trim();

    if (!reviewContent) {
      return res.status(400).json({
        success: false,
        message: 'Review / testimonial message is required'
      });
    }

    const isSuperAdmin = ['super_admin', 'school_owner'].includes(req.user.role);
    const isFranchiseStudentReview = isSchoolTenantUser(req.user) && userRole === 'student';

    // Determine course title if course ID is provided
    let courseName = '';
    if (course) {
      const courseDoc = await Course.findById(course).select('title');
      if (courseDoc) {
        courseName = courseDoc.title;
      }
    }

    // Determine school name if franchise user
    let franchiseName = '';
    let franchiseId = null;
    if (isSchoolTenantUser(req.user)) {
      franchiseId = req.user.franchise;
    } else if (req.user.role === 'student') {
      const studentProfile = await Student.findOne({ user: req.user._id }).select('franchise').lean();
      franchiseId = studentProfile?.franchise || null;
    }
    if (franchiseId) {
      const franchiseDoc = await Franchise.findById(franchiseId).select('name').lean();
      if (franchiseDoc) franchiseName = franchiseDoc.name || '';
    }

    // Resolve user avatar
    const defaultAvatar = req.user.profilePicture || req.user.profileImage || '';

    // Determine review type: video if videoUrl given and not specified otherwise
    let reviewType = type || 'general';
    if (videoUrl && videoUrl.trim()) {
      reviewType = 'video';
    } else if (course) {
      reviewType = 'course';
    } else if (isSchoolTenantUser(req.user)) {
      reviewType = 'franchise';
    }

    const testimonialData = {
      user: req.user._id,
      userName: (isSuperAdmin || isFranchiseStudentReview) && userName ? userName : req.user.name,
      userEmail: (isSuperAdmin || isFranchiseStudentReview) && userEmail ? userEmail : req.user.email,
      userRole: (isSuperAdmin || isFranchiseStudentReview) && userRole ? userRole : req.user.role,
      designation: designation || (isSchoolTenantUser(req.user) ? 'Franchise Partner' : 'Student'),
      avatar: isSuperAdmin && avatar ? avatar : isFranchiseStudentReview ? '' : defaultAvatar,
      franchise: franchiseId,
      franchiseName,
      course: course || null,
      courseName,
      type: reviewType,
      rating: Number(rating) || 5,
      title: title || '',
      message: reviewContent,
      videoUrl: videoUrl ? videoUrl.trim() : '',
      videoDuration: videoDuration || '',
      videoThumbnail: videoThumbnail || '',
      // Admin can directly approve or feature testimonials
      status: isSuperAdmin ? (status || 'approved') : 'pending',
      isFeatured: isSuperAdmin ? Boolean(isFeatured) : false,
      reviewedBy: isSuperAdmin ? req.user._id : null,
      reviewedAt: isSuperAdmin ? new Date() : null
    };

    const newTestimonial = await Testimonial.create(testimonialData);

    res.status(201).json({
      success: true,
      message: isSuperAdmin ? 'Testimonial created successfully' : 'Your review has been submitted for approval. Thank you!',
      data: newTestimonial
    });
  } catch (error) {
    console.error('Error creating testimonial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create review / testimonial',
      error: error.message
    });
  }
};

// @desc    Get school student testimonials
// @route   GET /api/testimonials/school/students
// @access  Private (franchise_admin)
exports.getFranchiseStudentTestimonials = async (req, res) => {
  try {
    if (!req.user.franchise) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }
    const franchiseId = req.user.franchise;
    const studentUsers = await Student.find({ franchise: franchiseId }).select('user').lean();
    const studentUserIds = studentUsers.map((student) => student.user).filter(Boolean);
    const testimonials = await Testimonial.find({
      $or: [
        { franchise: franchiseId, $or: [{ userRole: 'student' }, { designation: 'Student' }] },
        { user: { $in: studentUserIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .populate('course', 'title thumbnail courseCode');

    res.status(200).json({
      success: true,
      count: testimonials.length,
      data: testimonials
    });
  } catch (error) {
    console.error('Error fetching school student testimonials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student testimonials for school',
      error: error.message
    });
  }
};

// @desc    Get recent enrollments for live activity toast
// @route   GET /api/testimonials/public/recent-enrollments
// @access  Public
exports.getRecentEnrollments = async (req, res) => {
  try {
    const Student = require('../models/Student');
    const Course = require('../models/Course');

    const students = await Student.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('franchise', 'franchiseName city')
      .select('personalInfo contactInfo franchise enrolledCourses createdAt');

    const recent = [];
    for (const s of students) {
      const firstName = s.personalInfo?.firstName || 'Student';
      const city = s.contactInfo?.address?.city || s.franchise?.city || 'India';
      
      let courseTitle = 'Certified Program';
      if (s.enrolledCourses && s.enrolledCourses.length > 0) {
        const first = s.enrolledCourses[0];
        const courseId = first.course || first;
        if (courseId) {
          const cDoc = await Course.findById(courseId).select('title');
          if (cDoc) courseTitle = cDoc.title;
        }
      }

      recent.push({
        id: s._id,
        name: `${firstName} from ${city}`,
        action: `enrolled in ${courseTitle}`,
        createdAt: s.createdAt,
        type: 'enrollment'
      });
    }

    res.status(200).json({
      success: true,
      data: recent
    });
  } catch (error) {
    console.error('Error fetching recent enrollments:', error);
    res.status(200).json({
      success: true,
      data: []
    });
  }
};

// @desc    Update a review / testimonial
// @route   PUT /api/testimonials/:id
// @access  Private (Owner, franchise_admin, or super_admin)
exports.updateTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    const isSuperAdmin = ['super_admin', 'school_owner'].includes(req.user.role);
    const isOwner = testimonial.user && testimonial.user.toString() === req.user._id.toString();
    const isFranchiseOwner = isSchoolTenantUser(req.user) &&
      testimonial.franchise &&
      req.user.franchise &&
      testimonial.franchise.toString() === req.user.franchise.toString();

    if (!isSuperAdmin && !isOwner && !isFranchiseOwner) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this testimonial'
      });
    }

    const {
      rating,
      title,
      message,
      videoUrl,
      videoDuration,
      videoThumbnail,
      course,
      designation,
      userName,
      userRole,
      userEmail,
      avatar,
      status,
      isFeatured,
      adminComment,
      type
    } = req.body;

    // Normal users can only update their content and reset status to pending for re-review
    if (rating !== undefined) testimonial.rating = Number(rating);
    if (title !== undefined) testimonial.title = title;
    if (message !== undefined) testimonial.message = message.trim();
    if (videoUrl !== undefined) testimonial.videoUrl = videoUrl.trim();
    if (videoDuration !== undefined) testimonial.videoDuration = videoDuration;
    if (videoThumbnail !== undefined) testimonial.videoThumbnail = videoThumbnail;
    if (designation !== undefined) testimonial.designation = designation;

    if (course !== undefined) {
      testimonial.course = course || null;
      if (course) {
        const courseDoc = await Course.findById(course).select('title');
        testimonial.courseName = courseDoc ? courseDoc.title : '';
      } else {
        testimonial.courseName = '';
      }
    }

    if (type !== undefined) {
      testimonial.type = type;
    } else if (testimonial.videoUrl) {
      testimonial.type = 'video';
    }

    // Admin exclusive controls
    if (isSuperAdmin) {
      if (userName !== undefined) testimonial.userName = userName;
      if (userRole !== undefined) testimonial.userRole = userRole;
      if (userEmail !== undefined) testimonial.userEmail = userEmail;
      if (avatar !== undefined) testimonial.avatar = avatar;
      if (status !== undefined) testimonial.status = status;
      if (isFeatured !== undefined) testimonial.isFeatured = Boolean(isFeatured);
      if (adminComment !== undefined) testimonial.adminComment = adminComment;
      testimonial.reviewedBy = req.user._id;
      testimonial.reviewedAt = new Date();
    } else {
      // If student or school updates their approved/rejected review, set to pending
      testimonial.status = 'pending';
    }

    await testimonial.save();

    res.status(200).json({
      success: true,
      message: 'Testimonial updated successfully',
      data: testimonial
    });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update testimonial',
      error: error.message
    });
  }
};

// @desc    Delete a review / testimonial
// @route   DELETE /api/testimonials/:id
// @access  Private (Owner or super_admin)
exports.deleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    const isSuperAdmin = ['super_admin', 'school_owner'].includes(req.user.role);
    const isOwner = testimonial.user && testimonial.user.toString() === req.user._id.toString();
    const isFranchiseOwner = isSchoolTenantUser(req.user) &&
      testimonial.franchise &&
      req.user.franchise &&
      testimonial.franchise.toString() === req.user.franchise.toString();

    if (!isSuperAdmin && !isOwner && !isFranchiseOwner) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this testimonial'
      });
    }

    await Testimonial.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Testimonial deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete testimonial',
      error: error.message
    });
  }
};

// @desc    Admin: Get all testimonials with filtering, search & stats
// @route   GET /api/testimonials/admin/all
// @access  Private (super_admin)
exports.getAllTestimonialsAdmin = async (req, res) => {
  try {
    const {
      status,
      role,
      search,
      featured,
      hasVideo,
      rating,
      page = 1,
      limit = 25
    } = req.query;

    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (role && role !== 'all') {
      filter.userRole = role;
    }

    if (featured === 'true') {
      filter.isFeatured = true;
    }

    if (hasVideo === 'true') {
      filter.videoUrl = { $exists: true, $ne: '' };
    }

    if (rating && rating !== 'all') {
      filter.rating = Number(rating);
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { userName: searchRegex },
        { title: searchRegex },
        { message: searchRegex },
        { courseName: searchRegex },
        { franchiseName: searchRegex }
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 25;
    const skip = (pageNum - 1) * limitNum;

    const [items, total, stats] = await Promise.all([
      Testimonial.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('user', 'name email role')
        .populate('course', 'title thumbnail')
        .populate('franchise', 'franchiseName centerCode'),
      Testimonial.countDocuments(filter),
      Testimonial.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
            featured: { $sum: { $cond: [{ $eq: ['$isFeatured', true] }, 1, 0] } },
            hasVideo: { $sum: { $cond: [{ $and: [{ $ne: ['$videoUrl', ''] }, { $ne: ['$videoUrl', null] }] }, 1, 0] } },
            avgRating: { $avg: '$rating' }
          }
        }
      ])
    ]);

    const summary = stats[0] || {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      featured: 0,
      hasVideo: 0,
      avgRating: 5
    };

    res.status(200).json({
      success: true,
      data: items,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      stats: summary
    });
  } catch (error) {
    console.error('Error fetching admin testimonials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch testimonials for admin',
      error: error.message
    });
  }
};

// @desc    Admin: Quick toggle status or featured flag
// @route   PATCH /api/testimonials/admin/:id/status
// @access  Private (super_admin)
exports.updateTestimonialStatus = async (req, res) => {
  try {
    const { status, isFeatured, adminComment } = req.body;

    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    if (status) {
      testimonial.status = status;
      testimonial.reviewedBy = req.user._id;
      testimonial.reviewedAt = new Date();
    }

    if (isFeatured !== undefined) {
      testimonial.isFeatured = Boolean(isFeatured);
    }

    if (adminComment !== undefined) {
      testimonial.adminComment = adminComment;
    }

    await testimonial.save();

    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      data: testimonial
    });
  } catch (error) {
    console.error('Error updating testimonial status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update testimonial status',
      error: error.message
    });
  }
};
