const Homework = require('../models/Homework');
const HomeworkSubmission = require('../models/HomeworkSubmission');
const Student = require('../models/Student');

const getTenantFranchise = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

const getHomeworkVisibilityQuery = async (req) => {
  const query = {};
  const franchiseId = getTenantFranchise(req);
  if (franchiseId) query.franchise = franchiseId;

  if (!['parent', 'student'].includes(req.user.role)) return query;

  let studentsQuery;
  if (req.user.role === 'student') {
    studentsQuery = { user: req.user._id };
  } else {
    const linkedStudents = [{ parent: req.user._id }];
    if (Array.isArray(req.user.linkedStudents) && req.user.linkedStudents.length) {
      linkedStudents.push({ _id: { $in: req.user.linkedStudents } });
    }
    if (req.user.mobile) {
      linkedStudents.push({ 'guardianInfo.mobile': req.user.mobile });
      linkedStudents.push({ 'contactInfo.mobile': req.user.mobile });
    }
    studentsQuery = { $or: linkedStudents };
  }

  const students = await Student.find(studentsQuery).select('schoolClass section').lean();
  const classSections = [...new Map(students
    .filter((student) => student.schoolClass)
    .map((student) => [`${student.schoolClass}:${student.section || ''}`, {
      schoolClass: student.schoolClass,
      section: student.section || null
    }])).values()];

  if (!classSections.length) return { _id: null };
  query.$or = classSections;
  return query;
};

// ==========================================
// 1. HOMEWORK ASSIGNMENTS CRUD
// ==========================================
exports.getHomework = async (req, res, next) => {
  try {
    const query = await getHomeworkVisibilityQuery(req);

    if (req.query.schoolClass) query.schoolClass = req.query.schoolClass;
    if (req.query.section) query.section = req.query.section;
    if (req.query.subject) query.subject = req.query.subject;
    if (req.query.teacher) query.teacher = req.query.teacher;

    const homeworkList = await Homework.find(query)
      .populate('schoolClass', 'name code')
      .populate('section', 'name')
      .populate('subject', 'name code')
      .populate('teacher', 'personalInfo.firstName personalInfo.lastName staffId')
      .sort({ assignedDate: -1 });

    res.status(200).json({ success: true, count: homeworkList.length, data: homeworkList });
  } catch (error) {
    next(error);
  }
};

exports.createHomework = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const homework = await Homework.create({
      ...req.body,
      franchise: franchiseId
    });

    const populated = await Homework.findById(homework._id)
      .populate('schoolClass', 'name')
      .populate('section', 'name')
      .populate('subject', 'name')
      .populate('teacher', 'personalInfo.firstName personalInfo.lastName');

    res.status(201).json({
      success: true,
      message: 'Homework assignment published successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteHomework = async (req, res, next) => {
  try {
    const homework = await Homework.findByIdAndDelete(req.params.id);
    if (!homework) return res.status(404).json({ success: false, message: 'Homework not found' });
    await HomeworkSubmission.deleteMany({ homework: req.params.id });
    res.status(200).json({ success: true, message: 'Homework assignment removed successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. SUBMISSIONS & EVALUATION
// ==========================================
exports.getSubmissions = async (req, res, next) => {
  try {
    const { homeworkId } = req.params;
    const submissions = await HomeworkSubmission.find({ homework: homeworkId })
      .populate('student', 'personalInfo.firstName personalInfo.lastName studentId rollNumber')
      .populate('evaluatedBy', 'name email')
      .sort({ submittedAt: -1 });

    res.status(200).json({ success: true, count: submissions.length, data: submissions });
  } catch (error) {
    next(error);
  }
};

exports.submitHomework = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const { homeworkId, studentId, attachments, studentNotes } = req.body;

    const submission = await HomeworkSubmission.findOneAndUpdate(
      { homework: homeworkId, student: studentId },
      {
        homework: homeworkId,
        student: studentId,
        franchise: franchiseId,
        attachments: attachments || [],
        studentNotes,
        submittedAt: new Date(),
        status: 'submitted'
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Homework submitted successfully',
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

exports.evaluateSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { marksObtained, teacherFeedback, status = 'evaluated' } = req.body;

    const submission = await HomeworkSubmission.findByIdAndUpdate(
      id,
      {
        marksObtained,
        teacherFeedback,
        status,
        evaluatedBy: req.user._id,
        evaluatedAt: new Date()
      },
      { new: true }
    );

    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

    res.status(200).json({
      success: true,
      message: 'Submission evaluated successfully',
      data: submission
    });
  } catch (error) {
    next(error);
  }
};
