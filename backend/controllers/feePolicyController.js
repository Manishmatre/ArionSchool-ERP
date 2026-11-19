const FeePolicy = require('../models/FeePolicy');
const { isSchoolTenantUser } = require('../utils/tenantAccess');
const Course = require('../models/Course');
const { getOrCreateFeePolicyForCourse } = require('../utils/transactionService');

exports.getAllFeePolicies = async (req, res, next) => {
  try {
    const query = { isActive: true };
    if (req.query.course) query.course = req.query.course;
    if (req.query.franchise) query.franchise = req.query.franchise;
    if (isSchoolTenantUser(req.user)) query.franchise = req.user.franchise;

    const policies = await FeePolicy.find(query)
      .populate('course', 'title courseCode')
      .populate('franchise', 'name code')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: policies.length, data: policies });
  } catch (error) {
    next(error);
  }
};

exports.getFeePolicy = async (req, res, next) => {
  try {
    const policy = await FeePolicy.findById(req.params.id)
      .populate('course')
      .populate('franchise');

    if (!policy) {
      return res.status(404).json({ success: false, message: 'Fee policy not found' });
    }

    if (isSchoolTenantUser(req.user) &&
        String(policy.franchise?._id || policy.franchise || '') !== String(req.user.franchise?._id || req.user.franchise || '')) {
      return res.status(403).json({ success: false, message: 'You cannot access fee policies for another school.' });
    }

    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
};

exports.createFeePolicy = async (req, res, next) => {
  try {
    const policy = await FeePolicy.create({
      ...req.body,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
};

exports.updateFeePolicy = async (req, res, next) => {
  try {
    const policy = await FeePolicy.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!policy) {
      return res.status(404).json({ success: false, message: 'Fee policy not found' });
    }

    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
};

exports.syncFromCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const policy = await getOrCreateFeePolicyForCourse(
      course,
      isSchoolTenantUser(req.user) ? req.user.franchise : (req.body.franchise || null),
      req.user._id
    );

    res.status(200).json({
      success: true,
      message: 'Fee policy synced from course',
      data: policy
    });
  } catch (error) {
    next(error);
  }
};

exports.syncAllCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ status: { $ne: 'archived' } });
    const results = [];

    for (const course of courses) {
      const policy = await getOrCreateFeePolicyForCourse(course, null, req.user._id);
      results.push({ courseId: course._id, policyId: policy._id });
    }

    res.status(200).json({
      success: true,
      message: `Synced ${results.length} course fee policies`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};
