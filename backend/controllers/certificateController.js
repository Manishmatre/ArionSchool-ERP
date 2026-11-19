const Certificate = require('../models/Certificate');
const { isSchoolTenantUser } = require('../utils/tenantAccess');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Franchise = require('../models/SchoolCampus');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { uploadGeneratedPdf, isCloudinaryUrl } = require('../utils/cloudinary');

// @desc    Get all certificates
// @route   GET /api/certificates
// @access  Private (Super Admin / School Admin)
exports.getAllCertificates = async (req, res, next) => {
  try {
    let query = {};

    // If school admin, only show their franchise certificates
    if (isSchoolTenantUser(req.user) && req.user.franchise) {
      query.franchise = req.user.franchise;
    }

    const certificates = await Certificate.find(query)
      .populate('student', 'studentId personalInfo')
      .populate('course', 'title')
      .populate('franchise', 'name code')
      .populate('issuedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single certificate
// @route   GET /api/certificates/:id
// @access  Private (Super Admin / School Admin)
exports.getCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('student', 'studentId personalInfo')
      .populate('course', 'title')
      .populate('franchise', 'name code')
      .populate('issuedBy', 'name');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Check if school admin can access this certificate
    if (isSchoolTenantUser(req.user) && 
        certificate.franchise.toString() !== req.user.franchise.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this certificate'
      });
    }

    res.status(200).json({
      success: true,
      data: certificate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate certificate
// @route   POST /api/certificates/generate
// @access  Private (Super Admin / School Admin)
exports.generateCertificate = async (req, res, next) => {
  try {
    const { studentId, courseId, grade, percentage, certificateType, remarks } = req.body;

    const student = await Student.findById(studentId)
      .populate('franchise');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if school admin can generate certificate for this student
    if (isSchoolTenantUser(req.user) && 
        student.franchise.toString() !== req.user.franchise.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to generate certificate for this student'
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({
      student: studentId,
      course: courseId,
      status: 'active'
    });

    if (existingCertificate) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already exists for this student and course'
      });
    }

    // Create certificate record
    const certificate = await Certificate.create({
      student: studentId,
      course: courseId,
      franchise: student.franchise._id,
      studentName: student.fullName || `${student.personalInfo.firstName} ${student.personalInfo.lastName}`,
      courseName: course.title,
      grade: grade || 'Pass',
      percentage,
      certificateType: certificateType || 'course_completion',
      issuedBy: req.user._id,
      remarks,
      issueDate: new Date()
    });

    if (process.env.DISABLE_SERVER_PDF === 'true') {
      certificate.pdfPath = null;
      await certificate.save();
    } else {
      // Generate PDF (simplified - you can enhance this later)
      const pdfPath = await generateCertificatePDF(certificate, student, course);
      certificate.pdfPath = pdfPath;
      await certificate.save();
    }

    // Add certificate to student record
    if (!student.certificates) {
      student.certificates = [];
    }
    student.certificates.push(certificate._id);
    await student.save();

    res.status(201).json({
      success: true,
      message: 'Certificate generated successfully',
      data: certificate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download certificate PDF
// @route   GET /api/certificates/:id/download
// @access  Private (Super Admin / School Admin)
exports.downloadCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('student')
      .populate('course');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Check if school admin can access this certificate
    if (isSchoolTenantUser(req.user) && 
        certificate.franchise.toString() !== req.user.franchise.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this certificate'
      });
    }

    if (certificate.pdfPath) {
      if (isCloudinaryUrl(certificate.pdfPath)) {
        return res.redirect(certificate.pdfPath);
      }
      if (fs.existsSync(certificate.pdfPath)) {
        return res.download(certificate.pdfPath, `certificate_${certificate.certificateNumber}.pdf`);
      }
    }

    if (process.env.DISABLE_SERVER_PDF === 'true') {
      return res.status(503).json({
        success: false,
        message: 'Server-side PDF generation is disabled. Enable DISABLE_SERVER_PDF=false to download certificates.'
      });
    }

    // Otherwise generate and serve
    const student = await Student.findById(certificate.student);
    const course = await Course.findById(certificate.course);
    const pdfPath = await generateCertificatePDF(certificate, student, course);
    
    certificate.pdfPath = pdfPath;
    await certificate.save();

    res.download(pdfPath, `certificate_${certificate.certificateNumber}.pdf`);
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke certificate
// @route   PUT /api/certificates/:id/revoke
// @access  Private (Super Admin / School Admin)
exports.revokeCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Check if school admin can revoke this certificate
    if (isSchoolTenantUser(req.user) && 
        certificate.franchise.toString() !== req.user.franchise.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to revoke this certificate'
      });
    }

    certificate.status = 'revoked';
    await certificate.save();

    res.status(200).json({
      success: true,
      message: 'Certificate revoked successfully',
      data: certificate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete certificate
// @route   DELETE /api/certificates/:id
// @access  Private (Super Admin only)
exports.deleteCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Delete PDF file if exists
    if (certificate.pdfPath && fs.existsSync(certificate.pdfPath)) {
      fs.unlinkSync(certificate.pdfPath);
    }

    await Certificate.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Certificate deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student certificates
// @route   GET /api/certificates/student/:studentId
// @access  Private (Super Admin / School Admin)
exports.getStudentCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({ student: req.params.studentId })
      .populate('course', 'title')
      .populate('franchise', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my certificates (for logged in student)
// @route   GET /api/certificates/mine
// @access  Private (Student)
exports.getMyCertificates = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const certificates = await Certificate.find({ student: student._id })
      .populate('course', 'title')
      .populate('franchise', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify certificate
// @route   GET /api/certificates/verify/:code
// @access  Public
exports.verifyCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({ verificationCode: req.params.code })
      .populate('student', 'studentId personalInfo')
      .populate('course', 'title')
      .populate('franchise', 'name');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or invalid verification code'
      });
    }

    res.status(200).json({
      success: true,
      data: certificate
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to generate certificate PDF
async function generateCertificatePDF(certificate, student, course) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const url = await uploadGeneratedPdf(buffer, 'ses-lms/legacy-certificates');
          resolve(url);
        } catch (error) {
          reject(error);
        }
      });
      doc.on('error', reject);

      doc.fontSize(32)
         .text('CERTIFICATE OF COMPLETION', { align: 'center' })
         .moveDown(2);

      doc.fontSize(18)
         .text('This is to certify that', { align: 'center' })
         .moveDown();

      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text(certificate.studentName, { align: 'center' })
         .moveDown();

      doc.fontSize(18)
         .font('Helvetica')
         .text('has successfully completed the course', { align: 'center' })
         .moveDown();

      doc.fontSize(22)
         .font('Helvetica-Bold')
         .text(certificate.courseName, { align: 'center' })
         .moveDown();

      if (certificate.grade) {
        doc.fontSize(16)
           .text(`Grade: ${certificate.grade}`, { align: 'center' });
      }

      if (certificate.percentage) {
        doc.fontSize(16)
           .text(`Percentage: ${certificate.percentage}%`, { align: 'center' });
      }

      doc.moveDown(3);

      doc.fontSize(12)
         .text(`Certificate Number: ${certificate.certificateNumber}`, { align: 'center' })
         .text(`Issue Date: ${new Date(certificate.issueDate).toLocaleDateString()}`, { align: 'center' })
         .text(`Verification Code: ${certificate.verificationCode}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

