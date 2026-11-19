const mongoose = require('mongoose');
const { isSchoolTenantUser } = require('../utils/tenantAccess');
const MarksheetTemplate = require('../models/MarksheetTemplate');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Marksheet = require('../models/Marksheet');
const StudentCertificate = require('../models/StudentCertificate');
const CompanyInformation = require('../models/CompanyInformation');
const { createCanvas, loadImage } = require('canvas');
const { generateStudentCertificateQR, generateMarksheetQR } = require('../utils/qrCodeGenerator');
const {
  uploadGeneratedImage,
  resolveImageSource,
  loadCanvasImage,
  loadTemplateImageForCanvas,
  sendStoredFile
} = require('../utils/cloudinary');
const { resolveTemplateImageForSave } = require('../utils/templateImageService');
const { parseDocumentDate } = require('../utils/documentDate');
const {
  drawTemplateTextField,
  drawTemplateImage: drawSharedImage,
  drawTemplateQR,
  sortFieldsByZIndex,
  resolveCustomFieldValue,
  formatCourseDuration,
  normalizeTemplateFieldName,
  resolveStudentPhoto
} = require('../utils/templateRenderer');
const { renderDefaultMarksheetCanvas } = require('../utils/defaultDocumentRenderer');
const { hasInvalidMarkScore } = require('../utils/markValidation');
const { getMarksheetNumberForStudent } = require('../utils/marksheetNumber');
const isServerPdfDisabled = process.env.DISABLE_SERVER_PDF === 'true';
let previewCompanyInfoCache = null;
let previewCompanyInfoCachedAt = 0;
let previewCompanyInfoRequest = null;

const getPreviewCompanyInformation = async () => {
  if (previewCompanyInfoCache && Date.now() - previewCompanyInfoCachedAt < 30000) return previewCompanyInfoCache;
  if (!previewCompanyInfoRequest) {
    previewCompanyInfoRequest = CompanyInformation.findOne()
      .then((companyInfo) => {
        previewCompanyInfoCache = companyInfo;
        previewCompanyInfoCachedAt = Date.now();
        return companyInfo;
      })
      .finally(() => { previewCompanyInfoRequest = null; });
  }
  return previewCompanyInfoRequest;
};

const getCertificateNumberForStudentCourse = async (studentId, courseId) => {
  if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(courseId)) return '';
  const certificate = await StudentCertificate.findOne({
    student: studentId,
    course: courseId,
    status: { $ne: 'revoked' }
  })
    .sort({ createdAt: -1 })
    .select('certificateNumber')
    .lean();
  return certificate?.certificateNumber || '';
};

// @desc    Get all marksheet templates
// @route   GET /api/marksheets/templates
// @access  Private/Admin
exports.getMarksheetTemplates = async (req, res) => {
  try {
    const templates = await MarksheetTemplate.find({ isActive: true })
      .populate('createdBy', 'name email')
      .populate('course', 'title courseCode')
      .sort('-createdAt')
      .lean();
    res.status(200).json({ success: true, count: templates.length, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching templates', error: error.message });
  }
};

// @desc    Get a single marksheet template
// @route   GET /api/marksheets/templates/:id
// @access  Private (Super Admin / School Admin)
exports.getMarksheetTemplate = async (req, res) => {
  try {
    const template = await MarksheetTemplate.findOne({ _id: req.params.id, isActive: true })
      .populate('createdBy', 'name email');

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.status(200).json({ success: true, data: template });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid template id' });
    }
    res.status(500).json({ success: false, message: 'Error fetching template', error: error.message });
  }
};

// @desc    Create a marksheet template
// @route   POST /api/marksheets/templates
// @access  Private/Admin
exports.createMarksheetTemplate = async (req, res) => {
  try {
    const templateImage = await resolveTemplateImageForSave(req.body.templateImage);
    const templateData = { ...req.body, templateImage, createdBy: req.user.id };
    const template = await MarksheetTemplate.create(templateData);
    res.status(201).json({ success: true, message: 'Template created successfully', data: template });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error creating template', error: error.message });
  }
};

// @desc    Update a marksheet template
// @route   PUT /api/marksheets/templates/:id
// @access  Private/Admin
exports.updateMarksheetTemplate = async (req, res) => {
  try {
    const existing = await MarksheetTemplate.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const templateImage = await resolveTemplateImageForSave(req.body.templateImage, existing.templateImage);
    const template = await MarksheetTemplate.findByIdAndUpdate(
      req.params.id,
      { ...req.body, templateImage },
      { new: true, runValidators: true }
    );
    res.status(200).json({ success: true, message: 'Template updated successfully', data: template });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error updating template', error: error.message });
  }
};

// @desc    Delete a marksheet template
// @route   DELETE /api/marksheets/templates/:id
// @access  Private/Admin
exports.deleteMarksheetTemplate = async (req, res) => {
  try {
    const template = await MarksheetTemplate.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.status(200).json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid template id' });
    }
    res.status(500).json({ success: false, message: 'Error deleting template', error: error.message });
  }
};

