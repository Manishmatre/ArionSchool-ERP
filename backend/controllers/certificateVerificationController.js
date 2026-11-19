const StudentCertificate = require('../models/StudentCertificate');
const Student = require('../models/Student');
const Marksheet = require('../models/Marksheet');
const { sendStoredFile } = require('../utils/cloudinary');

const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const studentCertificatePopulate = [
  {
    path: 'student',
    select: 'personalInfo contactInfo studentId enrollmentNumber franchise',
    populate: {
      path: 'franchise',
      select: 'name isMainBranch'
    }
  },
  { path: 'course', select: 'title courseCode' }
];

const findStudentCertificateByQuery = async (query) =>
  StudentCertificate.findOne(query)
    .sort({ createdAt: -1, _id: -1 })
    .populate(studentCertificatePopulate);

const findStudentCertificateBySearchId = async (searchId) => {
  const trimmed = searchId.trim();
  if (!trimmed) return null;

  const isObjectId = /^[0-9a-fA-F]{24}$/.test(trimmed);
  if (isObjectId) {
    const byId = await findStudentCertificateByQuery({ _id: trimmed });
    if (byId) return byId;
  }

  const exactMatch = new RegExp(`^${escapeRegex(trimmed)}$`, 'i');

  const byCertificateNumber = await findStudentCertificateByQuery({
    certificateNumber: { $regex: exactMatch }
  });
  if (byCertificateNumber) return byCertificateNumber;

  const byVerificationCode = await findStudentCertificateByQuery({
    verificationCode: { $regex: exactMatch }
  });
  if (byVerificationCode) return byVerificationCode;

  const student = await Student.findOne({
    $or: [
      { studentId: { $regex: exactMatch } },
      { enrollmentNumber: { $regex: exactMatch } }
    ]
  }).select('_id');

  if (student) {
    return findStudentCertificateByQuery({ student: student._id, status: 'active' });
  }

  return null;
};

// @desc    Get certificate information
// @route   GET /api/verify-certificate
// @access  Public
exports.verifyCertificate = async (req, res) => {
  try {
    const { student, franchise, marksheet } = req.query;

    if (marksheet) {
      const record = await Marksheet.findById(marksheet)
        .populate('student', 'personalInfo studentId enrollmentNumber')
        .populate('course', 'title courseCode');
      if (!record) {
        return res.status(404).json({ success: false, message: 'Marksheet not found' });
      }
      return res.status(200).json({
        success: true,
        data: {
          type: 'marksheet',
          certificate: {
            id: record._id,
            certificateNumber: record.marksheetNumber,
            issueDate: record.issueDate,
            grade: record.grade,
            percentage: record.percentage
          },
          details: {
            student: {
              name: `${record.student?.personalInfo?.firstName || ''} ${record.student?.personalInfo?.lastName || ''}`.trim(),
              studentId: record.student?.studentId,
              enrollmentNumber: record.student?.enrollmentNumber
            },
            course: { title: record.course?.title, code: record.course?.courseCode },
            marks: record.marks,
            totalMarks: record.totalMarks,
            totalObtainedMarks: record.totalObtainedMarks
          }
        }
      });
    }

    let certificate = null;
    let certificateType = '';

    if (student) {
      certificate = await findStudentCertificateBySearchId(student);
      if (certificate) {
        certificateType = 'student';
      }
    }

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        type: certificateType,
        certificate: {
          id: certificate._id,
          certificateNumber: certificate.certificateNumber || null,
          verificationCode: certificate.verificationCode || null,
          issueDate: certificate.issueDate,
          grade: certificate.grade,
          percentage: certificate.percentage,
          status: certificate.status
        },
        details: certificateType === 'student' ? {
          student: {
            name: `${certificate.student.personalInfo?.firstName || ''} ${certificate.student.personalInfo?.lastName || ''}`.trim(),
            fatherName: certificate.student.personalInfo?.fatherName || 'N/A',
            studentId: certificate.student.studentId,
            enrollmentNumber: certificate.student.enrollmentNumber,
            email: certificate.student.contactInfo?.email || 'N/A'
          },
          course: {
            title: certificate.course?.title,
            code: certificate.course?.courseCode
          },
          franchise: {
            name: certificate.student.franchise?.name || 'N/A',
            isMainBranch: certificate.student.franchise?.isMainBranch || false
          }
        } : {
          franchise: {
            name: certificate.franchise?.name || 'N/A',
            code: certificate.franchise?.code || 'N/A',
            ownerName: certificate.franchise?.owner?.name || 'N/A',
            email: certificate.franchise?.owner?.email || certificate.franchise?.contactInfo?.email || 'N/A',
            mobile: certificate.franchise?.owner?.mobile || certificate.franchise?.contactInfo?.phone || 'N/A',
            address: typeof certificate.franchise?.address === 'object'
              ? `${certificate.franchise.address.street || ''}, ${certificate.franchise.address.city || ''}, ${certificate.franchise.address.state || ''} - ${certificate.franchise.address.pincode || ''}, ${certificate.franchise.address.country || ''}`
              : certificate.franchise?.address || 'N/A'
          },
          template: certificate.template?.name || 'N/A'
        }
      }
    });
  } catch (error) {
    console.error('Error getting certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting certificate'
    });
  }
};

// @desc    Get certificate image for download/preview
// @route   GET /api/certificate/:type/:id/image
// @access  Public
exports.getCertificateImage = async (req, res) => {
  try {
    const { type, id } = req.params;

    let certificate = null;

    if (type === 'student') {
      certificate = await StudentCertificate.findById(id).select('file fileUrl');
    } else if (type === 'marksheet') {
      certificate = await Marksheet.findById(id).select('file fileUrl');
    }

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    return sendStoredFile(res, certificate, 'image/png', 'inline');
  } catch (error) {
    console.error('Error getting certificate image:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting certificate image'
    });
  }
};
