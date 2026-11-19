const TimetableEntry = require('../models/TimetableEntry');
const SchoolClass = require('../models/SchoolClass');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const Staff = require('../models/Staff');

const getTenantFranchise = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

// ==========================================
// 1. GET TIMETABLE
// ==========================================
exports.getTimetable = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};

    if (req.query.schoolClass) query.schoolClass = req.query.schoolClass;
    if (req.query.section) query.section = req.query.section;
    if (['teacher', 'class_teacher'].includes(req.user.role)) {
      const staff = await Staff.findOne({ user: req.user._id }).select('_id').lean();
      query.teacher = staff?._id || null;
    } else if (req.query.teacher) {
      query.teacher = req.query.teacher;
    }
    if (req.query.dayOfWeek) query.dayOfWeek = req.query.dayOfWeek;
    if (req.query.academicSession) query.academicSession = req.query.academicSession;

    const entries = await TimetableEntry.find(query)
      .populate('schoolClass', 'name code')
      .populate('section', 'name')
      .populate('subject', 'name code isPractical')
      .populate('teacher', 'personalInfo.firstName personalInfo.lastName staffId')
      .sort({ dayOfWeek: 1, periodNumber: 1 });

    res.status(200).json({
      success: true,
      count: entries.length,
      data: entries
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. CREATE / UPDATE SINGLE ENTRY (MANUAL EDITING)
// ==========================================
exports.saveTimetableEntry = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const {
      _id,
      academicSession,
      schoolClass,
      section,
      subject,
      teacher,
      dayOfWeek,
      periodNumber,
      startTime,
      endTime,
      roomNumber
    } = req.body;

    // Check teacher conflict: Teacher cannot be teaching another class at the same day & period
    const teacherConflictQuery = {
      franchise: franchiseId,
      teacher,
      dayOfWeek,
      periodNumber,
      isActive: true
    };
    if (_id) teacherConflictQuery._id = { $ne: _id };

    const teacherConflict = await TimetableEntry.findOne(teacherConflictQuery)
      .populate('schoolClass', 'name')
      .populate('section', 'name')
      .populate('teacher', 'personalInfo.firstName personalInfo.lastName');

    if (teacherConflict) {
      return res.status(409).json({
        success: false,
        message: `Conflict detected: Teacher ${teacherConflict.teacher?.personalInfo?.firstName || 'Assigned'} is already booked for Class ${teacherConflict.schoolClass?.name}-${teacherConflict.section?.name} on ${dayOfWeek} Period ${periodNumber}.`
      });
    }

    // Check section conflict: Section cannot have two subjects in the same period
    const sectionConflictQuery = {
      franchise: franchiseId,
      section,
      dayOfWeek,
      periodNumber,
      isActive: true
    };
    if (_id) sectionConflictQuery._id = { $ne: _id };

    const sectionConflict = await TimetableEntry.findOne(sectionConflictQuery)
      .populate('subject', 'name');

    if (sectionConflict) {
      return res.status(409).json({
        success: false,
        message: `Conflict detected: Section already has subject "${sectionConflict.subject?.name}" scheduled on ${dayOfWeek} Period ${periodNumber}.`
      });
    }

    let entry;
    if (_id) {
      entry = await TimetableEntry.findByIdAndUpdate(
        _id,
        {
          academicSession,
          schoolClass,
          section,
          subject,
          teacher,
          dayOfWeek,
          periodNumber,
          startTime,
          endTime,
          roomNumber
        },
        { new: true, runValidators: true }
      );
    } else {
      entry = await TimetableEntry.create({
        franchise: franchiseId,
        academicSession,
        schoolClass,
        section,
        subject,
        teacher,
        dayOfWeek,
        periodNumber,
        startTime,
        endTime,
        roomNumber
      });
    }

    const populated = await TimetableEntry.findById(entry._id)
      .populate('schoolClass', 'name code')
      .populate('section', 'name')
      .populate('subject', 'name code')
      .populate('teacher', 'personalInfo.firstName personalInfo.lastName');

    res.status(200).json({
      success: true,
      message: 'Timetable entry saved successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. DELETE ENTRY
// ==========================================
exports.deleteTimetableEntry = async (req, res, next) => {
  try {
    const entry = await TimetableEntry.findByIdAndDelete(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Timetable entry not found' });
    }
    res.status(200).json({ success: true, message: 'Timetable entry removed successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. CONSTRAINT-BASED SMART AUTO-GENERATION ENGINE
// ==========================================
exports.autoGenerateTimetable = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const {
      academicSession,
      schoolClass,
      section,
      workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      periodsPerDay = 6,
      periodTimings = [
        { period: 1, startTime: '08:30', endTime: '09:15' },
        { period: 2, startTime: '09:15', endTime: '10:00' },
        { period: 3, startTime: '10:00', endTime: '10:45' },
        { period: 4, startTime: '11:15', endTime: '12:00' },
        { period: 5, startTime: '12:00', endTime: '12:45' },
        { period: 6, startTime: '12:45', endTime: '01:30' }
      ],
      subjectTeacherAllocations = [], // [{ subjectId, teacherId, weeklyPeriods, roomNumber }]
      clearExisting = false
    } = req.body;

    if (!schoolClass || !section) {
      return res.status(400).json({
        success: false,
        message: 'schoolClass and section are required for timetable generation'
      });
    }

    if (subjectTeacherAllocations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one subject-teacher allocation with weekly periods is required'
      });
    }

    if (clearExisting) {
      await TimetableEntry.deleteMany({
        franchise: franchiseId,
        section
      });
    }

    // Build the inventory of period demands to place
    const demandQueue = [];
    for (const alloc of subjectTeacherAllocations) {
      const periods = Number(alloc.weeklyPeriods || 1);
      for (let i = 0; i < periods; i++) {
        demandQueue.push({
          subject: alloc.subjectId,
          teacher: alloc.teacherId,
          roomNumber: alloc.roomNumber || ''
        });
      }
    }

    // Shuffle demands slightly to distribute naturally
    demandQueue.sort(() => Math.random() - 0.5);

    // Fetch existing entries across all sections for this school to avoid teacher collisions
    const existingSchoolEntries = await TimetableEntry.find({
      franchise: franchiseId,
      isActive: true
    }).select('teacher section dayOfWeek periodNumber');

    // Create a fast lookup set for occupied (teacher, day, period) and (section, day, period)
    const occupiedTeacherSlots = new Set();
    const occupiedSectionSlots = new Set();

    for (const entry of existingSchoolEntries) {
      occupiedTeacherSlots.add(`${entry.teacher}_${entry.dayOfWeek}_${entry.periodNumber}`);
      occupiedSectionSlots.add(`${entry.section}_${entry.dayOfWeek}_${entry.periodNumber}`);
    }

    // Subject frequency per day tracker to avoid clustering same subject 3 times in one day
    const subjectDayCount = {};

    const generatedEntries = [];
    const unallocatedDemands = [];

    // Outer loops: Distribute across days and periods
    // We iterate period-by-period across days (e.g. P1 Mon-Fri, then P2 Mon-Fri) for balanced distribution
    const allSlots = [];
    for (let p = 1; p <= periodsPerDay; p++) {
      for (const day of workingDays) {
        allSlots.push({ day, period: p });
      }
    }

    for (const demand of demandQueue) {
      let allocated = false;

      for (const slot of allSlots) {
        const slotSectionKey = `${section}_${slot.day}_${slot.period}`;
        const slotTeacherKey = `${demand.teacher}_${slot.day}_${slot.period}`;
        const subjDayKey = `${demand.subject}_${slot.day}`;

        // Heuristic checks:
        // 1. Is section free?
        if (occupiedSectionSlots.has(slotSectionKey)) continue;

        // 2. Is teacher free across entire school?
        if (occupiedTeacherSlots.has(slotTeacherKey)) continue;

        // 3. Subject day limit: max 2 periods of the same subject on the same day
        if ((subjectDayCount[subjDayKey] || 0) >= 2) continue;

        // Allocate this slot!
        occupiedSectionSlots.add(slotSectionKey);
        occupiedTeacherSlots.add(slotTeacherKey);
        subjectDayCount[subjDayKey] = (subjectDayCount[subjDayKey] || 0) + 1;

        const timing = periodTimings.find(pt => pt.period === slot.period) || {
          startTime: `${8 + slot.period}:00`,
          endTime: `${8 + slot.period}:45`
        };

        generatedEntries.push({
          franchise: franchiseId,
          academicSession,
          schoolClass,
          section,
          subject: demand.subject,
          teacher: demand.teacher,
          dayOfWeek: slot.day,
          periodNumber: slot.period,
          startTime: timing.startTime,
          endTime: timing.endTime,
          roomNumber: demand.roomNumber
        });

        allocated = true;
        break;
      }

      if (!allocated) {
        unallocatedDemands.push(demand);
      }
    }

    // Bulk insert allocated entries
    if (generatedEntries.length > 0) {
      await TimetableEntry.insertMany(generatedEntries);
    }

    const totalRequested = demandQueue.length;
    const totalAllocated = generatedEntries.length;

    res.status(201).json({
      success: true,
      message: `Timetable auto-generated successfully: ${totalAllocated}/${totalRequested} periods scheduled without conflict.`,
      stats: {
        totalRequested,
        totalAllocated,
        unallocatedCount: unallocatedDemands.length
      },
      unallocated: unallocatedDemands
    });
  } catch (error) {
    next(error);
  }
};
