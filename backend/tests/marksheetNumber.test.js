const assert = require('node:assert/strict');
const test = require('node:test');
const { getMarksheetNumberForStudent } = require('../utils/marksheetNumber');

test('marksheet ID reuses the enrollment year and serial exactly', () => {
  assert.equal(getMarksheetNumberForStudent({
    studentId: 'SES-STU-2026-0002',
    enrollmentNumber: 'SES-ENR-2026-0002'
  }), 'SES-MARKS-2026-0002');
});

test('marksheet ID falls back to the student ID when enrollment number is unavailable', () => {
  assert.equal(getMarksheetNumberForStudent({ studentId: 'SES-STU-2025-0047' }), 'SES-MARKS-2025-0047');
});

test('marksheet ID uses the certificate year and serial when a certificate exists', () => {
  assert.equal(
    getMarksheetNumberForStudent(
      { enrollmentNumber: 'SES-ENR-2026-0002' },
      2026,
      'SES-CERT-2026-0315'
    ),
    'SES-MARKS-2026-0315'
  );
});
