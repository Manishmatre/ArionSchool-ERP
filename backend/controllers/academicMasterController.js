const AcademicSession = require('../models/AcademicSession');
const SchoolClass = require('../models/SchoolClass');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const House = require('../models/House');
const Franchise = require('../models/SchoolCampus');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const { isSchoolTenantUser, getSchoolTenantId } = require('../utils/tenantAccess');

const tenantScope = (user) => {
  if (['super_admin', 'school_owner'].includes(user?.role)) return {};
  return { franchise: getSchoolTenantId(user) || null };
};

const scopedUpdate = (req, update) => {
  const payload = { ...update };
  if (isSchoolTenantUser(req.user)) delete payload.franchise;
  return payload;
};

// Helper to resolve school tenant ID from request
const getFranchiseId = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user?.role)) {
    return req.query?.franchise || req.query?.campusId || req.body?.franchise || req.body?.campusId || req.user?.franchise || null;
  }
  if (isSchoolTenantUser(req.user)) {
    return getSchoolTenantId(req.user) || null;
  }
  return req.user?.franchise || req.body?.franchise || req.query?.franchise || null;
};

// Helper to ensure an active campus exists for super_admin fallback
const ensureCampusId = async (req) => {
  let fid = getFranchiseId(req);
  if (!fid && ['super_admin', 'school_owner'].includes(req.user?.role)) {
    let defaultCampus = await Franchise.findOne({ status: 'active' }) || await Franchise.findOne();
    if (!defaultCampus) {
      defaultCampus = await Franchise.create({
        name: 'SES Educare - Main Campus',
        code: 'SES-001',
        status: 'active',
        isMainBranch: true,
        contactInfo: {
          email: req.user?.email || 'admin@seseducare.com',
          phone: '9876543210'
        },
        address: {
          street: 'Main Academic Campus Road',
          city: 'Jabalpur',
          state: 'Madhya Pradesh',
          pincode: '482001'
        }
      });
    }
    if (defaultCampus) {
      fid = defaultCampus._id;
    }
  }
  return fid;
};

// ==========================================
// 1. ACADEMIC SESSIONS
// ==========================================

exports.getAcademicSessions = async (req, res, next) => {
  try {
    const franchiseId = getFranchiseId(req);
    const query = franchiseId ? { franchise: franchiseId } : isSchoolTenantUser(req.user) ? { franchise: null } : {};

    const sessions = await AcademicSession.find(query)
      .sort({ startDate: -1 })
      .populate('franchise', 'name code');

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    next(error);
  }
};

