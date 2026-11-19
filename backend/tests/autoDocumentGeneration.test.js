const assert = require('node:assert/strict');
const test = require('node:test');
const {
  renderDefaultMarksheetCanvas,
  renderDefaultStudentCertificateCanvas
} = require('../utils/defaultDocumentRenderer');

test('auto-generation uses official system default marksheet and certificate templates', async () => {
  const student = {
    _id: '507f1f77bcf86cd799439011',
    studentId: 'SES-STU-2026-0001',
    enrollmentNumber: 'SES-ENR-2026-0001',
    personalInfo: {
      firstName: 'Ramesh',
      lastName: 'Kumar',
      fatherName: 'Suresh Kumar',
      motherName: 'Sunita Devi',
      dateOfBirth: new Date('2002-05-15'),
      gender: 'Male'
    },
    franchise: null // Main branch student
  };

  const course = {
    _id: '507f1f77bcf86cd799439012',
    title: 'Diploma in Computer Application',
    duration: '12 Months'
  };

  const marks = [
    { subject: 'Computer Fundamentals', totalMarks: 100, minMarks: 40, obtainedMarks: 85 },
    { subject: 'Microsoft Office', totalMarks: 100, minMarks: 40, obtainedMarks: 90 }
  ];

  // Verify renderDefaultMarksheetCanvas generates valid buffer without error
  const marksheetBuffer = await renderDefaultMarksheetCanvas({
    student,
    course,
    template: null, // Always null for default
    marks,
    totalMarks: 200,
    totalObtainedMarks: 175,
    percentage: 87.5,
    grade: 'A+',
    marksheetNumber: 'SES-MARKS-2026-0001',
    certificateNumber: 'SES-CERT-2026-0001',
    issueDate: new Date()
  });

  assert.ok(Buffer.isBuffer(marksheetBuffer), 'marksheetBuffer should be a valid Buffer');
  assert.ok(marksheetBuffer.length > 50000, `marksheetBuffer should contain full artwork, got ${marksheetBuffer.length} bytes`);

  // Verify renderDefaultStudentCertificateCanvas generates valid buffer without error
  const certificateBuffer = await renderDefaultStudentCertificateCanvas({
    student,
    course,
    certificateNumber: 'SES-CERT-2026-0001',
    grade: 'A+',
    percentage: 87.5,
    issueDate: new Date()
  });

  assert.ok(Buffer.isBuffer(certificateBuffer), 'certificateBuffer should be a valid Buffer');
  assert.ok(certificateBuffer.length > 50000, `certificateBuffer should contain full artwork, got ${certificateBuffer.length} bytes`);
});
