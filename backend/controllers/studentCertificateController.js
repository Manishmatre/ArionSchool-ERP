require('../utils/fontLoader');
const { isSchoolTenantUser } = require('../utils/tenantAccess');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const StudentCertificateTemplate = require('../models/StudentCertificateTemplate');
const Course = require('../models/Course');
const StudentCertificate = require('../models/StudentCertificate');
const CompanyInformation = require('../models/CompanyInformation');
const { createCanvas, loadImage, registerFont } = require('canvas');
const {
  loadCanvasImage,
  loadTemplateImageForCanvas,
  queueGeneratedImageUpload,
  sendStoredFile
} = require('../utils/cloudinary');
const { generateStudentCertificateQR } = require('../utils/qrCodeGenerator');
const { resolveTemplateImageForSave } = require('../utils/templateImageService');
const { parseDocumentDate } = require('../utils/documentDate');
const { renderDefaultStudentCertificateCanvas } = require('../utils/defaultDocumentRenderer');
const {
  drawTemplateTextField,
  drawTemplateImage,
  resolveCustomFieldValue,
  normalizeTemplateFieldName,
  formatCourseDuration,
  lookupTemplateFieldValue,
  isTemplateTextLikeField,
  resolveStudentPhoto
} = require('../utils/templateRenderer');
const isServerPdfDisabled = process.env.DISABLE_SERVER_PDF === 'true';

const buildCanvasOptions = (student, companyInfo, certificate, qrCodeDataUrl) => ({
  companyInfo,
  issueDate: certificate.issueDate,
  grade: certificate.grade || 'A+',
  percentage: certificate.percentage ?? null,
  issueDate: certificate.issueDate,
  qrCodeDataUrl,
  certificateNumber: certificate.certificateNumber,
  franchiseOwnerSignature: student.franchise?.owner?.ownerSignature || '',
  superAdminSignature: companyInfo?.superAdminSignature || '',
  controllerSignature: companyInfo?.controllerSignature || '',
  companySeal: companyInfo?.companySeal || '',
  logo: companyInfo?.logo || '',
  isoLogo: companyInfo?.isoLogo || '',
  msmeLogo: companyInfo?.msmeLogo || '',
  govtEmblem: companyInfo?.govtEmblem || '',
  skillIndiaLogo: companyInfo?.skillIndiaLogo || '',
  watermarkImage: companyInfo?.watermarkImage || '',
  customFieldValues: certificate.customFieldValues || {}
});

const persistCertificateBuffer = async (certificateId, buffer, qrCodeDataUrl) => {
  await StudentCertificate.findByIdAndUpdate(certificateId, {
    qrCode: qrCodeDataUrl,
    file: buffer
  });

  queueGeneratedImageUpload(
    (fileUrl) =>
      StudentCertificate.findByIdAndUpdate(certificateId, {
        fileUrl,
        $unset: { file: 1 }
      }),
    buffer,
    'ses-lms/student-certificates'
  );
};

const renderStudentCertificate = async ({
  student,
  course,
  template,
  companyInfo,
  studentId,
  courseId,
  grade,
  percentage,
  issueDate,
  frontendUrl,
  customFieldValues = {}
}) => {
  // Ensure only the latest certificate per student per course exists; delete previous certificates
  await StudentCertificate.deleteMany({
    student: studentId,
    course: courseId
  });

  const certificate = await StudentCertificate.create({
    student: studentId,
    course: courseId,
    template: template?._id,
    grade: grade || 'A+',
    percentage: percentage ?? null,
    issueDate,
    customFieldValues
  });

  const qrCodeDataUrl = await generateStudentCertificateQR(certificate.certificateNumber, frontendUrl);
  const certificateBuffer = await generateStudentCertificateCanvas(
    student,
    course,
    template,
    buildCanvasOptions(student, companyInfo, certificate, qrCodeDataUrl)
  );

  await persistCertificateBuffer(certificate._id, certificateBuffer, qrCodeDataUrl);
  return certificate;
};