exports.createAcademicSession = async (req, res, next) => {
  try {
    const franchiseId = await ensureCampusId(req);
    if (!franchiseId) {
      return res.status(400).json({ success: false, message: 'School/School reference required' });
    }

    const { sessionName, startDate, endDate, isCurrent, description } = req.body;

    if (isCurrent) {
      // Mark existing current sessions as false
      await AcademicSession.updateMany({ franchise: franchiseId }, { isCurrent: false });
    }

    const session = await AcademicSession.create({
      sessionName,
      startDate,
      endDate,
      isCurrent: Boolean(isCurrent),
      franchise: franchiseId,
      description
    });

    res.status(201).json({
      success: true,
      message: 'Academic session created successfully',
      data: session
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAcademicSession = async (req, res, next) => {
  try {
    const { isCurrent } = req.body;
    const session = await AcademicSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Academic session not found' });
    }

    if (!['super_admin', 'school_owner'].includes(req.user?.role)) {
      const userFid = req.user?.franchise?._id ? req.user.franchise._id.toString() : req.user?.franchise?.toString();
      if (session.franchise?.toString() !== userFid) {
        return res.status(403).json({ success: false, message: 'Not authorized to modify this session' });
      }
    }

    if (isCurrent) {
      await AcademicSession.updateMany(
        { franchise: session.franchise, _id: { $ne: session._id } },
        { isCurrent: false }
      );
    }

    const updatedSession = await AcademicSession.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Academic session updated successfully',
      data: updatedSession
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAcademicSession = async (req, res, next) => {
  try {
    const session = await AcademicSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Academic session not found' });
    }

    if (!['super_admin', 'school_owner'].includes(req.user?.role)) {
      const userFid = req.user?.franchise?._id ? req.user.franchise._id.toString() : req.user?.franchise?.toString();
      if (session.franchise?.toString() !== userFid) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this session' });
      }
    }

    // Safety check: verify no students linked to this session
    const studentCount = await Student.countDocuments({ academicSession: session._id });
    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete session: ${studentCount} students are actively linked to it`
      });
    }

    await session.deleteOne();
    res.status(200).json({
      success: true,
      message: 'Academic session deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. SCHOOL CLASSES & SECTIONS
// ==========================================

exports.getSchoolClasses = async (req, res, next) => {
  try {
    const franchiseId = getFranchiseId(req);
    const query = franchiseId ? { franchise: franchiseId } : isSchoolTenantUser(req.user) ? { franchise: null } : {};

    const classes = await SchoolClass.find(query)
      .sort({ order: 1, name: 1 })
      .populate('classTeacher', 'personalInfo.firstName personalInfo.lastName user')
      .populate('academicSession', 'sessionName isCurrent');

    // Attach sections count and list to each class
    const classIds = classes.map((c) => c._id);
    const sections = await Section.find({ schoolClass: { $in: classIds }, isActive: true })
      .populate('classTeacher', 'personalInfo.firstName personalInfo.lastName')
      .sort({ name: 1 });

    const classesWithSections = classes.map((cls) => {
      const clsObj = cls.toObject();
      clsObj.sections = sections.filter((s) => s.schoolClass.toString() === cls._id.toString());
      return clsObj;
    });

    res.status(200).json({
      success: true,
      count: classesWithSections.length,
      data: classesWithSections
    });
  } catch (error) {
    next(error);
  }
};

exports.createSchoolClass = async (req, res, next) => {
  try {
    const franchiseId = await ensureCampusId(req);
    if (!franchiseId) {
      return res.status(400).json({ success: false, message: 'School/School reference required' });
    }

    const { name, code, order, academicSession, classTeacher, description } = req.body;
    if (academicSession && !(await AcademicSession.exists({ _id: academicSession, franchise: franchiseId }))) {
      return res.status(400).json({ success: false, message: 'Selected academic session is not available in this school' });
    }
    if (classTeacher && !(await Staff.exists({ _id: classTeacher, franchise: franchiseId }))) {
      return res.status(400).json({ success: false, message: 'Selected class teacher is not available in this school' });
    }

    const newClass = await SchoolClass.create({
      name,
      code: (code || name.replace(/[^A-Za-z0-9]/g, '-')).toUpperCase(),
      order: order !== undefined ? Number(order) : 0,
      franchise: franchiseId,
      academicSession,
      classTeacher,
      description
    });

    // Auto-create default Section 'A' for convenience
    await Section.create({
      name: 'A',
      schoolClass: newClass._id,
      franchise: franchiseId,
      capacity: 40
    });

    const populatedClass = await SchoolClass.findById(newClass._id)
      .populate('academicSession', 'sessionName')
      .populate('classTeacher', 'personalInfo.firstName personalInfo.lastName');

    res.status(201).json({
      success: true,
      message: 'Class created successfully with default Section A',
      data: populatedClass
    });
  } catch (error) {
    next(error);
  }
};

exports.updateSchoolClass = async (req, res, next) => {
  try {
    const existingClass = await SchoolClass.findOne({ _id: req.params.id, ...tenantScope(req.user) });
    if (!existingClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    if (!['super_admin', 'school_owner'].includes(req.user?.role)) {
      const userFid = req.user?.franchise?._id ? req.user.franchise._id.toString() : req.user?.franchise?.toString();
      if (existingClass.franchise?.toString() !== userFid) {
        return res.status(403).json({ success: false, message: 'Not authorized to modify this class' });
      }
    }

    const updates = scopedUpdate(req, req.body);
    if (updates.academicSession && !(await AcademicSession.exists({ _id: updates.academicSession, franchise: existingClass.franchise }))) {
      return res.status(400).json({ success: false, message: 'Selected academic session is not available in this school' });
    }
    if (updates.classTeacher && !(await Staff.exists({ _id: updates.classTeacher, franchise: existingClass.franchise }))) {
      return res.status(400).json({ success: false, message: 'Selected class teacher is not available in this school' });
    }

    const updatedClass = await SchoolClass.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });
    res.status(200).json({
      success: true,
      message: 'Class updated successfully',
      data: updatedClass
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteSchoolClass = async (req, res, next) => {
  try {
    const schoolClass = await SchoolClass.findOne({ _id: req.params.id, ...tenantScope(req.user) });
    if (!schoolClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    if (!['super_admin', 'school_owner'].includes(req.user?.role)) {
      const userFid = req.user?.franchise?._id ? req.user.franchise._id.toString() : req.user?.franchise?.toString();
      if (schoolClass.franchise?.toString() !== userFid) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this class' });
      }
    }

    const studentCount = await Student.countDocuments({ schoolClass: schoolClass._id });
    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete class: ${studentCount} students are currently assigned to it`
      });
    }

    await Section.deleteMany({ schoolClass: schoolClass._id });
    await schoolClass.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Class and associated sections removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. SECTIONS
// ==========================================

exports.getSections = async (req, res, next) => {
  try {
    const franchiseId = getFranchiseId(req);
    const query = franchiseId ? { franchise: franchiseId } : isSchoolTenantUser(req.user) ? { franchise: null } : {};

    if (req.query.schoolClass) {
      query.schoolClass = req.query.schoolClass;
    }

    const sections = await Section.find(query)
      .populate('schoolClass', 'name code order')
      .populate('classTeacher', 'personalInfo.firstName personalInfo.lastName user')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: sections.length,
      data: sections
    });
  } catch (error) {
    next(error);
  }
};

