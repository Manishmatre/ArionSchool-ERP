const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

// 1. Test SchoolExam model
test('SchoolExam validates exam title, type, and grading system', () => {
  const SchoolExam = require('../models/SchoolExam');
  const dummyFranchise = new mongoose.Types.ObjectId();
  const dummySession = new mongoose.Types.ObjectId();

  const exam = new SchoolExam({
    name: 'Mid-Term Examinations 2026',
    examType: 'half_yearly',
    academicSession: dummySession,
    startDate: new Date('2026-09-10'),
    endDate: new Date('2026-09-25'),
    franchise: dummyFranchise,
    gradingScale: 'cbse_9_point'
  });

  const err = exam.validateSync();
  assert.equal(err, undefined, 'SchoolExam should pass validation');
  assert.equal(exam.gradingScale, 'cbse_9_point');
});

// 2. Test StudentMark pre-save percentage and CBSE 9-point grading hook
test('StudentMark automatically calculates total marks, percentage, and CBSE 9-point grade', () => {
  const StudentMark = require('../models/StudentMark');
  const dummyId = new mongoose.Types.ObjectId();

  const mark = new StudentMark({
    exam: dummyId,
    student: dummyId,
    schoolClass: dummyId,
    section: dummyId,
    subject: dummyId,
    franchise: dummyId,
    marksObtained: 93,
    maxMarks: 100,
    passMarks: 33
  });

  assert.equal(mark.validateSync(), undefined);

  // Check CBSE 9-point grade logic
  const calculateCbseGrade = (pct) => {
    if (pct >= 91) return 'A1';
    if (pct >= 81) return 'A2';
    if (pct >= 71) return 'B1';
    if (pct >= 61) return 'B2';
    if (pct >= 51) return 'C1';
    if (pct >= 41) return 'C2';
    if (pct >= 33) return 'D';
    if (pct >= 21) return 'E1';
    return 'E2';
  };

  assert.equal(calculateCbseGrade(mark.marksObtained), 'A1');
  assert.equal(calculateCbseGrade(75), 'B1');
  assert.equal(calculateCbseGrade(45), 'C2');
});

// 3. Test TimetableEntry model
test('TimetableEntry validates dayOfWeek and period bounds', () => {
  const TimetableEntry = require('../models/TimetableEntry');
  const dummyId = new mongoose.Types.ObjectId();

  const entry = new TimetableEntry({
    franchise: dummyId,
    schoolClass: dummyId,
    section: dummyId,
    subject: dummyId,
    teacher: dummyId,
    dayOfWeek: 'Monday',
    periodNumber: 3,
    startTime: '10:00',
    endTime: '10:45',
    roomNumber: 'Rm 102'
  });

  assert.equal(entry.validateSync(), undefined, 'TimetableEntry should pass validation');
  assert.equal(entry.periodNumber, 3);
});

// 4. Test LibraryBook and BookIssue
test('LibraryBook and BookIssue validate circulation tracking', () => {
  const LibraryBook = require('../models/LibraryBook');
  const BookIssue = require('../models/BookIssue');
  const dummyId = new mongoose.Types.ObjectId();

  const book = new LibraryBook({
    title: 'Concepts of Physics',
    author: 'H.C. Verma',
    category: 'science',
    totalCopies: 10,
    availableCopies: 10,
    franchise: dummyId
  });
  assert.equal(book.validateSync(), undefined);

  const issue = new BookIssue({
    book: dummyId,
    student: dummyId,
    franchise: dummyId,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    status: 'issued'
  });
  assert.equal(issue.validateSync(), undefined);
  assert.equal(issue.status, 'issued');
});

// 5. Test Homework and HomeworkSubmission
test('Homework and HomeworkSubmission model evaluation', () => {
  const Homework = require('../models/Homework');
  const HomeworkSubmission = require('../models/HomeworkSubmission');
  const dummyId = new mongoose.Types.ObjectId();

  const hw = new Homework({
    title: 'Algebra Quadratic Equations',
    schoolClass: dummyId,
    section: dummyId,
    subject: dummyId,
    teacher: dummyId,
    franchise: dummyId,
    dueDate: new Date()
  });
  assert.equal(hw.validateSync(), undefined);

  const sub = new HomeworkSubmission({
    homework: dummyId,
    student: dummyId,
    franchise: dummyId,
    marksObtained: 9,
    status: 'evaluated'
  });
  assert.equal(sub.validateSync(), undefined);
  assert.equal(sub.status, 'evaluated');
});

// 6. Test ExamSeatingPlan
test('ExamSeatingPlan validates checkerboard allocations', () => {
  const ExamSeatingPlan = require('../models/ExamSeatingPlan');
  const dummyId = new mongoose.Types.ObjectId();

  const plan = new ExamSeatingPlan({
    exam: dummyId,
    date: new Date(),
    session: 'morning',
    roomName: 'Exam Hall 1',
    capacity: 30,
    rows: 5,
    cols: 6,
    franchise: dummyId,
    allocations: [
      { student: dummyId, seatNumber: 'R1-C1', row: 1, col: 1 },
      { student: dummyId, seatNumber: 'R1-C2', row: 1, col: 2 }
    ]
  });

  assert.equal(plan.validateSync(), undefined);
  assert.equal(plan.allocations.length, 2);
});
