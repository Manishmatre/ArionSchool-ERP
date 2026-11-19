const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

// Models
const Student = require('../models/Student');
const StudentEnrollment = require('../models/StudentEnrollment');
const StudentPromotion = require('../models/StudentPromotion');
const SchoolClass = require('../models/SchoolClass');
const Section = require('../models/Section');
const AcademicSession = require('../models/AcademicSession');
const Attendance = require('../models/Attendance');
const SchoolCampus = require('../models/SchoolCampus');

test('School Student Lifecycle: Student model validation for K-12 fields', () => {
  const userId = new mongoose.Types.ObjectId();
  const campusId = new mongoose.Types.ObjectId();
  const sessionId = new mongoose.Types.ObjectId();
  const classId = new mongoose.Types.ObjectId();
  const sectionId = new mongoose.Types.ObjectId();
  const houseId = new mongoose.Types.ObjectId();

  const student = new Student({
    user: userId,
    studentId: 'VITS-2026-0042',
    enrollmentNumber: 'VITS-ENR-2026-0042',
    admissionNumber: 'VITS-ADM-2026-0042',
    rollNumber: '15',
    admissionDate: new Date('2026-04-01'),
    franchise: campusId,
    academicSession: sessionId,
    schoolClass: classId,
    section: sectionId,
    house: houseId,
    category: 'General',
    isRTE: false,
    personalInfo: {
      firstName: 'Aarav',
      lastName: 'Sharma',
      fatherName: 'Rajesh Sharma',
      motherName: 'Sunita Sharma',
      gender: 'Male',
      dateOfBirth: new Date('2011-08-15'),
      bloodGroup: 'B+'
    },
    contactInfo: {
      email: 'aarav.sharma@thevitsschool.edu.in',
      mobile: '9876543210',
      address: {
        street: 'Civil Lines',
        city: 'Jabalpur',
        state: 'Madhya Pradesh',
        pincode: '482001'
      }
    },
    academicInfo: {
      schoolOrCollege: 'St. Aloysius Senior Secondary School',
      boardOrUniversity: 'CBSE',
      yearOfPassing: 2025,
      percentage: 88.5
    },
    status: 'active'
  });

  const err = student.validateSync();
  assert.equal(err, undefined, 'Valid student data must have zero validation errors');
  assert.equal(student.admissionNumber, 'VITS-ADM-2026-0042');
  assert.equal(student.rollNumber, '15');
  assert.equal(student.schoolClass.toString(), classId.toString());
  assert.equal(student.section.toString(), sectionId.toString());
  assert.equal(student.academicSession.toString(), sessionId.toString());
  assert.equal(student.personalInfo.fatherName, 'Rajesh Sharma');
  assert.equal(student.academicInfo.boardOrUniversity, 'CBSE');
  assert.equal(student.contactInfo.address.city, 'Jabalpur');
  assert.equal(student.fullName, 'Aarav Sharma');
});

test('School Student Lifecycle: StudentEnrollment synchronizes with student admission', () => {
  const studentId = new mongoose.Types.ObjectId();
  const campusId = new mongoose.Types.ObjectId();
  const sessionId = new mongoose.Types.ObjectId();
  const classId = new mongoose.Types.ObjectId();
  const sectionId = new mongoose.Types.ObjectId();

  const enrollment = new StudentEnrollment({
    student: studentId,
    academicSession: sessionId,
    schoolClass: classId,
    section: sectionId,
    rollNumber: '15',
    franchise: campusId,
    status: 'active',
    enrollmentDate: new Date('2026-04-01'),
    resultSummary: {
      academicStatus: 'pending'
    }
  });

  const err = enrollment.validateSync();
  assert.equal(err, undefined, 'Valid StudentEnrollment must pass validation');
  assert.equal(enrollment.status, 'active');
  assert.equal(enrollment.rollNumber, '15');
  assert.equal(enrollment.resultSummary.academicStatus, 'pending');
});

test('School Student Lifecycle: Class change / update updates active enrollment', () => {
  const studentId = new mongoose.Types.ObjectId();
  const campusId = new mongoose.Types.ObjectId();
  const sessionId = new mongoose.Types.ObjectId();
  const classId = new mongoose.Types.ObjectId();
  const oldSectionId = new mongoose.Types.ObjectId();
  const newSectionId = new mongoose.Types.ObjectId();

  const enrollment = new StudentEnrollment({
    student: studentId,
    academicSession: sessionId,
    schoolClass: classId,
    section: oldSectionId,
    rollNumber: '15',
    franchise: campusId,
    status: 'active'
  });

  // Simulate update to section and rollNumber
  enrollment.section = newSectionId;
  enrollment.rollNumber = '18';

  const err = enrollment.validateSync();
  assert.equal(err, undefined);
  assert.equal(enrollment.section.toString(), newSectionId.toString());
  assert.equal(enrollment.rollNumber, '18');
});

