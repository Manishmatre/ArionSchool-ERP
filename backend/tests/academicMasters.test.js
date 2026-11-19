const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

// Test Academic Session model validation
test('AcademicSession validates required fields', () => {
  const AcademicSession = require('../models/AcademicSession');
  const dummyFranchise = new mongoose.Types.ObjectId();

  const validSession = new AcademicSession({
    sessionName: '2025-2026',
    startDate: new Date('2025-04-01'),
    endDate: new Date('2026-03-31'),
    isCurrent: true,
    franchise: dummyFranchise
  });

  const err = validSession.validateSync();
  assert.equal(err, undefined, 'Valid academic session should pass schema validation');

  const invalidSession = new AcademicSession({
    franchise: dummyFranchise
  });
  const invalidErr = invalidSession.validateSync();
  assert.ok(invalidErr.errors.sessionName, 'sessionName should be required');
  assert.ok(invalidErr.errors.startDate, 'startDate should be required');
});

// Test SchoolClass and Section validation
test('SchoolClass and Section validate proper hierarchical relationship', () => {
  const SchoolClass = require('../models/SchoolClass');
  const Section = require('../models/Section');
  const dummyFranchise = new mongoose.Types.ObjectId();

  const schoolClass = new SchoolClass({
    name: 'Class 10',
    code: 'CLS-10',
    order: 12,
    franchise: dummyFranchise
  });
  assert.equal(schoolClass.validateSync(), undefined, 'SchoolClass should be valid');

  const section = new Section({
    name: 'A',
    schoolClass: schoolClass._id,
    franchise: dummyFranchise,
    capacity: 45
  });
  assert.equal(section.validateSync(), undefined, 'Section should be valid');
});

// Test User role expansion and equivalence in middleware
test('Role equivalence permits school_admin when franchise_admin is allowed', () => {
  const authorize = require('../middlewares/roleCheck');

  const middleware = authorize('franchise_admin');

  // Case 1: user with role franchise_admin
  let nextCalled = false;
  const req1 = { user: { role: 'franchise_admin' } };
  const res1 = {
    status: (code) => ({
      json: () => {}
    })
  };
  middleware(req1, res1, () => { nextCalled = true; });
  assert.equal(nextCalled, true, 'franchise_admin should be authorized');

  // Case 2: user with role school_admin (equivalence)
  nextCalled = false;
  const req2 = { user: { role: 'school_admin' } };
  middleware(req2, res1, () => { nextCalled = true; });
  assert.equal(nextCalled, true, 'school_admin should be authorized equivalently');

  // Case 3: user with role super_admin (global bypass)
  nextCalled = false;
  const req3 = { user: { role: 'super_admin' } };
  middleware(req3, res1, () => { nextCalled = true; });
  assert.equal(nextCalled, true, 'super_admin should always be authorized');

  // Case 4: user with role student on franchise_admin route
  let statusSet = 0;
  const req4 = { user: { role: 'student' } };
  const res4 = {
    status: (code) => {
      statusSet = code;
      return { json: (data) => data };
    }
  };
  nextCalled = false;
  middleware(req4, res4, () => { nextCalled = true; });
  assert.equal(nextCalled, false, 'student should NOT be authorized on admin route');
  assert.equal(statusSet, 403, 'Should respond with 403 Forbidden');
});

// Test Student model K-12 school fields
test('Student model supports schoolClass, section, parent and admissionNumber', () => {
  const Student = require('../models/Student');
  const dummyId = new mongoose.Types.ObjectId();

  const student = new Student({
    user: dummyId,
    studentId: 'SES-STU-2025-0001',
    enrollmentNumber: 'SES-ENR-2025-0001',
    admissionNumber: 'SES-ADM-2025-0001',
    franchise: dummyId,
    schoolClass: dummyId,
    section: dummyId,
    parent: dummyId,
    personalInfo: {
      firstName: 'Rahul',
      lastName: 'Sharma'
    },
    contactInfo: {
      email: 'rahul.sharma@example.com'
    }
  });

  const err = student.validateSync();
  assert.equal(err, undefined, 'Student with school fields should pass validation');
  assert.equal(student.admissionNumber, 'SES-ADM-2025-0001');
  assert.equal(student.fullName, 'Rahul Sharma');
});
