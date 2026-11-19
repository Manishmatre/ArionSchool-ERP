const Student = require('../models/Student');
const StudentEnrollment = require('../models/StudentEnrollment');
const StudentPromotion = require('../models/StudentPromotion');
const SchoolClass = require('../models/SchoolClass');
const Section = require('../models/Section');
const AcademicSession = require('../models/AcademicSession');
const StudentMark = require('../models/StudentMark');

// @desc    Get students eligible for promotion in a specific class and session
// @route   GET /api/promotions/eligible-students
// @access  Private (super_admin, school_admin, principal)
exports.getPromotionEligibleStudents = async (req, res) => {
  try {
    const { sessionId, classId, sectionId } = req.query;
    const franchiseId = req.user.franchise?._id || req.user.franchise;

    if (!sessionId || !classId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both sessionId and classId'
      });
    }

    const query = {
      schoolClass: classId,
      status: { $in: ['active', 'promoted', 'detained'] }
    };
    if (franchiseId && !['super_admin', 'school_owner'].includes(req.user.role)) {
      query.franchise = franchiseId;
    }
    if (sectionId) {
      query.section = sectionId;
    }

    const students = await Student.find(query)
      .populate('schoolClass', 'name code order')
      .populate('section', 'name')
      .sort({ rollNumber: 1, 'personalInfo.firstName': 1 });

    // Find next sequential class if available
    const currentClass = await SchoolClass.findById(classId);
    let nextClass = null;
    if (currentClass) {
      nextClass = await SchoolClass.findOne({
        franchise: currentClass.franchise,
        order: { $gt: currentClass.order }
      }).sort({ order: 1 });
    }

    // Retrieve mark statistics for each student
    const studentList = await Promise.all(students.map(async (st) => {
      // Find marks for this student
      const marks = await StudentMark.find({ student: st._id });
      let totalObtained = 0;
      let totalMax = 0;

      marks.forEach(m => {
        totalObtained += (m.obtainedMarks || 0);
        totalMax += (m.maxMarks || 100);
      });

      const percentage = totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(1)) : 0;
      let grade = 'N/A';
      let suggestedDecision = 'promoted';

      if (totalMax > 0) {
        if (percentage >= 91) grade = 'A1';
        else if (percentage >= 81) grade = 'A2';
        else if (percentage >= 71) grade = 'B1';
        else if (percentage >= 61) grade = 'B2';
        else if (percentage >= 51) grade = 'C1';
        else if (percentage >= 41) grade = 'C2';
        else if (percentage >= 33) grade = 'D';
        else {
          grade = 'E';
          suggestedDecision = 'detained';
        }
      }

      return {
        _id: st._id,
        studentId: st.studentId,
        enrollmentNumber: st.enrollmentNumber,
        admissionNumber: st.admissionNumber,
        rollNumber: st.rollNumber,
        name: `${st.personalInfo?.firstName || ''} ${st.personalInfo?.lastName || ''}`.trim(),
        currentClass: st.schoolClass ? { _id: st.schoolClass._id, name: st.schoolClass.name } : null,
        currentSection: st.section ? { _id: st.section._id, name: st.section.name } : null,
        suggestedTargetClass: nextClass ? { _id: nextClass._id, name: nextClass.name } : null,
        percentage,
        grade,
        suggestedDecision
      };
    }));

    res.status(200).json({
      success: true,
      count: studentList.length,
      currentClass: currentClass ? { _id: currentClass._id, name: currentClass.name } : null,
      suggestedNextClass: nextClass ? { _id: nextClass._id, name: nextClass.name } : null,
      data: studentList
    });
  } catch (error) {
    console.error('Error fetching eligible promotion students:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Process batch student promotion and academic year rollover
// @route   POST /api/promotions/process-batch
// @access  Private (super_admin, school_admin, principal)
exports.processPromotionBatch = async (req, res) => {
  try {
    const { previousSessionId, nextSessionId, fromClassId, toClassId, promotions } = req.body;
    const franchiseId = req.user.franchise?._id || req.user.franchise;

    if (!previousSessionId || !nextSessionId || !fromClassId || !Array.isArray(promotions) || promotions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide previousSessionId, nextSessionId, fromClassId and a non-empty promotions array'
      });
    }

    if (String(previousSessionId) === String(nextSessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Previous session and next session cannot be the same'
      });
    }

    const prevSession = await AcademicSession.findById(previousSessionId);
    const nxtSession = await AcademicSession.findById(nextSessionId);
    if (!prevSession || !nxtSession) {
      return res.status(404).json({ success: false, message: 'Invalid academic sessions specified' });
    }

    const batchNumber = `PRM-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const details = [];
    let promotedCount = 0;
    let detainedCount = 0;

    for (const item of promotions) {
      const { studentId, decision, targetClassId, targetSectionId, remarks } = item;
      const student = await Student.findById(studentId);
      if (!student) continue;

      const studentName = `${student.personalInfo?.firstName || ''} ${student.personalInfo?.lastName || ''}`.trim();
      const finalToClass = decision === 'promoted' ? (targetClassId || toClassId) : (decision === 'detained' ? fromClassId : null);

      // 1. Record or update enrollment for previous session
      await StudentEnrollment.findOneAndUpdate(
        { student: student._id, academicSession: previousSessionId },
        {
          student: student._id,
          academicSession: previousSessionId,
          schoolClass: fromClassId,
          section: student.section,
          rollNumber: student.rollNumber,
          status: decision,
          remarks: remarks || '',
          promotedTo: finalToClass ? {
            academicSession: nextSessionId,
            schoolClass: finalToClass,
            section: targetSectionId,
            promotedAt: new Date()
          } : undefined,
          franchise: student.franchise || franchiseId
        },
        { upsert: true, new: true }
      );

      // 2. Perform student state transition based on decision
      if (decision === 'promoted') {
        promotedCount++;
        if (finalToClass) {
          student.schoolClass = finalToClass;
        }
        if (targetSectionId) {
          student.section = targetSectionId;
        }
        student.status = 'active';
        await student.save();

        // Create new active enrollment in next session
        await StudentEnrollment.findOneAndUpdate(
          { student: student._id, academicSession: nextSessionId },
          {
            student: student._id,
            academicSession: nextSessionId,
            schoolClass: finalToClass || student.schoolClass,
            section: targetSectionId || student.section,
            rollNumber: student.rollNumber,
            status: 'active',
            franchise: student.franchise || franchiseId
          },
          { upsert: true, new: true }
        );
      } else if (decision === 'detained') {
        detainedCount++;
        student.schoolClass = fromClassId;
        if (targetSectionId) {
          student.section = targetSectionId;
        }
        student.status = 'active';
        await student.save();

        // Create retained enrollment in next session
        await StudentEnrollment.findOneAndUpdate(
          { student: student._id, academicSession: nextSessionId },
          {
            student: student._id,
            academicSession: nextSessionId,
            schoolClass: fromClassId,
            section: targetSectionId || student.section,
            rollNumber: student.rollNumber,
            status: 'active',
            franchise: student.franchise || franchiseId
          },
          { upsert: true, new: true }
        );
      } else if (decision === 'graduated') {
        student.status = 'alumni';
        await student.save();
      } else if (decision === 'withdrawn') {
        student.status = 'withdrawn';
        await student.save();
      }

      details.push({
        student: student._id,
        studentName,
        enrollmentNumber: student.enrollmentNumber,
        fromClass: fromClassId,
        fromSection: student.section,
        toClass: finalToClass,
        toSection: targetSectionId,
        decision,
        remarks: remarks || ''
      });
    }

    const promotionRecord = await StudentPromotion.create({
      batchNumber,
      previousSession: previousSessionId,
      nextSession: nextSessionId,
      fromClass: fromClassId,
      toClass: toClassId || null,
      promotedBy: req.user._id,
      promotionDate: new Date(),
      totalStudents: details.length,
      promotedCount,
      detainedCount,
      details,
      franchise: franchiseId || req.user.franchise
    });

    res.status(201).json({
      success: true,
      message: `Promotion batch ${batchNumber} processed successfully. ${promotedCount} promoted, ${detainedCount} detained.`,
      data: promotionRecord
    });
  } catch (error) {
    console.error('Error processing promotion batch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get promotion history logs
// @route   GET /api/promotions/history
// @access  Private (super_admin, school_admin, principal)
exports.getPromotionHistory = async (req, res) => {
  try {
    const franchiseId = req.user.franchise?._id || req.user.franchise;
    const query = {};
    if (franchiseId && !['super_admin', 'school_owner'].includes(req.user.role)) {
      query.franchise = franchiseId;
    }

    const history = await StudentPromotion.find(query)
      .populate('previousSession', 'sessionName')
      .populate('nextSession', 'sessionName')
      .populate('fromClass', 'name code')
      .populate('toClass', 'name code')
      .populate('promotedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    console.error('Error fetching promotion history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