// @desc    Generate a marksheet
// @route   POST /api/marksheets/generate/:studentId
// @access  Private/Admin
exports.generateMarksheet = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { templateId, courseId, marks, issueDate, customFieldValues, session } = req.body;
    const parsedIssueDate = parseDocumentDate(issueDate);

    if (!marks || !Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one subject with marks is required to generate a marksheet'
      });
    }

    const validMarks = marks.filter((m) => m?.subject?.trim());
    if (validMarks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Each mark entry must include a subject name'
      });
    }

    if (hasInvalidMarkScore(validMarks)) {
      return res.status(400).json({ success: false, message: 'Obtained marks must be between 0 and the total marks for every subject.' });
    }

    const student = await Student.findById(studentId)
      .populate('franchise', 'name code logo address owner.ownerSignature isMainBranch')
      .populate('user', 'profilePicture');
    const course = await Course.findById(courseId);
    
    // Auto-select template if templateId is provided and valid
    let template = null;
    if (templateId === 'default') {
      template = null;
    } else if (templateId && mongoose.Types.ObjectId.isValid(templateId)) {
      template = await MarksheetTemplate.findById(templateId);
    } else if (!templateId) {
      const targetType = student.franchise?.isMainBranch ? 'main_branch' : 'franchise';
      template = await MarksheetTemplate.getDefaultTemplate(course.title, targetType, course._id);
    }

    if (!student || !course) {
      return res.status(404).json({ success: false, message: 'Student or course not found.' });
    }

    const certificateNumber = await getCertificateNumberForStudentCourse(student._id, course._id);

    const companyInfo = await CompanyInformation.findOne();

    if (isServerPdfDisabled) {
      return res.status(503).json({
        success: false,
        message: 'Server-side marksheet generation is disabled. Set DISABLE_SERVER_PDF=false to enable this feature.'
      });
    }

    // Generate QR code for marksheet verification
    let qrCodeDataUrl = null;
    const marksheetNumber = getMarksheetNumberForStudent(student, new Date().getFullYear(), certificateNumber);
    
    // Check if template has explicit QR field positioning
    const hasQRField = template?.fields && template.fields.some(field => field.fieldType === 'qrCode');
    
    // Always generate QR code regardless of template configuration
    qrCodeDataUrl = await generateStudentCertificateQR('temp-' + marksheetNumber);
    
    console.log(`🔍 Marksheet template has QR field defined: ${hasQRField}`);
    console.log(`📱 QR Code generated: ${qrCodeDataUrl ? 'YES' : 'NO'}`);

    const totalMarks = validMarks.reduce((acc, mark) => acc + (Number(mark.totalMarks) || 0), 0);
    const totalObtainedMarks = validMarks.reduce((acc, mark) => acc + (Number(mark.obtainedMarks) || 0), 0);
    const percentage = totalMarks > 0 ? (totalObtainedMarks / totalMarks) * 100 : 0;
    const grade = calculateGrade(percentage);

    // Robust derivation of duration and session
    let derivedDuration = req.body.duration || customFieldValues?.duration || course.duration;
    if (!derivedDuration && course.durationValue) {
      const unit = course.durationType ? (course.durationType.charAt(0).toUpperCase() + course.durationType.slice(1)) : 'Months';
      derivedDuration = `${course.durationValue} ${unit}`;
    } else if (!derivedDuration && course.totalHours) {
      derivedDuration = `${course.totalHours} Hours`;
    }
    if (!derivedDuration) {
      derivedDuration = '6 Months';
    } else if (!/\b(month|year|week|day|hour)s?\b/i.test(String(derivedDuration).trim())) {
      derivedDuration = `${String(derivedDuration).trim()} Months`;
    }

    let derivedSession = session || customFieldValues?.session || student.session || student.academicInfo?.session || student.enrolledCourses?.[0]?.session || student.enrolledCourses?.[0]?.batch?.name;
    if (!derivedSession || derivedSession === '—' || derivedSession === '-') {
      const d = student.admissionDate || student.createdAt || (parsedIssueDate || new Date());
      const yr = new Date(d).getFullYear();
      derivedSession = `${yr} - ${yr + 1}`;
    }

    const marksheetData = {
      student: student._id, 
      course: course._id, 
      marks: validMarks,
      totalMarks, 
      totalObtainedMarks, 
      percentage, 
      grade,
      issueDate: parsedIssueDate,
      marksheetNumber,
      certificateNumber,
      session: derivedSession,
      duration: derivedDuration
    };
    if (template?._id) {
      marksheetData.template = template._id;
    } else {
      marksheetData.template = undefined;
    }

    const marksheetBuffer = await exports.generateMarksheetCanvas({ 
      ...marksheetData, 
      student, 
      course, 
      template, 
      companyInfo,
      qrCodeDataUrl,
      customFieldValues: customFieldValues || {}
    });

    let marksheet = await Marksheet.findOne({ student: student._id, course: course._id }).sort({ createdAt: -1 });
    if (marksheet) {
      await Marksheet.deleteMany({ student: student._id, course: course._id, _id: { $ne: marksheet._id } });
    }
    if (marksheet) {
      Object.assign(marksheet, marksheetData);
      await marksheet.save();
    } else {
      marksheet = await Marksheet.create(marksheetData);
    }
    
    // Generate final QR code with actual marksheet ID
    const finalQRCode = await generateMarksheetQR(marksheet._id.toString());
    
    console.log('🔄 Regenerating marksheet with final QR code:', marksheet._id);
    console.log('📱 Final QR Code generated:', finalQRCode ? 'YES' : 'NO');
    
    // Regenerate marksheet with correct QR code
    const finalMarksheetBuffer = await exports.generateMarksheetCanvas({
      ...marksheetData,
      student,
      course,
      template,
      companyInfo,
      qrCodeDataUrl: finalQRCode,
      customFieldValues: customFieldValues || {}
    });

    const fileUrl = await uploadGeneratedImage(finalMarksheetBuffer, 'ses-lms/marksheets');

    await Marksheet.findByIdAndUpdate(marksheet._id, {
      qrCode: finalQRCode,
      fileUrl
    });
    console.log('✅ Marksheet updated with final QR code');

    const updatedMarksheet = await Marksheet.findById(marksheet._id);
    return res.status(200).json({
      success: true,
      message: 'Marksheet generated successfully',
      data: updatedMarksheet
    });

  } catch (error) {
    console.error('Error generating marksheet:', error);
    res.status(500).json({ success: false, message: 'Error generating marksheet', error: error.message });
  }
};

