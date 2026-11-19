const SchoolExam = require('../models/SchoolExam');
const StudentMark = require('../models/StudentMark');
const ExamSeatingPlan = require('../models/ExamSeatingPlan');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

const getTenantFranchise = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

// ==========================================
// 1. EXAM CONFIGURATION
// ==========================================

exports.getExams = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};

    if (req.query.academicSession) query.academicSession = req.query.academicSession;
    if (req.query.status) query.status = req.query.status;

    const exams = await SchoolExam.find(query)
      .populate('academicSession', 'sessionName isCurrent')
      .populate('schoolClasses', 'name code order')
      .sort({ startDate: -1 });

    res.status(200).json({ success: true, count: exams.length, data: exams });
  } catch (error) {
    next(error);
  }
};

exports.createExam = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const exam = await SchoolExam.create({
      ...req.body,
      franchise: franchiseId
    });
    res.status(201).json({ success: true, message: 'Exam schedule created successfully', data: exam });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. MARKS ENTRY & BULK GRADING
// ==========================================

exports.getMarks = async (req, res, next) => {
  try {
    const { examId, schoolClassId, sectionId, subjectId } = req.query;
    const query = {};
    if (examId) query.exam = examId;
    if (schoolClassId) query.schoolClass = schoolClassId;
    if (sectionId) query.section = sectionId;
    if (subjectId) query.subject = subjectId;

    const marks = await StudentMark.find(query)
      .populate('student', 'personalInfo.firstName personalInfo.lastName studentId admissionNumber rollNumber')
      .populate('subject', 'name code')
      .sort({ 'student.rollNumber': 1 });

    res.status(200).json({ success: true, count: marks.length, data: marks });
  } catch (error) {
    next(error);
  }
};