// @desc    Generate student certificate
// @route   POST /api/student-certificates/generate/:studentId
// @access  Private/Admin/FranchiseAdmin
exports.generateStudentCertificate = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { templateId, courseId, percentage, issueDate, customFieldValues } = req.body;
    let { grade } = req.body;

    const [student, course, companyInfo] = await Promise.all([
      Student.findById(studentId)
        .populate('user', 'name email profilePicture')
        .populate('franchise', 'name code logo address isMainBranch owner.ownerSignature')
        .populate('enrolledCourses.course', 'title'),
      Course.findById(courseId),
      CompanyInformation.findOne()
    ]);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (isSchoolTenantUser(req.user)) {
      if (student.franchise._id.toString() !== req.user.franchise.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to generate certificate for this student'
        });
      }
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    let template;
    const targetType = student.franchise?.isMainBranch ? 'main_branch' : 'franchise';

    if (templateId === 'default') {
      template = null;
    } else if (templateId) {
      template = await StudentCertificateTemplate.findById(templateId);
    } else {
      template = await StudentCertificateTemplate.getDefaultTemplate(course.title, targetType);
    }

    if (templateId && templateId !== 'default' && !template) {
      return res.status(404).json({
        success: false,
        message: 'Certificate template not found'
      });
    }

    if (isServerPdfDisabled) {
      return res.status(503).json({
        success: false,
        message: 'Server-side certificate generation is disabled. Set DISABLE_SERVER_PDF=false to enable this feature.'
      });
    }

    if (!grade && percentage !== undefined && percentage !== null && percentage !== '') {
      if (percentage >= 75) grade = 'A+';
      else if (percentage >= 60) grade = 'A';
      else if (percentage >= 36) grade = 'B';
      else grade = 'C';
    }

    const certificate = await renderStudentCertificate({
      student,
      course,
      template,
      companyInfo,
      studentId,
      courseId,
      grade,
      percentage,
      issueDate: parseDocumentDate(issueDate),
      frontendUrl: req.get('origin'),
      customFieldValues: customFieldValues || {}
    });

    return res.status(201).json({
      success: true,
      message: 'Certificate generated successfully',
      data: {
        _id: certificate._id,
        certificateNumber: certificate.certificateNumber
      }
    });
  } catch (error) {
    console.error('Error generating student certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating certificate',
      error: error.message
    });
  }
};

// @desc    Get all student certificate templates
// @route   GET /api/student-certificates/templates
// @access  Private/Admin
exports.getStudentCertificateTemplates = async (req, res) => {
  try {
    const templates = await StudentCertificateTemplate.find({ isActive: true })
      .populate('createdBy', 'name email')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching student certificate templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching templates',
      error: error.message
    });
  }
};

// @desc    Create student certificate template
// @route   POST /api/student-certificates/templates
// @access  Private/Admin
exports.createStudentCertificateTemplate = async (req, res) => {
  try {
    const templateImage = await resolveTemplateImageForSave(req.body.templateImage);
    const templateData = {
      ...req.body,
      templateImage,
      createdBy: req.user.id
    };

    const template = await StudentCertificateTemplate.create(templateData);

    const populatedTemplate = await StudentCertificateTemplate.findById(template._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Student certificate template created successfully',
      data: populatedTemplate
    });
  } catch (error) {
    console.error('Error creating student certificate template:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating template',
      error: error.message
    });
  }
};

// @desc    Update student certificate template
// @route   PUT /api/student-certificates/templates/:id
// @access  Private/Admin
exports.updateStudentCertificateTemplate = async (req, res) => {
  try {
    const existingTemplate = await StudentCertificateTemplate.findById(req.params.id);
    
    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const templateImage = await resolveTemplateImageForSave(
      req.body.templateImage,
      existingTemplate.templateImage
    );

    const updateData = {
      ...req.body,
      templateImage
    };

    const template = await StudentCertificateTemplate.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  } catch (error) {
    console.error('Error updating student certificate template:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating template',
      error: error.message
    });
  }
};

// @desc    Delete student certificate template
// @route   DELETE /api/student-certificates/templates/:id
// @access  Private/Admin
exports.deleteStudentCertificateTemplate = async (req, res) => {
  try {
    const template = await StudentCertificateTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Soft delete by setting isActive to false
    await StudentCertificateTemplate.findByIdAndUpdate(req.params.id, { isActive: false });

    res.status(200).json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student certificate template:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting template',
      error: error.message
    });
  }
};