// @desc    Render the exact marksheet image used by generation without saving it
// @route   POST /api/marksheets/render-preview
// @access  Private/Admin
exports.renderMarksheetPreview = async (req, res) => {
  try {
    const student = req.body.previewStudent || (req.body.studentId
      ? await Student.findById(req.body.studentId)
        .populate('franchise', 'name code logo address owner.ownerSignature isMainBranch')
        .populate('user', 'profilePicture')
      : {
          studentId: 'SES-STUDENT-PREVIEW',
          enrollmentNumber: 'SES-ENR-2026-0000',
          personalInfo: { firstName: 'Student', lastName: 'Name', fatherName: '—', motherName: '—', gender: '—' }
        });
    const course = req.body.previewCourse || (req.body.courseId
      ? await Course.findById(req.body.courseId)
      : { title: req.body.courseTitle || 'Course Name', duration: req.body.courseDuration || '' });
    if (!student || !course) {
      return res.status(404).json({ success: false, message: 'Student or course not found.' });
    }

    const marks = Array.isArray(req.body.marks)
      ? req.body.marks.filter((mark) => mark?.subject?.trim())
      : [];
    if (hasInvalidMarkScore(marks)) {
      return res.status(400).json({ success: false, message: 'Obtained marks must be between 0 and the total marks for every subject.' });
    }

    let template = null;
    if (req.body.templateId && req.body.templateId !== 'default' && mongoose.Types.ObjectId.isValid(req.body.templateId)) {
      template = await MarksheetTemplate.findById(req.body.templateId);
    }

    const companyInfo = await getPreviewCompanyInformation();
    const totalMarks = marks.reduce((sum, mark) => sum + (Number(mark.totalMarks) || 0), 0);
    const totalObtainedMarks = marks.reduce((sum, mark) => sum + (Number(mark.obtainedMarks) || 0), 0);
    const percentage = totalMarks ? (totalObtainedMarks / totalMarks) * 100 : 0;
    const grade = calculateGrade(percentage);
    const certificateNumber = await getCertificateNumberForStudentCourse(req.body.studentId || student?._id, req.body.courseId || course?._id);
    const previewId = getMarksheetNumberForStudent(student, new Date().getFullYear(), certificateNumber);
    const qrCodeDataUrl = await generateStudentCertificateQR(previewId);

    const derivedPreviewSession = req.body.session || student.session || student.academicInfo?.session || student.enrolledCourses?.[0]?.session || student.enrolledCourses?.[0]?.batch?.name || `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`;
    let derivedPreviewDuration = req.body.duration || course.duration;
    if (!derivedPreviewDuration && course.durationValue) {
      const unit = course.durationType ? (course.durationType.charAt(0).toUpperCase() + course.durationType.slice(1)) : 'Months';
      derivedPreviewDuration = `${course.durationValue} ${unit}`;
    }
    if (!derivedPreviewDuration) derivedPreviewDuration = '6 Months';

    const image = await exports.generateMarksheetCanvas({
      student,
      course,
      template,
      marks,
      totalMarks,
      totalObtainedMarks,
      percentage,
      grade,
      issueDate: parseDocumentDate(req.body.issueDate),
      marksheetNumber: previewId,
      certificateNumber,
      session: derivedPreviewSession,
      duration: derivedPreviewDuration,
      qrCodeDataUrl,
      companyInfo,
      customFieldValues: req.body.customFieldValues || {}
    });

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-store');
    return res.status(200).send(image);
  } catch (error) {
    console.error('Marksheet preview render error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Could not render marksheet preview.' });
  }
};

