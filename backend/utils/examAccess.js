const FeeObligation = require('../models/FeeObligation');

const BLOCKING_COMPONENTS = ['course_fee', 'exam_fee', 'registration', 'total'];

const hasExamAccessOverride = (student, courseId) => {
  if (!student?.examAccess) return false;

  if (student.examAccess.bypassAllPendingFees) {
    return true;
  }

  if (!courseId || !Array.isArray(student.examAccess.courseOverrides)) {
    return false;
  }

  const now = new Date();
  return student.examAccess.courseOverrides.some((override) => {
    if (String(override.course) !== String(courseId)) return false;
    if (override.expiresAt && new Date(override.expiresAt) <= now) return false;
    return true;
  });
};

const getLegacyPendingReasons = (student) => {
  const reasons = [];
  const examPending = Number(student.fees?.examPending) || 0;
  const registrationPending = Number(student.fees?.registrationPending) || 0;
  const coursePending = Number(student.fees?.pendingAmount) || 0;

  if (examPending > 0) {
    reasons.push({
      component: 'exam_fee',
      amountPending: examPending,
      source: 'legacy'
    });
  }

  if (registrationPending > 0) {
    reasons.push({
      component: 'registration',
      amountPending: registrationPending,
      source: 'legacy'
    });
  }

  if (coursePending > 0) {
    reasons.push({
      component: 'course_fee',
      amountPending: coursePending,
      source: 'legacy'
    });
  }

  return reasons;
};

const checkExamFeeEligibility = async (student, courseId) => {
  if (!student || !courseId) {
    return {
      allowed: false,
      overridden: false,
      pendingFees: [],
      totalPending: 0,
      message: 'Student or course not found'
    };
  }

  if (hasExamAccessOverride(student, courseId)) {
    return {
      allowed: true,
      isEligible: true,
      overridden: true,
      pendingFees: [],
      totalPending: 0,
      message: 'Exam access granted by administrator despite pending fees'
    };
  }

  const obligations = await FeeObligation.find({
    student: student._id,
    course: courseId,
    component: { $in: BLOCKING_COMPONENTS },
    amountPending: { $gt: 0 },
    status: { $nin: ['paid', 'waived', 'cancelled'] }
  }).select('component amountPending description status');

  let pendingFees = obligations.map((obligation) => ({
    component: obligation.component,
    amountPending: obligation.amountPending,
    description: obligation.description,
    status: obligation.status,
    source: 'obligation'
  }));

  if (pendingFees.length === 0) {
    pendingFees = getLegacyPendingReasons(student);
  }

  const totalPending = pendingFees.reduce((sum, item) => sum + (item.amountPending || 0), 0);
  const allowed = totalPending <= 0;

  return {
    allowed,
    isEligible: allowed,
    overridden: false,
    pendingFees,
    totalPending,
    message: allowed
      ? 'Eligible for exam'
      : 'Pending course or exam fees must be cleared before taking this exam'
  };
};

const getExamAccessStatusForStudent = async (student) => {
  const enrolled = student.enrolledCourses || [];
  const courseEntries = [];

  for (const enrollment of enrolled) {
    const course = enrollment.course;
    const courseId = course?._id || course;
    if (!courseId) continue;

    const eligibility = await checkExamFeeEligibility(student, courseId);
    const courseOverride = student.examAccess?.courseOverrides?.find(
      (item) => String(item.course) === String(courseId)
    );

    courseEntries.push({
      courseId,
      courseTitle: course?.title || 'Course',
      courseCode: course?.courseCode || '',
      ...eligibility,
      hasCourseOverride: Boolean(courseOverride),
      overrideReason: courseOverride?.reason || '',
      overrideExpiresAt: courseOverride?.expiresAt || null
    });
  }

  return {
    bypassAllPendingFees: Boolean(student.examAccess?.bypassAllPendingFees),
    bypassAllReason: student.examAccess?.bypassAllReason || '',
    bypassAllGrantedAt: student.examAccess?.bypassAllGrantedAt || null,
    courses: courseEntries
  };
};

module.exports = {
  checkExamFeeEligibility,
  hasExamAccessOverride,
  getExamAccessStatusForStudent
};
