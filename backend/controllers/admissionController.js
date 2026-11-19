const Admission = require('../models/Admission');
const Student = require('../models/Student');
const User = require('../models/User');
const Franchise = require('../models/SchoolCampus');
const { isSchoolTenantUser, getSchoolTenantId } = require('../utils/tenantAccess');
const AcademicSession = require('../models/AcademicSession');
const SchoolClass = require('../models/SchoolClass');
const Section = require('../models/Section');

const isSingleSchoolTenant = (user) => isSchoolTenantUser(user) && !['school_owner', 'super_admin'].includes(user?.role);

const getAdmissionScope = (user) => isSingleSchoolTenant(user)
  ? { franchise: getSchoolTenantId(user) || null }
  : {};

const findAdmissionForUser = (user, id) => Admission.findOne({
  _id: id,
  ...getAdmissionScope(user)
});

const resolveAdmissionCampus = async (req, center) => {
  const assigned = isSingleSchoolTenant(req.user) ? getSchoolTenantId(req.user) : null;
  const requestedId = assigned || req.body.campusId || req.body.franchise || req.user?.franchise;
  if (requestedId) return Franchise.findOne({ _id: requestedId, status: 'active' });

  const searchTerm = String(center || '').trim();
  if (searchTerm) {
    const exact = await Franchise.findOne({ status: 'active', $or: [
      { name: { $regex: `^${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
      { code: { $regex: `^${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }
    ] });
    if (exact) return exact;
  }
  const activeCampuses = await Franchise.find({ status: 'active' }).select('_id').limit(2);
  return activeCampuses.length === 1 ? Franchise.findById(activeCampuses[0]._id) : null;
};

// @desc    Create new admission application
// @route   POST /api/admissions
// @access  Public
exports.createAdmission = async (req, res, next) => {
  try {
    const { fullName, email, phone, course, city, state, center, message } = req.body;
    const campus = await resolveAdmissionCampus(req, center);
    if (!campus) return res.status(400).json({ success: false, message: 'Choose an active school campus for this application' });

    // Check if admission already exists with same email or phone
    const existingAdmission = await Admission.findOne({
      franchise: campus._id,
      $or: [{ email }, { phone }],
      status: { $in: ['pending', 'contacted', 'verified', 'approved'] }
    });

    if (existingAdmission) {
      return res.status(400).json({
        success: false,
        message: 'An active admission application already exists with this email or phone number'
      });
    }

    const admission = await Admission.create({
      fullName,
      email,
      phone,
      course,
      city,
      state,
      center,
      franchise: campus._id,
      message,
      source: req.user ? 'Student Panel' : 'Website'
    });

    res.status(201).json({
      success: true,
      message: 'Admission application submitted successfully! We will contact you within 24 hours.',
      data: admission
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all admission applications
// @route   GET /api/admissions
// @access  Private (Admin)
exports.getAllAdmissions = async (req, res, next) => {
  try {
    let query = {};
    if (isSingleSchoolTenant(req.user)) query.franchise = getSchoolTenantId(req.user) || null;

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by priority
    if (req.query.priority) {
      query.priority = req.query.priority;
    }

    // Filter by course
    if (req.query.course) {
      query.course = { $regex: req.query.course, $options: 'i' };
    }

    // Filter by center
    if (req.query.center) {
      query.center = { $regex: req.query.center, $options: 'i' };
    }

    // Filter by assigned user
    if (req.query.assignedTo) {
      query.assignedTo = req.query.assignedTo;
    }

    // Search by name, email, or phone
    if (req.query.search) {
      query.$or = [
        { fullName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const total = await Admission.countDocuments(query);

    const admissions = await Admission.find(query)
      .populate('assignedTo', 'name email')
      .populate('convertedToStudent', 'studentId personalInfo')
      .populate('notes.addedBy', 'name')
      .sort('-createdAt')
      .limit(limit)
      .skip(startIndex)
      .lean();

    // Pagination result
    const pagination = {};
    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: admissions.length,
      total,
      pagination,
      data: admissions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single admission
// @route   GET /api/admissions/:id
// @access  Private (Admin)
exports.getAdmission = async (req, res, next) => {
  try {
    const admission = await findAdmissionForUser(req.user, req.params.id)
      .populate('assignedTo', 'name email mobile')
      .populate('convertedToStudent')
      .populate('notes.addedBy', 'name');

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: 'Admission application not found'
      });
    }

    res.status(200).json({
      success: true,
      data: admission
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update admission
// @route   PUT /api/admissions/:id
// @access  Private (Admin)
exports.updateAdmission = async (req, res, next) => {
  try {
    let admission = await findAdmissionForUser(req.user, req.params.id);

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: 'Admission application not found'
      });
    }

    // Update fields
    const allowedFields = ['status', 'priority', 'assignedTo', 'followUpDate'];
    const updates = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.assignedTo) {
      const assigneeQuery = { _id: updates.assignedTo, isActive: true };
      if (isSingleSchoolTenant(req.user)) assigneeQuery.franchise = getSchoolTenantId(req.user) || null;
      const assignee = await User.findOne(assigneeQuery);
      if (!assignee) return res.status(400).json({ success: false, message: 'Assigned user must be active in this school' });
    }

    admission = await Admission.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');

    res.status(200).json({
      success: true,
      message: 'Admission application updated successfully',
      data: admission
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add note to admission
// @route   POST /api/admissions/:id/notes
// @access  Private (Admin)
exports.addNote = async (req, res, next) => {
  try {
    const admission = await findAdmissionForUser(req.user, req.params.id);

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: 'Admission application not found'
      });
    }

    admission.notes.push({
      note: req.body.note,
      addedBy: req.user.id
    });

    await admission.save();

    const updatedAdmission = await Admission.findById(req.params.id)
      .populate('notes.addedBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: updatedAdmission
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete admission
// @route   DELETE /api/admissions/:id
// @access  Private (Admin)
exports.deleteAdmission = async (req, res, next) => {
  try {
    const admission = await findAdmissionForUser(req.user, req.params.id);

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: 'Admission application not found'
      });
    }

    await admission.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Admission application deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get admission statistics
// @route   GET /api/admissions/stats
// @access  Private (Admin)
exports.getAdmissionStats = async (req, res, next) => {
  try {
    const match = isSingleSchoolTenant(req.user) ? { franchise: getSchoolTenantId(req.user) || null } : {};
    const stats = await Admission.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalAdmissions = await Admission.countDocuments(match);
    const todayAdmissions = await Admission.countDocuments({
      ...match,
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });

    const weekAdmissions = await Admission.countDocuments({
      ...match,
      createdAt: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    });

    const monthAdmissions = await Admission.countDocuments({
      ...match,
      createdAt: {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    });

    res.status(200).json({
      success: true,
      data: {
        statusBreakdown: stats,
        total: totalAdmissions,
        today: todayAdmissions,
        thisWeek: weekAdmissions,
        thisMonth: monthAdmissions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Convert admission to student
// @route   POST /api/admissions/:id/convert
// @access  Private (Admin)
exports.convertToStudent = async (req, res, next) => {
  try {
    const admission = await findAdmissionForUser(req.user, req.params.id);

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: 'Admission application not found'
      });
    }

    if (admission.convertedToStudent) {
      return res.status(400).json({
        success: false,
        message: 'This admission has already been converted to a student'
      });
    }

    // Determine school / school
    let franchiseId = isSingleSchoolTenant(req.user)
      ? getSchoolTenantId(req.user)
      : admission.franchise || req.user.franchise;
    if (!franchiseId) {
      const defaultFranchise = await Franchise.findOne({ status: 'active' });
      if (defaultFranchise) franchiseId = defaultFranchise._id;
    }

    if (admission.franchise && admission.franchise.toString() !== franchiseId.toString()) {
      return res.status(403).json({ success: false, message: 'Admission belongs to a different school campus' });
    }
    const [validSession, validClass, validSection] = await Promise.all([
      admission.academicSession ? AcademicSession.exists({ _id: admission.academicSession, franchise: franchiseId }) : true,
      admission.schoolClass ? SchoolClass.exists({ _id: admission.schoolClass, franchise: franchiseId }) : true,
      admission.section ? Section.exists({ _id: admission.section, franchise: franchiseId }) : true
    ]);
    if (!validSession || !validClass || !validSection) {
      return res.status(400).json({ success: false, message: 'Admission class, section, or academic session must belong to the selected school' });
    }

    if (!franchiseId) {
      return res.status(400).json({
        success: false,
        message: 'A valid school or school must be assigned to confirm admission'
      });
    }

    // Extract first and last names
    const rawName = (admission.fullName || 'New Student').trim();
    const nameParts = rawName.split(' ');
    const firstName = nameParts[0] || 'Student';
    const lastName = nameParts.slice(1).join(' ') || '.';

    // Year for ID generation
    const year = new Date().getFullYear();

    // Generate unique student ID and enrollment number
    const lastStudent = await Student.findOne({ studentId: { $regex: '^SES-STU-' + year + '-' } })
      .sort({ studentId: -1 })
      .select('studentId');

    let nextNumber = 1;
    if (lastStudent && lastStudent.studentId) {
      const parts = lastStudent.studentId.split('-');
      if (parts.length === 4) {
        nextNumber = parseInt(parts[3], 10) + 1;
      }
    }

    const studentId = 'SES-STU-' + year + '-' + String(nextNumber).padStart(4, '0');
    const enrollmentNumber = 'SES-ENR-' + year + '-' + String(nextNumber).padStart(4, '0');
    const admissionNumber = admission.admissionNumber || ('SES-ADM-' + year + '-' + String(nextNumber).padStart(4, '0'));

    // 1. Create or link Student User Account
    const cleanId = studentId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const studentEmail = (admission.email || ('student.' + cleanId + '@seseducare.com')).toLowerCase().trim();
    let studentUser = await User.findOne({ email: studentEmail });
    const studentPlainPassword = 'Student@' + year;
    const parentPhone = admission.fatherMobile || admission.motherMobile || admission.guardianMobile || admission.phone;

    if (!studentUser) {
      studentUser = new User({
        name: rawName,
        email: studentEmail,
        mobile: admission.phone && admission.phone !== parentPhone ? admission.phone : undefined,
        password: studentPlainPassword,
        role: 'student',
        franchise: franchiseId
      });
      await studentUser.save();
    } else if (studentUser.role !== 'student' || studentUser.franchise?.toString() !== franchiseId.toString()) {
      return res.status(409).json({ success: false, message: 'The student email is already linked to another account or school' });
    }

    // 2. Create or link Parent User Account if phone available
    let parentUser = null;
    if (parentPhone) {
      const parentEmail = 'parent.' + parentPhone + '@seseducare.com';
      parentUser = await User.findOne({ role: 'parent', franchise: franchiseId, $or: [{ mobile: parentPhone }, { email: parentEmail }] });
      if (!parentUser) {
        const mobileOwner = await User.findOne({ mobile: parentPhone }).select('role franchise');
        if (mobileOwner && (mobileOwner.role !== 'student' || mobileOwner.franchise?.toString() !== franchiseId.toString())) {
          return res.status(409).json({ success: false, message: 'The guardian contact is already linked to another account or school' });
        }
        const parentName = admission.fatherName || admission.guardianName || admission.motherName || ('Parent of ' + rawName);
        parentUser = new User({
          name: parentName,
          email: parentEmail,
          mobile: mobileOwner ? undefined : parentPhone,
          password: 'Parent@' + year,
          role: 'parent',
          franchise: franchiseId,
          linkedStudents: []
        });
        await parentUser.save();
      } else if (parentUser.role !== 'parent' || parentUser.franchise?.toString() !== franchiseId.toString()) {
        return res.status(409).json({ success: false, message: 'The guardian contact is already linked to another account or school' });
      }
    }

    // 3. Create Student record
    const student = new Student({
      user: studentUser._id,
      studentId,
      enrollmentNumber,
      admissionNumber,
      admissionDate: new Date(),
      session: year + ' - ' + (year + 1),
      academicSession: admission.academicSession,
      schoolClass: admission.schoolClass,
      section: admission.section,
      franchise: franchiseId,
      parent: parentUser ? parentUser._id : undefined,
      personalInfo: {
        firstName,
        lastName,
        fatherName: admission.fatherName,
        motherName: admission.motherName,
        dateOfBirth: admission.dob,
        gender: admission.gender || 'Other',
        bloodGroup: admission.bloodGroup
      },
      contactInfo: {
        email: studentEmail,
        mobile: admission.phone || undefined,
        address: {
          city: admission.city || '',
          state: admission.state || '',
          country: 'India'
        }
      },
      guardianInfo: {
        name: admission.guardianName || admission.fatherName || admission.motherName,
        mobile: parentPhone,
        email: admission.email,
        relation: admission.fatherName ? 'Father' : admission.motherName ? 'Mother' : 'Guardian'
      },
      fees: {
        totalFees: admission.admissionFee?.amount || 0,
        paidAmount: admission.admissionFee?.isPaid ? (admission.admissionFee?.amount || 0) : 0,
        registrationFee: admission.admissionFee?.amount || 0,
        registrationPaid: admission.admissionFee?.isPaid ? (admission.admissionFee?.amount || 0) : 0
      },
      status: 'active'
    });

    const savedStudent = await student.save();

    // Link student to parent if created
    if (parentUser) {
      if (!parentUser.linkedStudents) parentUser.linkedStudents = [];
      if (!parentUser.linkedStudents.includes(savedStudent._id)) {
        parentUser.linkedStudents.push(savedStudent._id);
        await parentUser.save();
      }
    }

    // Update Admission record
    admission.convertedToStudent = savedStudent._id;
    admission.admissionNumber = admissionNumber;
    admission.pipelineStage = 'confirmed';
    admission.status = 'enrolled';
    await admission.save();

    res.status(200).json({
      success: true,
      message: 'Admission successfully confirmed and enrolled as active student',
      data: {
        admission,
        student: savedStudent,
        studentCredentials: {
          username: studentEmail,
          temporaryPassword: studentPlainPassword
        },
        parentCredentials: parentUser ? {
          username: parentUser.email || parentUser.mobile,
          role: 'parent'
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};
