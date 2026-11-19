const SchoolCertificate = require('../models/SchoolCertificate');
const Student = require('../models/Student');

const getTenantFranchise = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

exports.getCertificates = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};

    if (req.query.certificateType) query.certificateType = req.query.certificateType;
    if (req.query.student) query.student = req.query.student;

    const certs = await SchoolCertificate.find(query)
      .populate('student', 'personalInfo studentId rollNumber admissionNumber')
      .populate('schoolClass', 'name code')
      .populate('section', 'name')
      .populate('academicSession', 'sessionName')
      .populate('franchise', 'name address phone email')
      .populate('issuedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: certs.length, data: certs });
  } catch (error) {
    next(error);
  }
};

exports.issueCertificate = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const {
      studentId,
      certificateType = 'transfer_certificate',
      reasonForLeaving,
      conduct = 'Good',
      promotedToClass,
      duesCleared = true,
      totalWorkingDays = 220,
      totalDaysPresent = 205,
      leavingDate,
      remarks
    } = req.body;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const cert = await SchoolCertificate.create({
      certificateType,
      student: studentId,
      schoolClass: student.schoolClass,
      section: student.section,
      academicSession: student.academicSession,
      franchise: franchiseId,
      reasonForLeaving,
      conduct,
      promotedToClass,
      duesCleared,
      totalWorkingDays,
      totalDaysPresent,
      leavingDate: leavingDate || new Date(),
      remarks,
      issuedBy: req.user._id,
      status: 'issued'
    });

    // If TC or Leaving certificate, update student status to 'transferred'
    if (certificateType === 'transfer_certificate' || certificateType === 'leaving') {
      student.status = 'transferred';
      await student.save();
    }

    const populated = await SchoolCertificate.findById(cert._id)
      .populate('student', 'personalInfo studentId rollNumber admissionNumber')
      .populate('schoolClass', 'name')
      .populate('section', 'name')
      .populate('franchise', 'name address phone email');

    res.status(201).json({
      success: true,
      message: `${certificateType.replace('_', ' ').toUpperCase()} issued successfully (${cert.certificateNumber})`,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

exports.getCertificateById = async (req, res, next) => {
  try {
    const cert = await SchoolCertificate.findById(req.params.id)
      .populate('student', 'personalInfo studentId rollNumber admissionNumber')
      .populate('schoolClass', 'name code')
      .populate('section', 'name')
      .populate('academicSession', 'sessionName')
      .populate('franchise', 'name address phone email logo');

    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found' });

    res.status(200).json({ success: true, data: cert });
  } catch (error) {
    next(error);
  }
};
