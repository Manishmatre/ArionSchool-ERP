require('../utils/fontLoader');
const { isSchoolTenantUser } = require('../utils/tenantAccess');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const IdCardTemplate = require('../models/IdCardTemplate');
const IdCard = require('../models/IdCard');
const Franchise = require('../models/SchoolCampus');
const { createCanvas, loadImage, registerFont } = require('canvas');
const {
  loadCanvasImage,
  loadTemplateImageForCanvas,
  queueGeneratedImageUpload,
  sendStoredFile
} = require('../utils/cloudinary');
const { resolveTemplateImageForSave } = require('../utils/templateImageService');
const {
  drawTemplateTextField,
  drawTemplateImage: drawSharedImage,
  resolveCustomFieldValue,
  sortFieldsByZIndex
} = require('../utils/templateRenderer');
const { renderDefaultIdCardCanvas } = require('../utils/defaultDocumentRenderer');
const isServerPdfDisabled = process.env.DISABLE_SERVER_PDF === 'true';
const BATCH_CONCURRENCY = 3;

const loadStudentForIdCard = (studentId) =>
  Student.findById(studentId)
    .select('studentId enrollmentNumber personalInfo contactInfo franchise enrolledCourses admissionDate expiryDate batch user')
    .populate('franchise', 'name logo address isMainBranch')
    .populate({
      path: 'enrolledCourses',
      populate: { path: 'course', model: 'Course', select: 'title name' }
    })
    .populate('user', 'profilePicture email mobile name');

const persistIdCardBuffer = async ({ studentId, template, franchiseId, buffer }) => {
  // Ensure only the latest ID card per student exists; delete older versions
  await IdCard.deleteMany({ student: studentId });
  const cardPayload = {
    student: studentId,
    franchise: franchiseId,
    file: buffer
  };
  if (template?._id) {
    cardPayload.template = template._id;
  }
  const idCard = await IdCard.create(cardPayload);

  queueGeneratedImageUpload(
    (fileUrl) => IdCard.findByIdAndUpdate(idCard._id, { fileUrl, $unset: { file: 1 } }),
    buffer,
    'ses-lms/id-cards'
  );

  return idCard;
};

const resolveTemplateForStudent = async (templateId, franchiseId, cache = {}) => {
  if (templateId === 'default') {
    return null;
  }

  if (templateId && mongoose.Types.ObjectId.isValid(templateId)) {
    if (!cache.byId) cache.byId = new Map();
    if (!cache.byId.has(templateId)) {
      cache.byId.set(templateId, await IdCardTemplate.findById(templateId));
    }
    return cache.byId.get(templateId);
  }

  const key = franchiseId?.toString() || 'global';
  if (!cache.byFranchise) cache.byFranchise = new Map();
  if (!cache.byFranchise.has(key)) {
    cache.byFranchise.set(key, await IdCardTemplate.getDefaultTemplate(franchiseId));
  }
  return cache.byFranchise.get(key);
};