// @desc    Get all generated marksheets (paginated in chunks of 10)
// @route   GET /api/marksheets/generated
// @access  Private/Admin
exports.getGeneratedMarksheets = async (req, res) => {
  try {
    let query = {};
    
    // If school admin, only show marksheets for students in their franchise
    if (isSchoolTenantUser(req.user)) {
      const students = await Student.find({ franchise: req.user.franchise }).select('_id').lean();
      const studentIds = students.map(s => s._id);
      query.student = { $in: studentIds };
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
        { marksheetNumber: { $regex: search, $options: 'i' } },
        { student: { $in: studentIds } }
      ];
    }

    const isAll = req.query.all === 'true';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = isAll ? 0 : Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const total = await Marksheet.countDocuments(query);

    let marksheetsQuery = Marksheet.find(query)
      .select('-file -marks')
      .populate('student', 'personalInfo.firstName personalInfo.lastName studentId')
      .populate('course', 'title name')
      .sort('-createdAt');

    if (limit > 0) {
      marksheetsQuery = marksheetsQuery.skip(skip).limit(limit);
    }

    const marksheets = await marksheetsQuery.lean();

    res.status(200).json({
      success: true,
      count: marksheets.length,
      total,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
      currentPage: page,
      data: marksheets
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching generated marksheets', error: error.message });
  }
};

// @desc    Download a generated marksheet
// @route   GET /api/marksheets/download/:id
// @access  Private
exports.downloadMarksheet = async (req, res) => {
  try {
    const marksheet = await Marksheet.findById(req.params.id);
    if (!marksheet) {
      return res.status(404).json({ success: false, message: 'Marksheet not found' });
    }
    return sendStoredFile(
      res,
      marksheet,
      'image/png',
      `attachment; filename=Marksheet_${marksheet.marksheetNumber}.png`
    );
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error downloading marksheet', error: error.message });
  }
};

// @desc    Delete a generated marksheet
// @route   DELETE /api/marksheets/:id
// @access  Private/Admin
exports.deleteMarksheet = async (req, res) => {
  try {
    const marksheet = await Marksheet.findByIdAndDelete(req.params.id);
    if (!marksheet) {
      return res.status(404).json({ success: false, message: 'Marksheet not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid marksheet id' });
    }
    res.status(500).json({ success: false, message: 'Error deleting marksheet', error: error.message });
  }
};

// @desc    Get a marksheet as a blob for preview
// @route   GET /api/marksheets/preview/:id
// @access  Private
exports.getMarksheetBlobUrl = async (req, res) => {
  try {
    const marksheet = await Marksheet.findById(req.params.id);
    if (!marksheet) {
      return res.status(404).json({ success: false, message: 'Marksheet not found' });
    }
    return sendStoredFile(res, marksheet, 'image/png');
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error getting marksheet preview', error: error.message });
  }
};

// @desc    Get marksheets for the logged-in student
// @route   GET /api/marksheets/my
// @access  Private/Student
exports.getMyMarksheets = async (req, res) => {
  try {
    // Find the student record associated with the user (only need the _id)
    const student = await Student.findOne({ user: req.user.id }).select('_id').lean();
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found for this user' });
    }

    const marksheets = await Marksheet.find({ student: student._id })
      .populate({
        path: 'course',
        select: 'title name'
      })
      .sort('-issueDate')
      .lean();
    
    // Fallback: If no marksheets found by student._id, try by student.user (User ID)
    // to handle any legacy or inconsistent data where user ID was used instead of student ID
    if (marksheets.length === 0) {
      const fallbackMarksheets = await Marksheet.find({ student: req.user.id })
        .populate({
          path: 'course',
          select: 'title name'
        })
        .sort('-issueDate')
        .lean();
      if (fallbackMarksheets.length > 0) {
        return res.status(200).json({ success: true, data: fallbackMarksheets });
      }
    }

    res.status(200).json({ success: true, data: marksheets });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching your marksheets', error: error.message });
  }
};


