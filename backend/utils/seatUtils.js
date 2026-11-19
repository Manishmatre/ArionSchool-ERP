const Student = require('../models/Student');
const Enrollment = require('../models/Enrollment');

const toIdString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

/**
 * Resolve the User ids of every student that belongs to a franchise.
 *
 * IMPORTANT: This is the single source of truth for "who counts against a
 * franchise's seats". Enrollments store the student's *User* id, so we resolve
 * franchise membership through the Student collection (Student.franchise) and
 * map to the linked user. Using this everywhere keeps the seat availability
 * check and the seat display counts perfectly in sync.
 */
const getFranchiseStudentUserIds = async (franchiseId) => {
  if (!franchiseId) return [];
  const students = await Student.find({ franchise: franchiseId }).select('user').lean();
  return students.map((s) => s.user).filter(Boolean);
};

/**
 * Count how many seats of a course are filled by a given franchise's students.
 */
const countFranchiseFilledSeats = async (courseId, franchiseId, franchiseUserIds = null) => {
  const userIds = franchiseUserIds || (await getFranchiseStudentUserIds(franchiseId));
  if (!userIds.length) return 0;
  return Enrollment.countDocuments({
    course: courseId,
    student: { $in: userIds },
  });
};

module.exports = {
  toIdString,
  getFranchiseStudentUserIds,
  countFranchiseFilledSeats,
};