exports.createSection = async (req, res, next) => {
  try {
    const franchiseId = await ensureCampusId(req);
    const { name, schoolClass, capacity, roomNumber, classTeacher } = req.body;

    const classQuery = { _id: schoolClass, ...tenantScope(req.user) };
    if (franchiseId) classQuery.franchise = franchiseId;
    const linkedClass = await SchoolClass.findOne(classQuery);
    if (!linkedClass) return res.status(400).json({ success: false, message: 'Selected class is not available in this school' });
    if (classTeacher) {
      const teacher = await Staff.findOne({ _id: classTeacher, ...tenantScope(req.user) });
      if (!teacher) return res.status(400).json({ success: false, message: 'Selected class teacher is not available in this school' });
    }

    const section = await Section.create({
      name: name.toUpperCase().trim(),
      schoolClass,
      franchise: franchiseId,
      capacity: capacity || 40,
      roomNumber,
      classTeacher
    });

    const populatedSection = await Section.findById(section._id)
      .populate('schoolClass', 'name code')
      .populate('classTeacher', 'personalInfo.firstName personalInfo.lastName');

    res.status(201).json({
      success: true,
      message: 'Section created successfully',
      data: populatedSection
    });
  } catch (error) {
    next(error);
  }
};

exports.updateSection = async (req, res, next) => {
  try {
    const current = await Section.findOne({ _id: req.params.id, ...tenantScope(req.user) });
    if (!current) return res.status(404).json({ success: false, message: 'Section not found' });
    const updates = scopedUpdate(req, req.body);
    if (updates.schoolClass) {
      const linkedClass = await SchoolClass.findOne({ _id: updates.schoolClass, franchise: current.franchise });
      if (!linkedClass) return res.status(400).json({ success: false, message: 'Selected class is not available in this school' });
    }
    if (updates.classTeacher) {
      const teacher = await Staff.findOne({ _id: updates.classTeacher, franchise: current.franchise });
      if (!teacher) return res.status(400).json({ success: false, message: 'Selected class teacher is not available in this school' });
    }
    const section = await Section.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    }).populate('schoolClass', 'name code');

    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Section updated successfully',
      data: section
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteSection = async (req, res, next) => {
  try {
    const section = await Section.findOne({ _id: req.params.id, ...tenantScope(req.user) });
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    const studentCount = await Student.countDocuments({ section: section._id });
    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete section: ${studentCount} students are assigned to it`
      });
    }

    await section.deleteOne();
    res.status(200).json({ success: true, message: 'Section removed successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. SUBJECTS
// ==========================================

exports.getSubjects = async (req, res, next) => {
  try {
    const franchiseId = getFranchiseId(req);
    const query = franchiseId ? { franchise: franchiseId } : isSchoolTenantUser(req.user) ? { franchise: null } : {};

    if (req.query.schoolClass) {
      query.schoolClasses = req.query.schoolClass;
    }

    const subjects = await Subject.find(query)
      .populate('schoolClasses', 'name code order')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects
    });
  } catch (error) {
    next(error);
  }
};

exports.createSubject = async (req, res, next) => {
  try {
    const franchiseId = await ensureCampusId(req);
    const { name, code, subjectType, schoolClasses, creditHours, passMarks, maxMarks } = req.body;

    if (schoolClasses?.length) {
      const validClasses = await SchoolClass.countDocuments({ _id: { $in: schoolClasses }, franchise: franchiseId });
      if (validClasses !== new Set(schoolClasses.map(String)).size) {
        return res.status(400).json({ success: false, message: 'All selected classes must belong to this school' });
      }
    }

    const subject = await Subject.create({
      name,
      code: (code || name.replace(/[^A-Za-z0-9]/g, '-')).toUpperCase(),
      subjectType: subjectType || 'theory',
      schoolClasses: schoolClasses || [],
      franchise: franchiseId,
      creditHours: creditHours || 4,
      passMarks: passMarks || 33,
      maxMarks: maxMarks || 100
    });

    const populated = await Subject.findById(subject._id).populate('schoolClasses', 'name code');
    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

exports.updateSubject = async (req, res, next) => {
  try {
    const current = await Subject.findOne({ _id: req.params.id, ...tenantScope(req.user) });
    if (!current) return res.status(404).json({ success: false, message: 'Subject not found' });
    const updates = scopedUpdate(req, req.body);
    if (updates.schoolClasses) {
      const validClasses = await SchoolClass.countDocuments({ _id: { $in: updates.schoolClasses }, franchise: current.franchise });
      if (validClasses !== new Set(updates.schoolClasses.map(String)).size) {
        return res.status(400).json({ success: false, message: 'All selected classes must belong to this school' });
      }
    }
    const subject = await Subject.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    }).populate('schoolClasses', 'name code');

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Subject updated successfully',
      data: subject
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, ...tenantScope(req.user) });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    await subject.deleteOne();
    res.status(200).json({ success: true, message: 'Subject removed successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. HOUSES
// ==========================================

exports.getHouses = async (req, res, next) => {
  try {
    const franchiseId = getFranchiseId(req);
    const query = franchiseId ? { franchise: franchiseId } : isSchoolTenantUser(req.user) ? { franchise: null } : {};

    const houses = await House.find(query)
      .populate('houseCaptain', 'personalInfo.firstName personalInfo.lastName studentId')
      .populate('houseIncharge', 'personalInfo.firstName personalInfo.lastName')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: houses.length,
      data: houses
    });
  } catch (error) {
    next(error);
  }
};

exports.createHouse = async (req, res, next) => {
  try {
    const franchiseId = await ensureCampusId(req);
    const { name, code, color, motto, houseCaptain, houseIncharge } = req.body;
    if (houseCaptain && !(await Student.exists({ _id: houseCaptain, franchise: franchiseId }))) {
      return res.status(400).json({ success: false, message: 'House captain must be a student in this school' });
    }
    if (houseIncharge && !(await Staff.exists({ _id: houseIncharge, franchise: franchiseId }))) {
      return res.status(400).json({ success: false, message: 'House in-charge must be staff in this school' });
    }

    const house = await House.create({
      name,
      code: (code || name.slice(0, 4)).toUpperCase(),
      color: color || '#3B82F6',
      motto,
      franchise: franchiseId,
      houseCaptain,
      houseIncharge
    });

    res.status(201).json({
      success: true,
      message: 'House created successfully',
      data: house
    });
  } catch (error) {
    next(error);
  }
};

exports.updateHouse = async (req, res, next) => {
  try {
    const current = await House.findOne({ _id: req.params.id, ...tenantScope(req.user) });
    if (!current) return res.status(404).json({ success: false, message: 'House not found' });
    const updates = scopedUpdate(req, req.body);
    if (updates.houseCaptain) {
      const student = await Student.findOne({ _id: updates.houseCaptain, franchise: current.franchise });
      if (!student) return res.status(400).json({ success: false, message: 'House captain must be a student in this school' });
    }
    if (updates.houseIncharge) {
      const teacher = await Staff.findOne({ _id: updates.houseIncharge, franchise: current.franchise });
      if (!teacher) return res.status(400).json({ success: false, message: 'House in-charge must be staff in this school' });
    }
    const house = await House.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });
    if (!house) {
      return res.status(404).json({ success: false, message: 'House not found' });
    }
    res.status(200).json({
      success: true,
      message: 'House updated successfully',
      data: house
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteHouse = async (req, res, next) => {
  try {
    const house = await House.findOne({ _id: req.params.id, ...tenantScope(req.user) });
    if (!house) {
      return res.status(404).json({ success: false, message: 'House not found' });
    }
    await house.deleteOne();
    res.status(200).json({ success: true, message: 'House removed successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. ONE-CLICK SCHOOL ONBOARDING SEEDER
// ==========================================

exports.seedSchoolDefaults = async (req, res, next) => {
  try {
    const franchiseId = await ensureCampusId(req);
    if (!franchiseId) {
      return res.status(400).json({ success: false, message: 'Target school campus required' });
    }

    const currentYear = new Date().getFullYear();

    // 1. Seed Academic Session if none exist
    let session = await AcademicSession.findOne({ franchise: franchiseId, isCurrent: true });
    if (!session) {
      session = await AcademicSession.create({
        sessionName: `${currentYear}-${currentYear + 1}`,
        startDate: new Date(`${currentYear}-04-01`),
        endDate: new Date(`${currentYear + 1}-03-31`),
        isCurrent: true,
        franchise: franchiseId,
        description: `Academic Session ${currentYear}-${currentYear + 1}`
      });
    }

    // 2. Seed Standard K-12 Grade Levels
    const standardGrades = [
      { name: 'Nursery', code: 'NUR', order: 0 },
      { name: 'LKG', code: 'LKG', order: 1 },
      { name: 'UKG', code: 'UKG', order: 2 },
      { name: 'Class 1', code: 'CLS-01', order: 3 },
      { name: 'Class 2', code: 'CLS-02', order: 4 },
      { name: 'Class 3', code: 'CLS-03', order: 5 },
      { name: 'Class 4', code: 'CLS-04', order: 6 },
      { name: 'Class 5', code: 'CLS-05', order: 7 },
      { name: 'Class 6', code: 'CLS-06', order: 8 },
      { name: 'Class 7', code: 'CLS-07', order: 9 },
      { name: 'Class 8', code: 'CLS-08', order: 10 },
      { name: 'Class 9', code: 'CLS-09', order: 11 },
      { name: 'Class 10', code: 'CLS-10', order: 12 },
      { name: 'Class 11', code: 'CLS-11', order: 13 },
      { name: 'Class 12', code: 'CLS-12', order: 14 }
    ];

    const createdClasses = [];
    for (const g of standardGrades) {
      let cls = await SchoolClass.findOne({ franchise: franchiseId, name: g.name });
      if (!cls) {
        cls = await SchoolClass.create({
          name: g.name,
          code: g.code,
          order: g.order,
          franchise: franchiseId,
          academicSession: session._id
        });
        // Create Sections A and B
        await Section.create([
          { name: 'A', schoolClass: cls._id, franchise: franchiseId, capacity: 40 },
          { name: 'B', schoolClass: cls._id, franchise: franchiseId, capacity: 40 }
        ]);
      }
      createdClasses.push(cls);
    }

    // 3. Seed Standard Subjects
    const standardSubjects = [
      { name: 'English Core', code: 'ENG-CORE', subjectType: 'theory' },
      { name: 'Mathematics', code: 'MATH-CORE', subjectType: 'theory' },
      { name: 'Hindi', code: 'HIN-CORE', subjectType: 'theory' },
      { name: 'General Science', code: 'SCI-GEN', subjectType: 'both' },
      { name: 'Social Studies', code: 'SOC-STU', subjectType: 'theory' },
      { name: 'Computer Science', code: 'CS-CORE', subjectType: 'both' },
      { name: 'Physical Education & Sports', code: 'PHY-EDU', subjectType: 'activity' }
    ];

    const classIds = createdClasses.map((c) => c._id);
    for (const sub of standardSubjects) {
      const existing = await Subject.findOne({ franchise: franchiseId, code: sub.code });
      if (!existing) {
        await Subject.create({
          ...sub,
          franchise: franchiseId,
          schoolClasses: classIds,
          maxMarks: 100,
          passMarks: 33
        });
      }
    }

    // 4. Seed Standard Houses
    const standardHouses = [
      { name: 'Red House - Shivaji', code: 'RED', color: '#EF4444', motto: 'Valor & Courage' },
      { name: 'Blue House - Tagore', code: 'BLUE', color: '#3B82F6', motto: 'Wisdom & Light' },
      { name: 'Green House - Ashoka', code: 'GREEN', color: '#10B981', motto: 'Truth & Peace' },
      { name: 'Yellow House - Raman', code: 'YELLOW', color: '#F59E0B', motto: 'Innovation & Honor' }
    ];

    for (const h of standardHouses) {
      const existing = await House.findOne({ franchise: franchiseId, code: h.code });
      if (!existing) {
        await House.create({
          ...h,
          franchise: franchiseId
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'School default academic structure (Sessions, Classes, Sections, Subjects, Houses) successfully provisioned',
      data: {
        sessionName: session.sessionName,
        classesCount: createdClasses.length,
        subjectsCount: standardSubjects.length,
        housesCount: standardHouses.length
      }
    });
  } catch (error) {
    next(error);
  }
};
