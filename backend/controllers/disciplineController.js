const DisciplineRecord = require('../models/DisciplineRecord');
const Student = require('../models/Student');

const getTenantFranchise = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

exports.getRecords = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};

    if (req.query.student) query.student = req.query.student;
    if (req.query.schoolClass) query.schoolClass = req.query.schoolClass;
    if (req.query.recordType) query.recordType = req.query.recordType;

    const records = await DisciplineRecord.find(query)
      .populate('student', 'personalInfo.firstName personalInfo.lastName studentId rollNumber')
      .populate('schoolClass', 'name code')
      .populate('section', 'name')
      .populate('reportedBy', 'name email')
      .sort({ incidentDate: -1 });

    res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error) {
    next(error);
  }
};

exports.createRecord = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const { studentId, recordType, category, title, description, points, actionTaken, parentNotified } = req.body;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const record = await DisciplineRecord.create({
      student: studentId,
      schoolClass: student.schoolClass,
      section: student.section,
      franchise: franchiseId,
      recordType,
      category,
      title,
      description,
      points: points || 0,
      actionTaken,
      parentNotified: parentNotified ?? true,
      reportedBy: req.user._id,
      incidentDate: new Date()
    });

    const populated = await DisciplineRecord.findById(record._id)
      .populate('student', 'personalInfo.firstName personalInfo.lastName studentId rollNumber')
      .populate('schoolClass', 'name')
      .populate('section', 'name');

    res.status(201).json({
      success: true,
      message: `${recordType === 'merit' ? 'Merit' : 'Disciplinary incident'} logged successfully`,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

exports.acknowledgeParent = async (req, res, next) => {
  try {
    const record = await DisciplineRecord.findByIdAndUpdate(
      req.params.id,
      { parentAcknowledged: true },
      { new: true }
    );
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.status(200).json({ success: true, message: 'Disciplinary notice acknowledged', data: record });
  } catch (error) {
    next(error);
  }
};