// --- Canvas Generation Helpers ---

exports.generateMarksheetCanvas = async function(data) {
  const { student, course, template, marks, totalMarks, totalObtainedMarks, percentage, grade, qrCodeDataUrl } = data;

  // If no template, no templateImage, or default styling requested, use built-in vector template
  const isDefault = !template || !template.templateImage || template.useDefaultStyling || (template.name && template.name.toLowerCase().includes('default'));
  if (isDefault) {
    return await renderDefaultMarksheetCanvas(data);
  }

  const image = await loadTemplateImageForCanvas(
    loadImage,
    template.templateImage,
    template._id
      ? async (url) => {
          await MarksheetTemplate.findByIdAndUpdate(template._id, { templateImage: url });
          template.templateImage = url;
        }
      : null
  );
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  let hasTableField = false;
  let hasQRField = false;

  for (const field of sortFieldsByZIndex(template.fields)) {
    if (field.fieldType === 'customText') {
      drawTemplateTextField(ctx, field, resolveCustomFieldValue(field, data.customFieldValues));
    } else if (field.fieldType === 'text') {
      await drawTextField(ctx, field, data);
    } else if (field.fieldType === 'table') {
      hasTableField = true;
      await drawMarksTable(ctx, field, marks);
    } else if (field.fieldType === 'image') {
      await drawImageField(ctx, field, data);
    } else if (field.fieldType === 'qrCode') {
      hasQRField = true;
      await drawQRCode(ctx, field, qrCodeDataUrl);
    }
  }

  // If template has no table field but we have marks, draw table at default position
  if (!hasTableField && marks && marks.length > 0) {
    console.log('📊 Template has no table field, drawing exam table at default position');
    const defaultTableConfig = {
      x: image.width * 0.15, // 15% from left
      y: image.height * 0.55, // 55% from top (below "STATEMENT OF MARKS")
      width: image.width * 0.7, // 70% of width
      height: Math.min(marks.length * 40 + 60, 300), // Dynamic height based on marks
      fontSize: 14,
      fontFamily: 'Arial',
      color: '#000000',
      fontWeight: 'normal',
      alignment: 'left'
    };
    await drawMarksTable(ctx, defaultTableConfig, marks);
    console.log('✅ Exam table drawn at default position');
  }

  // If template has no QR field but we have a QR code, draw it at a default position
  if (!hasQRField && qrCodeDataUrl) {
    console.log('📱 Template has no QR field, drawing QR at default position');
    const defaultQRSize = 150;
    const defaultX = image.width - defaultQRSize - 50; // 50px from right edge
    const defaultY = image.height / 2 - defaultQRSize / 2; // Center vertically
    
    try {
      const qrImage = await loadImage(qrCodeDataUrl);
      ctx.drawImage(qrImage, defaultX, defaultY, defaultQRSize, defaultQRSize);
      console.log(`✅ QR code drawn at default position (${defaultX}, ${defaultY})`);
    } catch (error) {
      console.error('❌ Error drawing QR code at default position:', error);
    }
  }

  return canvas.toBuffer('image/png');
}