test('School Student Lifecycle: Daily attendance records date, class, section and status', () => {
  const campusId = new mongoose.Types.ObjectId();
  const classId = new mongoose.Types.ObjectId();
  const sectionId = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();

  const attendance = new Attendance({
    student: studentId,
    franchise: campusId,
    schoolClass: classId,
    section: sectionId,
    date: new Date('2026-04-15'),
    status: 'present',
    source: 'manual',
    remarks: 'On time'
  });

  const err = attendance.validateSync();
  assert.equal(err, undefined, 'School attendance must validate correctly');
  assert.equal(attendance.status, 'present');
  assert.equal(attendance.student.toString(), studentId.toString());
  assert.equal(attendance.schoolClass.toString(), classId.toString());
});

test('School Student Lifecycle: Session rollover promotes student and archives previous session', () => {
  const studentId = new mongoose.Types.ObjectId();
  const campusId = new mongoose.Types.ObjectId();
  const session2026 = new mongoose.Types.ObjectId();
  const session2027 = new mongoose.Types.ObjectId();
  const classGrade10 = new mongoose.Types.ObjectId();
  const classGrade11 = new mongoose.Types.ObjectId();
  const sectionA = new mongoose.Types.ObjectId();
  const sectionB = new mongoose.Types.ObjectId();

  // 1. Session 2026-2027 Enrollment (Original)
  const enrollment2026 = new StudentEnrollment({
    student: studentId,
    academicSession: session2026,
    schoolClass: classGrade10,
    section: sectionA,
    rollNumber: '15',
    franchise: campusId,
    status: 'active'
  });

  // 2. Perform promotion
  enrollment2026.status = 'promoted';
  enrollment2026.resultSummary = {
    totalMarks: 465,
    maxMarks: 500,
    percentage: 93,
    grade: 'A1',
    academicStatus: 'pass'
  };
  enrollment2026.promotedTo = {
    academicSession: session2027,
    schoolClass: classGrade11,
    section: sectionB,
    promotedAt: new Date('2027-03-31')
  };

  const errOld = enrollment2026.validateSync();
  assert.equal(errOld, undefined, 'Archived promoted enrollment must validate');
  assert.equal(enrollment2026.status, 'promoted');
  assert.equal(enrollment2026.resultSummary.academicStatus, 'pass');
  assert.equal(enrollment2026.promotedTo.schoolClass.toString(), classGrade11.toString());

  // 3. New Session 2027-2028 Enrollment
  const enrollment2027 = new StudentEnrollment({
    student: studentId,
    academicSession: session2027,
    schoolClass: classGrade11,
    section: sectionB,
    rollNumber: '08',
    franchise: campusId,
    status: 'active',
    enrollmentDate: new Date('2027-04-01'),
    resultSummary: {
      academicStatus: 'pending'
    }
  });

  const errNew = enrollment2027.validateSync();
  assert.equal(errNew, undefined, 'New promoted session enrollment must validate');
  assert.equal(enrollment2027.academicSession.toString(), session2027.toString());
  assert.equal(enrollment2027.schoolClass.toString(), classGrade11.toString());
  assert.equal(enrollment2027.status, 'active');

  // 4. Batch Audit Record in StudentPromotion
  const promotionAudit = new StudentPromotion({
    batchNumber: 'PROMO-2026-0001',
    franchise: campusId,
    previousSession: session2026,
    nextSession: session2027,
    fromClass: classGrade10,
    toClass: classGrade11,
    promotedBy: new mongoose.Types.ObjectId(),
    totalStudents: 1,
    promotedCount: 1,
    detainedCount: 0,
    details: [
      {
        student: studentId,
        studentName: 'Aarav Sharma',
        fromClass: classGrade10,
        toClass: classGrade11,
        toSection: sectionB,
        decision: 'promoted',
        resultMarks: {
          percentage: 93,
          grade: 'A1',
          academicStatus: 'pass'
        },
        remarks: 'Promoted to Grade 11 Science'
      }
    ],
    status: 'completed'
  });

  const errAudit = promotionAudit.validateSync();
  assert.equal(errAudit, undefined, 'Promotion audit record must validate');
  assert.equal(promotionAudit.details.length, 1);
  assert.equal(promotionAudit.details[0].decision, 'promoted');
  assert.equal(promotionAudit.promotedCount, 1);
});
