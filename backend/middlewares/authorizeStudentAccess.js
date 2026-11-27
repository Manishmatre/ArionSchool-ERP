const Student = require('../models/Student');
const { canAccessStudentRecord } = require('../utils/tenantAccess');

module.exports = async function authorizeStudentAccess(req, res, next) {
  try {
    const student = await Student.findById(req.params.id).select('_id user parent linkedStudents franchise').lean();
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!canAccessStudentRecord(req.user, student)) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this student record' });
    }
    req.authorizedStudent = student;
    return next();
  } catch (error) {
    return next(error);
  }
};