// @desc    Generate ID card for a student
// @route   POST /api/id-cards/generate/:studentId
// @access  Private/Admin/FranchiseAdmin
exports.generateIdCard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { templateId } = req.body;

    const student = await loadStudentForIdCard(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check permissions - school admin can only generate ID cards for their own students
    if (isSchoolTenantUser(req.user)) {
      if (student.franchise._id.toString() !== req.user.franchise.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to generate ID card for this student'
        });
      }
    }

    const template = await resolveTemplateForStudent(templateId, student.franchise?._id);

    if (isServerPdfDisabled) {
      return res.status(503).json({
        success: false,
        message: 'Server-side ID card generation is disabled. Set DISABLE_SERVER_PDF=false to enable this feature.'
      });
    }

    const idCardBuffer = await generateIdCardImage(student, template, req.body.customFieldValues || {});
    await persistIdCardBuffer({
      studentId,
      template,
      franchiseId: student.franchise._id,
      buffer: idCardBuffer
    });

    return res.status(200).json({
      success: true,
      message: 'ID Card generated successfully',
      data: {
        studentId: student._id
      }
    });

  } catch (error) {
    console.error('Error generating ID card:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Generate ID cards for multiple students (batch)
// @route   POST /api/id-cards/batch-generate
// @access  Private/Admin/FranchiseAdmin
exports.batchGenerateIdCards = async (req, res) => {
  try {
    const { studentIds, templateId, customFieldValues } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid student IDs'
      });
    }

    if (isServerPdfDisabled) {
      return res.status(503).json({
        success: false,
        message: 'Server-side ID card generation is disabled. Set DISABLE_SERVER_PDF=false to enable batch generation.'
      });
    }

    const results = [];
    const templateCache = {};
    const students = await Student.find({ _id: { $in: studentIds } })
      .select('studentId personalInfo franchise enrolledCourses admissionDate expiryDate batch contactInfo enrollmentNumber')
      .populate('franchise', 'name logo')
      .populate({
        path: 'enrolledCourses',
        populate: { path: 'course', model: 'Course', select: 'title' }
      });
    const studentsById = new Map(students.map((s) => [s._id.toString(), s]));

    const processOne = async (studentId) => {
      try {
        const student = studentsById.get(studentId.toString());
        if (!student) {
          return { studentId, success: false, error: 'Student not found' };
        }

        if (isSchoolTenantUser(req.user)) {
          if (student.franchise._id.toString() !== req.user.franchise.toString()) {
            return { studentId, success: false, error: 'Not authorized' };
          }
        }

        const template = await resolveTemplateForStudent(templateId, student.franchise?._id, templateCache);

        const idCardBuffer = await generateIdCardImage(student, template, customFieldValues || {});
        await persistIdCardBuffer({
          studentId,
          template,
          franchiseId: student.franchise._id,
          buffer: idCardBuffer
        });

        return {
          studentId,
          studentName: `${student.personalInfo.firstName} ${student.personalInfo.lastName}`,
          success: true,
          generatedAt: new Date()
        };
      } catch (error) {
        return { studentId, success: false, error: error.message };
      }
    };

    for (let i = 0; i < studentIds.length; i += BATCH_CONCURRENCY) {
      const chunk = studentIds.slice(i, i + BATCH_CONCURRENCY);
      const chunkResults = await Promise.all(chunk.map((id) => processOne(id)));
      results.push(...chunkResults);
    }

    res.status(200).json({
      success: true,
      message: `Processed ${studentIds.length} ID card requests`,
      results
    });

  } catch (error) {
    console.error('Error in batch ID card generation:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all ID card templates
// @route   GET /api/id-cards/templates
// @access  Private/Admin/FranchiseAdmin
exports.getTemplates = async (req, res) => {
  try {
    let query = { isActive: true };

    // Filter by school if franchise admin
    if (isSchoolTenantUser(req.user)) {
      // For school admin, get both their own templates and global templates (no franchise specified)
      const [franchiseTemplates, globalTemplates] = await Promise.all([
        IdCardTemplate.find({ ...query, franchise: req.user.franchise })
          .select('name description templateImage franchise createdAt')
          .populate('franchise', 'name')
          .populate('createdBy', 'name email')
          .sort('-createdAt')
          .lean(),
        IdCardTemplate.find({ ...query, franchise: { $exists: false } })
          .select('name description templateImage franchise createdAt')
          .populate('franchise', 'name')
          .populate('createdBy', 'name email')
          .sort('-createdAt')
          .lean()
      ]);
      
      const allTemplates = [...franchiseTemplates, ...globalTemplates];
      
      res.status(200).json({
        success: true,
        count: allTemplates.length,
        data: allTemplates
      });
    } else {
      // For super admin, get all templates
      const templates = await IdCardTemplate.find(query)
        .select('name description templateImage franchise createdAt')
        .populate('franchise', 'name')
        .populate('createdBy', 'name email')
        .sort('-createdAt')
        .lean();

      res.status(200).json({
        success: true,
        count: templates.length,
        data: templates
      });
    }

  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single ID card template
// @route   GET /api/id-cards/templates/:id
// @access  Private/Admin/FranchiseAdmin
exports.getTemplateById = async (req, res) => {
  try {
    const template = await IdCardTemplate.findById(req.params.id)
      .populate('franchise', 'name')
      .populate('createdBy', 'name email')
      .lean();

    if (!template || !template.isActive) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    if (isSchoolTenantUser(req.user) && template.franchise?._id?.toString() !== req.user.franchise.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this template' });
    }

    res.status(200).json({ success: true, data: template });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new ID card template
// @route   POST /api/id-cards/templates
// @access  Private/Admin/FranchiseAdmin
exports.createTemplate = async (req, res) => {
  try {
    const templateImage = await resolveTemplateImageForSave(req.body.templateImage);
    const templateData = {
      ...req.body,
      templateImage,
      createdBy: req.user.id
    };

    if (isSchoolTenantUser(req.user)) {
      templateData.franchise = req.user.franchise;
    }

    const template = await IdCardTemplate.create(templateData);

    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update ID card template
// @route   PUT /api/id-cards/templates/:id
// @access  Private/Admin/FranchiseAdmin
exports.updateTemplate = async (req, res) => {
  try {
    const template = await IdCardTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check permissions
    if (isSchoolTenantUser(req.user) && template.franchise.toString() !== req.user.franchise.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this template'
      });
    }

    const templateImage = await resolveTemplateImageForSave(req.body.templateImage, template.templateImage);
    const updatedTemplate = await IdCardTemplate.findByIdAndUpdate(
      req.params.id,
      { ...req.body, templateImage },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedTemplate
    });

  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get generated ID cards
// @route   GET /api/id-cards/generated
// @access  Private/Admin/FranchiseAdmin
exports.getGeneratedIdCards = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    // Build search query
    let searchQuery = {};
    
    // Filter by school if franchise admin
    if (isSchoolTenantUser(req.user)) {
      searchQuery.franchise = req.user.franchise;
    }
    
    if (search) {
      const studentFilter = {
        $or: [
          { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
          { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
          { studentId: { $regex: search, $options: 'i' } }
        ]
      };
      if (isSchoolTenantUser(req.user)) {
        studentFilter.franchise = req.user.franchise;
      }
      const matchingStudents = await Student.find(studentFilter).select('_id').lean();
      searchQuery.student = { $in: matchingStudents.map((s) => s._id) };
    }

    const idCards = await IdCard.find(searchQuery)
      .select('-file') // Exclude heavy raw image buffer
      .populate({
        path: 'student',
        select: 'personalInfo studentId'
      })
      .populate({ path: 'template', select: 'name' })
      .sort('-issueDate')
      .skip(skip)
      .limit(limit)
      .lean();

    const filteredIdCards = idCards.filter((idCard) => idCard.student);
    const total = await IdCard.countDocuments(searchQuery);

    res.status(200).json({ 
      success: true, 
      data: filteredIdCards,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching generated ID cards:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.downloadIdCard = async (req, res) => {
  try {
    const idCard = await IdCard.findById(req.params.id)
      .populate({ path: 'student', select: 'personalInfo franchise', populate: { path: 'franchise', select: '_id' } })
      .lean();
    
    if (!idCard) {
      return res.status(404).json({ success: false, message: 'ID Card not found' });
    }

    // Check permissions - school admin can only download ID cards for their own students
    if (isSchoolTenantUser(req.user)) {
      const studentFranchiseId = idCard.student.franchise._id.toString();
      const userFranchiseId = req.user.franchise.toString();
      if (studentFranchiseId !== userFranchiseId) {
        return res.status(403).json({ success: false, message: 'Not authorized to download this ID card' });
      }
    }

    // Check permissions - student can only download their own ID card
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user.id }).select('_id');
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student profile not found' });
      }
      if (idCard.student && idCard.student._id.toString() !== student._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to download this ID card' });
      }
    }

    const studentName = `${idCard.student.personalInfo.firstName}_${idCard.student.personalInfo.lastName}`.replace(/ /g, '_');
    return sendStoredFile(
      res,
      idCard,
      'image/png',
      `attachment; filename="ID_Card_${studentName}.png"`
    );

  } catch (error) {
    console.error('Error downloading ID card:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete generated ID card
// @route   DELETE /api/id-cards/:id
// @access  Private/Admin/FranchiseAdmin
exports.deleteIdCard = async (req, res) => {
  try {
    const idCard = await IdCard.findById(req.params.id)
      .populate({ path: 'student', populate: { path: 'franchise', select: '_id' } });
    
    if (!idCard) {
      return res.status(404).json({
        success: false,
        message: 'ID Card not found'
      });
    }

    // Check permissions - school admin can only delete ID cards for their own students
    if (isSchoolTenantUser(req.user)) {
      const studentFranchiseId = idCard.student.franchise._id.toString();
      const userFranchiseId = req.user.franchise.toString();
      if (studentFranchiseId !== userFranchiseId) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this ID card' });
      }
    }

    await IdCard.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'ID Card deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ID card:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const template = await IdCardTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check permissions
    if (isSchoolTenantUser(req.user) && template.franchise.toString() !== req.user.franchise.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this template'
      });
    }

    // Soft delete by setting isActive to false
    await IdCardTemplate.findByIdAndUpdate(req.params.id, { isActive: false });

    res.status(200).json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Preview ID card inline (image/png)
// @route   GET /api/id-cards/preview/:id
// @access  Private/Admin/FranchiseAdmin/Student
exports.previewIdCard = async (req, res) => {
  try {
    const idCard = await IdCard.findById(req.params.id)
      .populate({ path: 'student', select: 'personalInfo franchise user', populate: { path: 'franchise', select: '_id' } });

    if (!idCard) {
      return res.status(404).json({ success: false, message: 'ID Card not found' });
    }

    if (isSchoolTenantUser(req.user)) {
      const studentFranchiseId = idCard.student?.franchise?._id?.toString();
      const userFranchiseId = req.user.franchise?.toString();
      if (studentFranchiseId && userFranchiseId && studentFranchiseId !== userFranchiseId) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this ID card' });
      }
    }

    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user.id }).select('_id');
      if (student && idCard.student && idCard.student._id.toString() !== student._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this ID card' });
      }
    }

    return sendStoredFile(res, idCard, 'image/png');
  } catch (error) {
    console.error('Error previewing ID card:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get my generated ID card
// @route   GET /api/id-cards/my
// @access  Private/Student
exports.getMyIdCard = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user.id }).select('_id');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    let idCards = await IdCard.find({ student: student._id })
      .populate('template', 'name')
      .sort('-issueDate')
      .limit(1)
      .lean();
    let idCard = idCards[0];

    // If ID card is not yet generated, auto-generate on demand using default template!
    if (!idCard) {
      try {
        const fullStudent = await loadStudentForIdCard(student._id);
        if (fullStudent) {
          const template = await resolveTemplateForStudent(null, fullStudent.franchise?._id);
          const idCardBuffer = await generateIdCardImage(fullStudent, template, {});
          const newCard = await persistIdCardBuffer({
            studentId: fullStudent._id,
            template,
            franchiseId: fullStudent.franchise?._id,
            buffer: idCardBuffer
          });
          idCard = await IdCard.findById(newCard._id).populate('template', 'name').lean();
        }
      } catch (genErr) {
        console.warn('Auto-generation of student ID card failed:', genErr.message);
      }
    }

    if (!idCard) {
      return res.status(404).json({
        success: false,
        message: 'No ID card found for this student'
      });
    }

    res.status(200).json({
      success: true,
      data: idCard
    });

  } catch (error) {
    console.error('Error fetching student ID card:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Helper function to generate ID card image
async function preloadIdCardImages(student, template) {
  const fieldNames = new Set((template.fields || []).map((f) => f?.fieldName));
  const loads = [];

  if ((fieldNames.has('studentPhoto') || fieldNames.has('photo')) && student.personalInfo?.photo) {
    loads.push(
      loadCanvasImage(loadImage, student.personalInfo.photo).then((img) => {
        if (img) return ['photo', img];
        return null;
      })
    );
  }

  if (fieldNames.has('instituteLogo') && student.franchise?.logo) {
    loads.push(
      loadCanvasImage(loadImage, student.franchise.logo).then((img) => {
        if (img) return ['logo', img];
        return null;
      })
    );
  }

  const entries = (await Promise.all(loads)).filter(Boolean);
  return Object.fromEntries(entries);
}

async function generateIdCardImage(student, template, customFieldValues = {}) {
  try {
    const isDefault = !template || !template.templateImage || template.useDefaultStyling || (template.name && template.name.toLowerCase().includes('default'));
    if (isDefault) {
      return await renderDefaultIdCardCanvas(student, customFieldValues);
    }

    const [templateImage, preloaded] = await Promise.all([
      loadTemplateImageForCanvas(
        loadImage,
        template.templateImage,
        template._id
          ? async (url) => {
              await IdCardTemplate.findByIdAndUpdate(template._id, { templateImage: url });
              template.templateImage = url;
            }
          : null
      ),
      preloadIdCardImages(student, template)
    ]);

    const canvas = createCanvas(templateImage.width, templateImage.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(templateImage, 0, 0);

    if (template.fields && Array.isArray(template.fields)) {
      for (const field of sortFieldsByZIndex(template.fields)) {
        if (field) {
          drawField(ctx, field, student, preloaded, customFieldValues);
        }
      }
    }

    return canvas.toBuffer('image/png');
  } catch (error) {
    console.error('Error in generateIdCardImage:', error);
    throw error;
  }
}

// Helper function to draw individual field
function drawField(ctx, field, student, preloaded = {}, customFieldValues = {}) {
  try {
    if (!field || !field.fieldName) {
      console.warn('Invalid field data:', field);
      return;
    }

    if (field.fieldType === 'customText') {
      drawTemplateTextField(ctx, field, resolveCustomFieldValue(field, customFieldValues));
      return;
    }

    const { x, y, width, height, fontSize, fontFamily, fontWeight, color, alignment } = field;
    
    // Validate required properties
    if (x === undefined || y === undefined || fontSize === undefined) {
      console.warn('Missing required field properties:', field);
      return;
    }
    
    ctx.fillStyle = color || '#000000';
    ctx.font = `${fontWeight || 'normal'} ${fontSize}px ${fontFamily || 'Arial'}`;
    ctx.textAlign = alignment || 'left';
    ctx.textBaseline = 'top'; // Ensure y-coordinate is the top of the text
    
    let text = '';
    
    // Get field value based on field name
    switch (field.fieldName) {
      case 'studentId':
        text = student.studentId || '';
        break;
      case 'rollNumber':
      case 'enrollmentNumber':
        text = student.enrollmentNumber || student.studentId || '';
        break;
      case 'course':
        // Course name removed as student can enroll in multiple courses
        text = '';
        break;
      case 'batch':
        text = student.batch?.name || student.batch || student.enrolledCourses?.[0]?.batch?.name || '';
        break;
      case 'phone':
      case 'mobile':
        text = student.contactInfo?.mobile || '';
        break;
      case 'email':
        text = student.contactInfo?.email || '';
        break;
      case 'address':
        // Handle address field - extract actual address string from student data
        let addressText = '';
        if (student.contactInfo?.address) {
          if (typeof student.contactInfo.address === 'string') {
            addressText = student.contactInfo.address;
          } else if (typeof student.contactInfo.address === 'object') {
            // If address is an object, try to construct address from its properties
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
        text = addressText;
        break;
      case 'studentName':
      case 'fullName':
        text = student.personalInfo ? `${student.personalInfo.firstName || ''} ${student.personalInfo.lastName || ''}`.trim() : '';
        break;
      case 'firstName':
        text = student.personalInfo?.firstName || '';
        break;
      case 'lastName':
        text = student.personalInfo?.lastName || '';
        break;
      case 'dob':
      case 'dateOfBirth':
        text = student.personalInfo?.dateOfBirth 
          ? new Date(student.personalInfo.dateOfBirth).toLocaleDateString()
          : '';
        break;
      case 'bloodGroup':
        text = student.personalInfo?.bloodGroup || '';
        break;
      case 'fatherName':
        text = student.personalInfo?.fatherName || '';
        break;
      case 'motherName':
        text = student.personalInfo?.motherName || '';
        break;
      case 'admissionDate':
        text = student.admissionDate 
          ? new Date(student.admissionDate).toLocaleDateString()
          : '';
        break;
      case 'expiryDate':
        text = student.expiryDate 
          ? new Date(student.expiryDate).toLocaleDateString()
          : '';
        break;
      case 'gender':
        text = student.personalInfo?.gender || '';
        break;
      case 'aadhaarNumber':
        text = student.personalInfo?.aadhaarNumber || '';
        break;
      case 'franchiseName':
        text = student.franchise?.name || '';
        break;
      case 'enrolledCourses':
        // Course name removed as student can enroll in multiple courses
        text = '';
        break;
      case 'studentPhoto':
      case 'photo':
        if (preloaded.photo) {
          drawSharedImage(ctx, field, preloaded.photo);
        }
        return;
      case 'instituteLogo':
        if (preloaded.logo) {
          drawSharedImage(ctx, { ...field, objectFit: 'contain' }, preloaded.logo);
        }
        return;
      case 'signature':
        // Handle signature if available
        return;
      default:
        text = '';
    }
    
    if (text) {
      drawTemplateTextField(ctx, field, String(text));
    }
  } catch (error) {
    console.error('Error drawing field:', field, error);
  }
}