exports.saveBulkMarks = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const { examId, schoolClassId, sectionId, subjectId, marksData, maxMarks, passMarks } = req.body;

    if (!Array.isArray(marksData) || marksData.length === 0) {
      return res.status(400).json({ success: false, message: 'Marks records array is required' });
    }

    const savedRecords = [];
    for (const item of marksData) {
      if (!item.studentId) continue;

      let record = await StudentMark.findOne({
        exam: examId,
        student: item.studentId,
        subject: subjectId
      });

      if (!record) {
        record = new StudentMark({
          exam: examId,
          student: item.studentId,
          schoolClass: schoolClassId,
          section: sectionId,
          subject: subjectId,
          franchise: franchiseId
        });
      }

      record.marksObtained = Number(item.marksObtained || 0);
      record.maxMarks = Number(maxMarks || item.maxMarks || 100);
      record.passMarks = Number(passMarks || item.passMarks || 33);
      record.isAbsent = Boolean(item.isAbsent);
      record.remarks = item.remarks;
      record.enteredBy = req.user._id;

      await record.save();
      savedRecords.push(record);
    }

    res.status(200).json({
      success: true,
      message: `Marks recorded for ${savedRecords.length} students successfully`,
      count: savedRecords.length
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. CUMULATIVE CCE REPORT CARD GENERATOR
// ==========================================

exports.getStudentReportCard = async (req, res, next) => {
  try {
    const { studentId, examId } = req.params;

    const student = await Student.findById(studentId)
      .populate('schoolClass', 'name code')
      .populate('section', 'name')
      .populate('academicSession', 'sessionName')
      .populate('franchise', 'name code address owner contactInfo');

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const exam = await SchoolExam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    const marks = await StudentMark.find({ exam: examId, student: studentId })
      .populate('subject', 'name code creditHours maxMarks passMarks');

    const totalMax = marks.reduce((acc, m) => acc + (m.maxMarks || 100), 0);
    const totalObtained = marks.reduce((acc, m) => acc + (m.marksObtained || 0), 0);
    const overallPercentage = totalMax > 0 ? Math.round(((totalObtained / totalMax) * 100) * 10) / 10 : 0;
    const allPassed = marks.every((m) => m.isPassed);

    // Compute Overall Grade
    let overallGrade = 'D';
    if (overallPercentage >= 91) overallGrade = 'A1';
    else if (overallPercentage >= 81) overallGrade = 'A2';
    else if (overallPercentage >= 71) overallGrade = 'B1';
    else if (overallPercentage >= 61) overallGrade = 'B2';
    else if (overallPercentage >= 51) overallGrade = 'C1';
    else if (overallPercentage >= 41) overallGrade = 'C2';
    else if (overallPercentage >= 33) overallGrade = 'D';
    else overallGrade = 'E';

    // Attendance Summary
    const totalAttendanceDays = await Attendance.countDocuments({ student: student._id });
    const presentDays = await Attendance.countDocuments({ student: student._id, status: { $in: ['present', 'late'] } });
    const attendancePercent = totalAttendanceDays > 0 ? Math.round((presentDays / totalAttendanceDays) * 100) : 100;

    res.status(200).json({
      success: true,
      data: {
        student: {
          fullName: student.fullName,
          studentId: student.studentId,
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber,
          schoolClass: student.schoolClass?.name,
          section: student.section?.name,
          fatherName: student.personalInfo?.fatherName,
          motherName: student.personalInfo?.motherName,
          dob: student.personalInfo?.dateOfBirth,
          school: student.franchise?.name
        },
        exam: {
          name: exam.name,
          examType: exam.examType,
          gradingScale: exam.gradingScale
        },
        marks: marks.map((m) => ({
          subjectName: m.subject?.name,
          subjectCode: m.subject?.code,
          maxMarks: m.maxMarks,
          passMarks: m.passMarks,
          marksObtained: m.marksObtained,
          percentage: m.percentage,
          grade: m.grade,
          isPassed: m.isPassed,
          isAbsent: m.isAbsent
        })),
        summary: {
          totalMax,
          totalObtained,
          overallPercentage,
          overallGrade,
          resultStatus: allPassed ? 'PASSED' : 'NEEDS IMPROVEMENT',
          attendancePercentage: `${attendancePercent}%`,
          teacherRemarks: overallPercentage >= 75 ? 'Excellent academic performance and participation.' : 'Good effort, consistent practice required in core subjects.'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. SMART EXAM SEATING PLAN
// ==========================================

exports.generateSeatingPlan = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const { examId, date, session, roomName, rows, cols, classIds, invigilatorId } = req.body;

    const numRows = Number(rows || 5);
    const numCols = Number(cols || 6);
    const totalSeats = numRows * numCols;

    // Fetch students from requested classes
    const studentsByClass = [];
    for (const clsId of classIds || []) {
      const studs = await Student.find({ schoolClass: clsId, status: 'active' })
        .sort({ rollNumber: 1 });
      studentsByClass.push(studs);
    }

    // Interleave students from different classes (Checkerboard seating to eliminate cheating)
    const allocations = [];
    let seatIndex = 0;
    let classToggle = 0;

    for (let r = 1; r <= numRows; r++) {
      for (let c = 1; c <= numCols; c++) {
        const targetClassList = studentsByClass[classToggle % studentsByClass.length];
        const student = targetClassList && targetClassList.length > 0 ? targetClassList.shift() : null;

        if (student) {
          allocations.push({
            student: student._id,
            seatNumber: `R${r}-C${c}`,
            row: r,
            col: c,
            schoolClass: student.schoolClass
          });
        }
        classToggle++;
      }
    }

    const plan = await ExamSeatingPlan.create({
      exam: examId,
      date: date || new Date(),
      session: session || 'morning',
      roomName,
      capacity: totalSeats,
      rows: numRows,
      cols: numCols,
      franchise: franchiseId,
      allocations,
      invigilator: invigilatorId
    });

    const populated = await ExamSeatingPlan.findById(plan._id)
      .populate('allocations.student', 'personalInfo.firstName personalInfo.lastName studentId rollNumber')
      .populate('allocations.schoolClass', 'name code')
      .populate('invigilator', 'personalInfo.firstName personalInfo.lastName');

    res.status(201).json({
      success: true,
      message: `Seating plan generated for ${allocations.length} students with alternating anti-cheat layout`,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};