async function drawImageField(ctx, field, data) {
  const { student, companyInfo } = data;

  let imgValue = null;
  if (field.fieldName === 'studentPhoto' || field.fieldName === 'photo') {
    imgValue = resolveStudentPhoto(student);
  } else if (field.fieldName === 'franchiseOwnerSignature') {
    imgValue = student.franchise?.owner?.ownerSignature;
  } else if (field.fieldName === 'superAdminSignature') {
    imgValue = companyInfo?.superAdminSignature;
  } else if (field.fieldName === 'controllerSignature') {
    imgValue = companyInfo?.controllerSignature;
  } else if (field.fieldName === 'companySeal') {
    imgValue = companyInfo?.companySeal;
  } else {
    // Template image fields may reference any uploaded template asset key.
    imgValue = companyInfo?.[field.fieldName];
  }

  if (!imgValue) return;

  try {
    const imageSource = resolveImageSource(imgValue);
    if (!imageSource) return;

    const img = await loadCanvasImage(loadImage, imageSource);
    if (!img) return;

    drawSharedImage(ctx, field, img);
  } catch (error) {
    console.error(`Error loading image for marksheet field ${field.fieldName}:`, error);
  }
}

// Helper function to draw QR code
async function drawQRCode(ctx, field, qrCodeDataUrl) {
  try {
    if (!qrCodeDataUrl) {
      console.warn('No QR code data URL provided');
      return;
    }

    const { x, y, width, height } = field;
    
    // Load QR code image from data URL
    const qrImage = await loadImage(qrCodeDataUrl);
    
    // Draw QR code on canvas
    ctx.drawImage(qrImage, x, y, width || 150, height || 150);
    
  } catch (error) {
    console.error('Error drawing QR code:', error);
  }
}