// @desc    Batch generate student certificates
// @route   POST /api/student-certificates/batch-generate
// @access  Private/Admin/FranchiseAdmin
exports.batchGenerateStudentCertificates = async (req, res) => {
  try {
    const { studentIds, courseId, grade, percentage, issueDate, templateId } = req.body;
    const parsedIssueDate = parseDocumentDate(issueDate);

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid student IDs'
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // For school admin, verify all students belong to their franchise
    if (isSchoolTenantUser(req.user)) {
      const students = await Student.find({ _id: { $in: studentIds } });
      const unauthorizedStudents = students.filter(
        student => student.franchise.toString() !== req.user.franchise.toString()
      );
      
      if (unauthorizedStudents.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to generate certificates for students from other schools'
        });
      }
    }

    if (isServerPdfDisabled) {
      return res.status(503).json({
        success: false,
        message: 'Server-side certificate generation is disabled. Set DISABLE_SERVER_PDF=false to enable batch generation.'
      });
    }

    const results = [];
    const companyInfo = await CompanyInformation.findOne();

    for (const studentId of studentIds) {
      try {
        const student = await Student.findById(studentId)
          .populate('user', 'name email profilePicture')
          .populate('franchise', 'name code logo address isMainBranch owner.ownerSignature')
          .populate('enrolledCourses.course', 'title');

        if (!student) {
          results.push({ studentId, success: false, error: 'Student not found' });
          continue;
        }

        const targetType = student.franchise?.isMainBranch ? 'main_branch' : 'franchise';
        const template = templateId === 'default'
          ? null
          : templateId
            ? await StudentCertificateTemplate.findById(templateId)
            : await StudentCertificateTemplate.getDefaultTemplate(course.title, targetType);
        if (templateId && templateId !== 'default' && !template) {
          results.push({ studentId, success: false, error: 'Certificate template not found' });
          continue;
        }

        const certificate = await renderStudentCertificate({
          student,
          course,
          template,
          companyInfo,
          studentId,
          courseId,
          grade,
          percentage,
          issueDate: parsedIssueDate,
          frontendUrl: req.get('origin'),
          customFieldValues: req.body.customFieldValues || {}
        });

        results.push({
          studentId,
          success: true,
          certificateId: certificate._id,
          certificateNumber: certificate.certificateNumber,
          studentCode: student.studentId || studentId,
          message: 'Certificate generated successfully'
        });
      } catch (error) {
        console.error(`Error generating certificate for student ${studentId}:`, error);
        results.push({ studentId, success: false, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Processed ${results.length} student certificates`,
      results
    });
  } catch (error) {
    console.error('Error in batch generation:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating certificates',
      error: error.message
    });
  }
};

// Helper function to generate certificate canvas
async function generateStudentCertificateCanvas(student, course, template, options = {}) {
  if (!template) {
    return renderDefaultStudentCertificateCanvas({
      student,
      course,
      companyInfo: options.companyInfo,
      issueDate: options.issueDate,
      certificateNumber: options.certificateNumber,
      grade: options.grade,
      percentage: options.percentage,
      qrCodeDataUrl: options.qrCodeDataUrl,
      customFieldValues: options.customFieldValues
    });
  }

  if (!template || !template.templateImage) {
    throw new Error('Template or template image is missing');
  }

  const templateImage = await loadTemplateImageForCanvas(
    loadImage,
    template.templateImage,
    template._id
      ? async (url) => {
          await StudentCertificateTemplate.findByIdAndUpdate(template._id, { templateImage: url });
          template.templateImage = url;
        }
      : null
  );

  const fields = Array.isArray(template.fields) ? template.fields : [];
  const imageLoads = fields
    .filter((field) => field.fieldType === 'image')
    .map(async (field) => {
      const imagePath = getImagePathForField(field, student, options);
      if (!imagePath) {
        return [field.fieldName, null];
      }
      const image = await loadCanvasImage(loadImage, imagePath);
      return [field.fieldName, image];
    });

  const qrLoad = options.qrCodeDataUrl
    ? loadImage(options.qrCodeDataUrl).then((image) => ['__qr', image]).catch(() => ['__qr', null])
    : Promise.resolve(['__qr', null]);

  const loadedEntries = await Promise.all([...imageLoads, qrLoad]);
  const loadedImages = Object.fromEntries(loadedEntries);

  const canvas = createCanvas(templateImage.width, templateImage.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(templateImage, 0, 0);

  for (const field of fields) {
    if (field.fieldType === 'customText') {
      drawTemplateTextField(ctx, field, resolveCustomFieldValue(field, options.customFieldValues));
    } else if (isTemplateTextLikeField(field)) {
      drawTextField(ctx, field, student, course, options);
    } else if (field.fieldType === 'image') {
      drawImageField(ctx, field, loadedImages[field.fieldName]);
    } else if (field.fieldType === 'qrCode') {
      drawQRCode(ctx, field, loadedImages.__qr);
    }
  }

  const hasQRField = fields.some((field) => field.fieldType === 'qrCode');
  if (!hasQRField && loadedImages.__qr) {
    const defaultQRSize = 150;
    const defaultX = templateImage.width - defaultQRSize - 50;
    const defaultY = templateImage.height / 2 - defaultQRSize / 2;
    ctx.drawImage(loadedImages.__qr, defaultX, defaultY, defaultQRSize, defaultQRSize);
  }

  return canvas.toBuffer('image/png');
}

function getImagePathForField(field, student, options) {
  const name = (field.fieldName || '').toLowerCase();
  if (name === 'studentphoto' || name === 'photo') {
    return resolveStudentPhoto(student);
  }
  if (name === 'franchiselogo') {
    return student.franchise?.logo || options.logo || null;
  }
  if (name === 'logo' || name === 'companylogo' || name === 'primarylogo') {
    return options.logo || student.franchise?.logo || null;
  }
  if (name === 'franchiseownersignature') {
    return options.franchiseOwnerSignature || null;
  }
  if (name === 'superadminsignature' || name === 'signature' || name === 'ceosignature' || name === 'directorsignature') {
    return options.superAdminSignature || null;
  }
  if (name === 'controllersignature' || name === 'examcontrollersignature') {
    return options.controllerSignature || null;
  }
  if (name === 'companyseal' || name === 'seal' || name === 'stamp') {
    return options.companySeal || null;
  }
  if (name === 'isologo' || name === 'isobadge' || name === 'iso') {
    return options.isoLogo || null;
  }
  if (name === 'msmelogo' || name === 'msme') {
    return options.msmeLogo || null;
  }
  if (name === 'govtemblem' || name === 'nationalemblem' || name === 'mcaemblem') {
    return options.govtEmblem || null;
  }
  if (name === 'skillindialogo' || name === 'skillindia') {
    return options.skillIndiaLogo || null;
  }
  if (name === 'watermark' || name === 'watermarkimage') {
    return options.watermarkImage || null;
  }
  return null;
}

// Helper function to draw QR code
function drawQRCode(ctx, field, qrImage) {
  try {
    if (!qrImage) {
      return;
    }

    const { x, y, width, height } = field;
    ctx.drawImage(qrImage, x, y, width || 150, height || 150);
  } catch (error) {
    console.error('Error drawing QR code:', error);
  }
}

// Helper function to draw text fields
function drawTextField(ctx, field, student, course, options) {
  // Validate required properties
  if (field.x === undefined || field.y === undefined || field.fontSize === undefined) {
    console.warn('Missing required field properties:', field);
    return;
  }

  const value = getFieldValue(field.fieldName || field.label, student, course, options);

  // Apply text transformations
  let text = value;
  if (field.textTransform) {
    switch (field.textTransform) {
      case 'uppercase':
        text = text.toUpperCase();
        break;
      case 'lowercase':
        text = text.toLowerCase();
        break;
      case 'capitalize':
        text = text.replace(/\b\w/g, l => l.toUpperCase());
        break;
    }
  }
  
  // Set basic text properties
  ctx.fillStyle = field.color || '#000000';
  
  // Handle font size units
  let fontSize = field.fontSize;
  if (field.fontSizeUnit === '%' && field.fontSizeUnit) {
    fontSize = (field.fontSize / 100) * 12; // Convert percentage to pixels (base 12px)
  } else if (field.fontSizeUnit === 'em' && field.fontSizeUnit) {
    fontSize = field.fontSize * 12; // Convert em to pixels (base 12px)
  } else if (field.fontSizeUnit === 'auto') {
    // Auto-fit: calculate font size based on container width
    const maxWidth = field.width || 200;
    const testFontSize = 12;
    ctx.font = `${field.fontWeight || 'normal'} ${testFontSize}px ${field.fontFamily || 'Arial'}`;
    const metrics = ctx.measureText(text);
    const ratio = maxWidth / metrics.width;
    fontSize = Math.floor(testFontSize * Math.min(ratio, 3)); // Cap at 3x base size
  }
  
  ctx.font = `${field.fontWeight || 'normal'} ${fontSize}px ${field.fontFamily || 'Arial'}`;
  ctx.textAlign = field.alignment || 'left';
  ctx.textBaseline = 'top';

  // Apply letter spacing
  if (field.letterSpacing && field.letterSpacing !== 0) {
    ctx.letterSpacing = `${field.letterSpacing}px`;
  }
  
  // Draw background if specified
  if (field.backgroundColor && field.backgroundColor !== '#ffffff') {
    ctx.fillStyle = field.backgroundColor;
    const padding = field.padding || 0;
    const borderRadius = field.borderRadius || 0;
    
    if (borderRadius > 0) {
      // Draw rounded rectangle background
      roundRect(ctx, field.x - padding, field.y - padding, field.width + (padding * 2), field.height + (padding * 2), borderRadius);
      ctx.fill();
    } else {
      // Draw regular rectangle background
      ctx.fillRect(field.x - padding, field.y - padding, field.width + (padding * 2), field.height + (padding * 2));
    }
    
    // Reset text color
    ctx.fillStyle = field.color || '#000000';
  }
  
  // Apply text shadow if specified
  if (field.textShadowX || field.textShadowY || field.textShadowBlur) {
    ctx.shadowColor = field.textShadowColor || '#000000';
    ctx.shadowOffsetX = field.textShadowX || 0;
    ctx.shadowOffsetY = field.textShadowY || 0;
    ctx.shadowBlur = field.textShadowBlur || 0;
  }
  
  // Handle text wrapping with line height
  const maxWidth = field.width || 200;
  const lineHeight = (field.lineHeight || 1.2) * fontSize;
  const padding = field.padding || 0;

  // Check if text contains line breaks (for student name with S/O format)
  if (text.includes('\n')) {
    const lines = text.split('\n');
    let y = field.y;
    
    lines.forEach((line, index) => {
      let drawX = field.x + padding;
      if (field.alignment === 'center') {
        drawX = field.x + (maxWidth / 2) + padding;
        ctx.textAlign = 'center';
      } else if (field.alignment === 'right') {
        drawX = field.x + maxWidth + padding;
        ctx.textAlign = 'right';
      }
      
      ctx.fillText(line, drawX, y);
      y += lineHeight;
    });
  } else {
    // Simple text drawing without wrapping for single line text
    const words = text.split(' ');
    let line = '';
    let y = field.y;

    if (words.length === 1 || ctx.measureText(text).width <= maxWidth) {
      let drawX = field.x + padding;
      if (field.alignment === 'center') {
        drawX = field.x + (maxWidth / 2) + padding;
        ctx.textAlign = 'center';
      } else if (field.alignment === 'right') {
        drawX = field.x + maxWidth + padding;
        ctx.textAlign = 'right';
      }
      
      ctx.fillText(text, drawX, y);
    } else {
      // Text wrapping logic for long text
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && i > 0) {
          let drawX = field.x + padding;
          if (field.alignment === 'center') {
            drawX = field.x + (maxWidth / 2) + padding;
            ctx.textAlign = 'center';
          } else if (field.alignment === 'right') {
            drawX = field.x + maxWidth + padding;
            ctx.textAlign = 'right';
          }
          
          ctx.fillText(line, drawX, y);
          line = words[i] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      
      // Draw the last line
      let drawX = field.x + padding;
      if (field.alignment === 'center') {
        drawX = field.x + (maxWidth / 2) + padding;
        ctx.textAlign = 'center';
      } else if (field.alignment === 'right') {
        drawX = field.x + maxWidth + padding;
        ctx.textAlign = 'right';
      }
      
      ctx.fillText(line, drawX, y);
    }
  }
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;
  ctx.letterSpacing = 'normal';
}

// Helper function to draw rounded rectangles
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Helper function to draw image fields — skip entirely when image is missing (no placeholder box)
function drawImageField(ctx, field, image) {
  if (!image) return;

  try {
    drawTemplateImage(ctx, field, image);
  } catch (error) {
    console.error(`Error drawing image for field ${field.fieldName}:`, error);
  }
}

// Helper function to get field value
function getFieldValue(fieldName, student, course, options) {
  const normalizedFieldName = normalizeTemplateFieldName(fieldName);
  const courseDuration = formatCourseDuration(course);

  const fieldMap = {
    'studentName': (() => {
      const firstName = student.personalInfo?.firstName || '';
      const lastName = student.personalInfo?.lastName || '';
      const fatherName = student.personalInfo?.fatherName || '';
      const gender = student.personalInfo?.gender || '';
      
      const fullName = `${firstName} ${lastName}`.trim().toUpperCase();
      const fatherNameUpper = fatherName.toUpperCase();
      
      if (fatherName) {
        const relation = gender?.toLowerCase() === 'female' ? 'D/O' : 'S/O';
        return `${fullName}\n${relation} ${fatherNameUpper}`;
      }
      return fullName || student.fullName?.toUpperCase() || student.name?.toUpperCase() || student.user?.name?.toUpperCase() || 'STUDENT NAME';
    })(),
    'firstName': student.personalInfo?.firstName || '',
    'lastName': student.personalInfo?.lastName || '',
    'studentId': student.studentId || student.enrollmentNumber || student.rollNumber || 'STU001',
    'enrollmentNumber': student.enrollmentNumber || 'N/A',
    'rollNumber': student.rollNumber || '',
    // Support both legacy and new template keys
    'certificateNo': options.certificateNumber || 'N/A',
    'certificateNumber': options.certificateNumber || 'N/A',
    'courseName': course.title || course.name || course.courseName || 'Course Name',
    'courseCode': course.code || course.courseCode || 'COURSE001',
    'grade': options.grade || student.grade || course.grade || 'Pass',
    'percentage': options.percentage ? `${options.percentage}%` : student.academicInfo?.percentage ? `${student.academicInfo.percentage}%` : '',
    'issueDate': new Date(options.issueDate || Date.now()).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }),
    'franchiseName': student.franchise?.name || student.franchiseName || 'Franchise Name',
    'franchiseCode': student.franchise?.code || student.franchiseCode || 'FRN001',
    'franchiseOwnerSignature': options.franchiseOwnerSignature || '',
    'studentEmail': student.contactInfo?.email || student.personalInfo?.email || student.email || student.user?.email || '',
    'studentPhone': student.contactInfo?.mobile || student.personalInfo?.mobile || student.mobile || student.phone || student.personalInfo?.phone || '',
    'phone': student.contactInfo?.mobile || student.personalInfo?.mobile || student.mobile || student.phone || student.personalInfo?.phone || '',
    'mobile': student.contactInfo?.mobile || student.personalInfo?.mobile || student.mobile || student.phone || student.personalInfo?.phone || '',
    'completionDate': course.endDate ? new Date(course.endDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) : course.completionDate ? new Date(course.completionDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) : new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }),
    // Support template keys used in editor (courseDuration, duration, estimatedTime)
    'courseDuration': courseDuration,
    'duration': courseDuration,
    'estimatedTime': courseDuration,
    'instructorName': course.primaryTrainer?.name || course.instructor || course.teacherName || course.instructorName || 'Instructor Name',
    'dateOfBirth': student.personalInfo?.dateOfBirth 
      ? new Date(student.personalInfo.dateOfBirth).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : '',
    'dob': student.personalInfo?.dateOfBirth 
      ? new Date(student.personalInfo.dateOfBirth).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : '',
    'bloodGroup': student.personalInfo?.bloodGroup || '',
    'fatherName': student.personalInfo?.fatherName || '',
    'motherName': student.personalInfo?.motherName || '',
    'gender': student.personalInfo?.gender || '',
    'aadhaarNumber': student.personalInfo?.aadhaarNumber || '',
    'admissionDate': student.admissionDate 
      ? new Date(student.admissionDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : '',
    'address': (() => {
      let addressText = '';
      if (student.contactInfo?.address) {
        if (typeof student.contactInfo.address === 'string') {
          addressText = student.contactInfo.address;
        } else if (typeof student.contactInfo.address === 'object') {
          const addr = student.contactInfo.address;
          addressText = [
            addr.street || '',
            addr.city || '',
            addr.state || '',
            addr.pincode || addr.zip || '',
            addr.country || ''
          ].filter(Boolean).join(', ');
        }
      }
      return addressText;
    })(),
    'studentAddress': (() => {
      let addressText = '';
      if (student.contactInfo?.address) {
        if (typeof student.contactInfo.address === 'string') {
          addressText = student.contactInfo.address;
        } else if (typeof student.contactInfo.address === 'object') {
          const addr = student.contactInfo.address;
          addressText = [
            addr.street || '',
            addr.city || '',
            addr.state || '',
            addr.pincode || addr.zip || '',
            addr.country || ''
          ].filter(Boolean).join(', ');
        }
      }
      return addressText;
    })(),
    'franchiseAddress': (() => {
      let addressText = '';
      
      // Try multiple sources for school address
      let franchiseData = student.franchise;
      if (!franchiseData) {
        // Try to get school from student's franchise reference
        franchiseData = student.franchiseId || student.franchiseRef;
      }
      
      if (franchiseData?.address) {
        if (typeof franchiseData.address === 'string') {
          addressText = franchiseData.address;
        } else if (typeof franchiseData.address === 'object') {
          const addr = franchiseData.address;
          addressText = [
            addr.street || '',
            addr.city || '',
            addr.state || '',
            addr.pincode || addr.zip || '',
            addr.country || ''
          ].filter(Boolean).join(', ');
        }
      } else if (franchiseData?.fullAddress) {
        addressText = franchiseData.fullAddress;
      } else if (student.franchiseAddress) {
        addressText = student.franchiseAddress;
      }
      
      return addressText || 'Franchise Address';
    })(),
    'enrolledCourses': student.enrolledCourses ? student.enrolledCourses.map(e => e.course?.title || '').filter(Boolean).join(', ') : ''
  };

  const value = lookupTemplateFieldValue(fieldMap, fieldName);
  if (value !== undefined) {
    return value;
  }

  return `[${normalizedFieldName || fieldName}]`;
}

// @desc    Get all generated student certificates (paginated in chunks of 10)
// @route   GET /api/student-certificates/generated
// @access  Private/Admin/FranchiseAdmin
exports.getGeneratedStudentCertificates = async (req, res) => {
  try {
    let query = {};
    
    // If school admin, only show certificates for students in their franchise
    if (isSchoolTenantUser(req.user)) {
      const students = await Student.find({ franchise: req.user.franchise }).select('_id').lean();
      const studentIds = students.map(s => s._id);
      query.student = { $in: studentIds };
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    if (req.query.search) {
      const search = req.query.search.trim();
      const matchingStudents = await Student.find({
        $or: [
          { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
          { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
          { studentId: { $regex: search, $options: 'i' } }
        ]
      }).select('_id').lean();
      const studentIds = matchingStudents.map(s => s._id);
      query.$or = [
        { certificateNumber: { $regex: search, $options: 'i' } },
        { student: { $in: studentIds } }
      ];
    }

    const isAll = req.query.all === 'true';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = isAll ? 0 : Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const [total, activeCount, revokedCount] = await Promise.all([
      StudentCertificate.countDocuments(query),
      StudentCertificate.countDocuments({ ...query, status: 'active' }),
      StudentCertificate.countDocuments({ ...query, status: 'revoked' })
    ]);

    let certsQuery = StudentCertificate.find(query)
      .select('-file -qrCode') // Exclude heavy raw image buffer and base64 qrCode
      .populate('student', 'personalInfo.firstName personalInfo.lastName studentId')
      .populate('course', 'title')
      .sort('-createdAt');

    if (limit > 0) {
      certsQuery = certsQuery.skip(skip).limit(limit);
    }

    const certificates = await certsQuery.lean();

    res.status(200).json({
      success: true,
      count: certificates.length,
      total,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
      currentPage: page,
      activeCount,
      revokedCount,
      data: certificates
    });
  } catch (error) {
    console.error('Error fetching generated certificates:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Download a generated student certificate
// @route   GET /api/student-certificates/download/:id
// @access  Private/Admin/FranchiseAdmin/Student
exports.downloadStudentCertificate = async (req, res) => {
  try {
    const certificate = await StudentCertificate.findById(req.params.id)
      .populate({
        path: 'student',
        populate: {
          path: 'franchise',
          select: '_id'
        }
      });
    
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    // Check permissions - school admin can only download certificates for their own students
    if (isSchoolTenantUser(req.user)) {
      if (!certificate.student || !certificate.student.franchise) {
        return res.status(403).json({ success: false, message: 'Student or school not found' });
      }
      
      const studentFranchiseId = certificate.student.franchise._id.toString();
      const userFranchiseId = req.user.franchise.toString();
      
      if (studentFranchiseId !== userFranchiseId) {
        return res.status(403).json({ success: false, message: 'Not authorized to download this certificate' });
      }
    }

    // Check permissions - student can only download their own certificate
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user.id }).select('_id');
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student profile not found' });
      }
      if (certificate.student._id.toString() !== student._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to download this certificate' });
      }
    }

    // Check permissions - student can only download their own certificate
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user.id }).select('_id');
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student profile not found' });
      }
      if (certificate.student._id.toString() !== student._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to download this certificate' });
      }
    }

    // Check permissions - student can only download their own certificate
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user.id }).select('_id');
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student profile not found' });
      }
      if (certificate.student._id.toString() !== student._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to download this certificate' });
      }
    }

    const studentName = certificate.student ? 
      `${certificate.student.personalInfo.firstName}_${certificate.student.personalInfo.lastName}` : 
      'Certificate';

    return sendStoredFile(
      res,
      certificate,
      'image/png',
      `attachment; filename="Certificate_${studentName}.png"`
    );

  } catch (error) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get a student certificate as a blob URL for preview
// @route   GET /api/student-certificates/preview/:id
// @access  Private/Admin/FranchiseAdmin/Student
exports.getStudentCertificateBlobUrl = async (req, res) => {
  try {
    const certificate = await StudentCertificate.findById(req.params.id)
      .populate({
        path: 'student',
        populate: {
          path: 'franchise',
          select: '_id'
        }
      });
    
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    // Check permissions - school admin can only preview certificates for their own students
    if (isSchoolTenantUser(req.user)) {
      if (!certificate.student || !certificate.student.franchise) {
        return res.status(403).json({ success: false, message: 'Student or school not found' });
      }
      
      const studentFranchiseId = certificate.student.franchise._id.toString();
      const userFranchiseId = req.user.franchise.toString();
      
      if (studentFranchiseId !== userFranchiseId) {
        return res.status(403).json({ success: false, message: 'Not authorized to preview this certificate' });
      }
    }

    // Check permissions - student can only preview their own certificate
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user.id }).select('_id');
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student profile not found' });
      }
      if (certificate.student._id.toString() !== student._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to preview this certificate' });
      }
    }

    return sendStoredFile(res, certificate, 'image/png');
  } catch (error) {
    console.error('Error fetching certificate for preview:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete student certificate
// @route   DELETE /api/student-certificates/:id
// @access  Private/Admin/FranchiseAdmin
exports.deleteStudentCertificate = async (req, res) => {
  try {
    const certificate = await StudentCertificate.findById(req.params.id)
      .populate({
        path: 'student',
        populate: {
          path: 'franchise',
          select: '_id'
        }
      });
    
    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Student certificate not found'
      });
    }

    // Check permissions - school admin can only delete certificates for their own students
    if (isSchoolTenantUser(req.user)) {
      if (!certificate.student || !certificate.student.franchise) {
        return res.status(403).json({
          success: false,
          message: 'Student or school not found'
        });
      }
      
      const studentFranchiseId = certificate.student.franchise._id.toString();
      const userFranchiseId = req.user.franchise.toString();
      
      if (studentFranchiseId !== userFranchiseId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this certificate'
        });
      }
    }

    await StudentCertificate.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Certificate deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting certificate',
      error: error.message
    });
  }
};

// @desc    Get my certificates
// @route   GET /api/student-certificates/my
// @access  Private/Student
exports.getMyCertificates = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user.id }).select('_id');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const certificates = await StudentCertificate.find({ student: student._id })
      .populate('template', 'name')
      .populate('course', 'title')
      .sort({ createdAt: -1, _id: -1 });

    res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates
    });

  } catch (error) {
    console.error('Error fetching student certificates:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Export the helper function for use in other controllers
module.exports.generateStudentCertificateCanvas = generateStudentCertificateCanvas;
module.exports.renderStudentCertificate = renderStudentCertificate;