async function drawTextField(ctx, field, data) {
  const { student, course, totalMarks, totalObtainedMarks, percentage, grade } = data;
  const fieldKey = normalizeTemplateFieldName(field.fieldName || field.label || '');
  let value = '';
  switch (fieldKey) {
    case 'studentName': value = `${student.personalInfo?.firstName || ''} ${student.personalInfo?.lastName || ''}`.trim(); break;
    case 'studentId': value = student.studentId || ''; break;
    case 'enrollmentNumber': value = student.enrollmentNumber || ''; break;
    case 'gender': value = student.personalInfo?.gender || ''; break;
    case 'fatherName': value = student.personalInfo?.fatherName || ''; break;
    case 'motherName': value = student.personalInfo?.motherName || ''; break;
    case 'dateOfBirth': value = student.personalInfo?.dateOfBirth ? new Date(student.personalInfo.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''; break;
    case 'studentEmail': value = student.contactInfo?.email || ''; break;
    case 'studentPhone': value = student.contactInfo?.mobile || ''; break;
    case 'courseName': value = course?.title || ''; break;
    case 'courseCode': value = course?.courseCode || ''; break;
    case 'courseDuration':
    case 'duration':
    case 'estimatedTime':
      value = formatCourseDuration(course);
      break;
    case 'session': value = course?.session || ''; break;
    case 'totalMarks': value = String(totalMarks); break;
    case 'obtainedMarks': value = String(totalObtainedMarks); break;
    case 'percentage': value = `${percentage.toFixed(2)}%`; break;
    case 'grade': value = grade; break;
    case 'franchiseName': value = student.franchise?.name || ''; break;
    case 'franchiseCode': value = student.franchise?.code || ''; break;
    case 'franchiseAddress': {
      const franchise = student.franchise;
      if (franchise?.address) {
        const addr = franchise.address;
        value = `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} - ${addr.pincode || ''}`.replace(/^, |, $/, '');
      }
      break;
    }
    case 'certificateNo':
    case 'certificateNumber':
    case 'marksheetNo':
    case 'marksheetNumber': {
      let mNum = data.marksheetNumber;
      if (!mNum || String(mNum).startsWith('SES-CERT')) {
        mNum = getMarksheetNumberForStudent(student, new Date().getFullYear(), data.certificateNumber);
      }
      if (String(mNum).startsWith('SES-CERT-')) {
        mNum = String(mNum).replace(/^SES-CERT-/i, 'SES-MARKS-');
      }
      value = mNum || '';
      break;
    }
    case 'issueDate': value = new Date(data.issueDate || Date.now()).toLocaleDateString(); break;
    default: value = `[${fieldKey || field.fieldName}]`;
  }

  drawTemplateTextField(ctx, field, value);
}

function drawFittedHeaderText(ctx, text, centerX, centerY, maxWidth, baseFontSize, fontFamily = 'Arial', fontWeight = 'bold') {
  let size = baseFontSize;
  ctx.save();
  ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
  const safeMaxWidth = Math.max(10, maxWidth - 12);
  while (ctx.measureText(text).width > safeMaxWidth && size > 9) {
    size -= 0.5;
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
  }
  ctx.fillText(text, centerX, centerY);
  ctx.restore();
}

async function drawMarksTable(ctx, field, marks) {
  const { x, y, width, height, fontSize, fontFamily, color, fontWeight, alignment } = field;
  
  // Ensure minimum row height of 40px for readability
  const minRowHeight = 40;
  const calculatedRowHeight = height / (marks.length + 2); // +2 for header and total row
  const rowHeight = Math.max(minRowHeight, calculatedRowHeight);
  
  // 5 Columns: SR. NO. | SUBJECT | MAX. | MIN. | OBTAINED MARKS
  const col0W = Math.round(width * 0.08); // SR. NO.
  const col1W = Math.round(width * 0.47); // SUBJECT
  const col2W = Math.round(width * 0.10); // MAX.
  const col3W = Math.round(width * 0.10); // MIN.
  const col4W = width - col0W - col1W - col2W - col3W; // OBTAINED MARKS (~25%)

  const colX = [
    x,
    x + col0W,
    x + col0W + col1W,
    x + col0W + col1W + col2W,
    x + col0W + col1W + col2W + col3W,
    x + width
  ];

  const headerHeight = rowHeight;

  ctx.fillStyle = color || '#000000';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Draw table background (white with slight transparency)
  // Keep the paper artwork and security watermark visible beneath the marks.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(x, y, width, rowHeight * (marks.length + 2));

  // Draw header background
  ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
  ctx.fillRect(x, y, width, headerHeight);

  // Draw grid lines
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  
  // Outer border
  ctx.strokeRect(x, y, width, rowHeight * (marks.length + 2));
  
  // Vertical lines for the 5 columns
  for (const lineX of colX.slice(1, -1)) {
    ctx.beginPath();
    ctx.moveTo(lineX, y);
    ctx.lineTo(lineX, y + rowHeight * (marks.length + 2));
    ctx.stroke();
  }
  
  // Horizontal lines (header and between rows)
  for (let i = 1; i <= marks.length + 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x, y + rowHeight * i);
    ctx.lineTo(x + width, y + rowHeight * i);
    ctx.stroke();
  }

  // Draw Header (5 columns) with auto-fitting text
  ctx.fillStyle = color || '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const headerFontSize = fontSize || 15;
  drawFittedHeaderText(ctx, 'SR. NO.', colX[0] + col0W / 2, y + headerHeight / 2, col0W, headerFontSize, fontFamily || 'Arial', 'bold');
  drawFittedHeaderText(ctx, 'SUBJECT', colX[1] + col1W / 2, y + headerHeight / 2, col1W, headerFontSize, fontFamily || 'Arial', 'bold');
  drawFittedHeaderText(ctx, 'MAX.', colX[2] + col2W / 2, y + headerHeight / 2, col2W, headerFontSize, fontFamily || 'Arial', 'bold');
  drawFittedHeaderText(ctx, 'MIN.', colX[3] + col3W / 2, y + headerHeight / 2, col3W, headerFontSize, fontFamily || 'Arial', 'bold');
  drawFittedHeaderText(ctx, 'OBTAINED MARKS', colX[4] + col4W / 2, y + headerHeight / 2, col4W, headerFontSize, fontFamily || 'Arial', 'bold');

  // Draw Exam Rows
  ctx.font = `${fontWeight || 'normal'} ${fontSize || 14}px ${fontFamily || 'Arial'}`;
  
  let totalMinMarks = 0;
  marks.forEach((mark, index) => {
    const rowY = y + headerHeight + (rowHeight * index) + rowHeight / 2;
    const minScore = mark.minMarks != null ? mark.minMarks : Math.round((Number(mark.totalMarks) || 100) * 0.4);
    totalMinMarks += Number(minScore) || 0;

    // SR. NO. (centered)
    ctx.textAlign = 'center';
    ctx.fillText(String(index + 1), colX[0] + col0W / 2, rowY);
    
    // Subject (left-aligned with padding)
    ctx.textAlign = 'left';
    const subjectText = mark.subject || 'Unknown';
    let displayText = subjectText;
    const maxTextWidth = col1W - 20;
    while (ctx.measureText(displayText).width > maxTextWidth && displayText.length > 3) {
      displayText = displayText.slice(0, -4) + '...';
    }
    ctx.fillText(displayText, colX[1] + 10, rowY);
    
    // Max Marks (centered)
    ctx.textAlign = 'center';
    ctx.fillText(String(mark.totalMarks || 0), colX[2] + col2W / 2, rowY);

    // Min Marks (centered)
    ctx.fillText(String(minScore), colX[3] + col3W / 2, rowY);
    
    // Obtained Marks (centered)
    ctx.fillText(String(mark.obtainedMarks || 0), colX[4] + col4W / 2, rowY);
  });

  // Draw Total Row
  const totalRowY = y + headerHeight + (rowHeight * marks.length) + rowHeight / 2;
  ctx.font = `bold ${fontSize || 14}px ${fontFamily || 'Arial'}`;
  ctx.textAlign = 'center';
  ctx.fillText('', colX[0] + col0W / 2, totalRowY);

  ctx.textAlign = 'left';
  ctx.fillText('TOTAL', colX[1] + 10, totalRowY);
  
  const totalMarks = marks.reduce((sum, m) => sum + (Number(m.totalMarks) || 0), 0);
  const totalObtained = marks.reduce((sum, m) => sum + (Number(m.obtainedMarks) || 0), 0);
  
  ctx.textAlign = 'center';
  ctx.fillText(String(totalMarks), colX[2] + col2W / 2, totalRowY);
  ctx.fillText(String(totalMinMarks), colX[3] + col3W / 2, totalRowY);
  ctx.fillText(String(totalObtained), colX[4] + col4W / 2, totalRowY);
  
  console.log(`✅ Drew marks table with ${marks.length} exams at position (${x}, ${y})`);
}

function calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  return 'F';
}
