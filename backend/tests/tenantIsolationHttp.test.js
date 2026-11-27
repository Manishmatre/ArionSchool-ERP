const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const SchoolCampus = require('../models/SchoolCampus');
const User = require('../models/User');
const Student = require('../models/Student');

const enabled = process.env.RUN_TENANT_HTTP_INTEGRATION === '1';

test('live student APIs enforce school, parent, and student ownership', { skip: !enabled }, async () => {
  assert.equal(process.env.NODE_ENV, 'development', 'Refusing to create integration fixtures outside development');
  assert.ok(process.env.MONGODB_URI && process.env.JWT_SECRET, 'Development database and JWT configuration are required');
  const dbHost = new URL(process.env.MONGODB_URI).hostname;
  assert.equal(dbHost.endsWith('.mongodb.net'), true, 'Use the configured development MongoDB deployment only');

  const suffix = `it${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const campusIds = [];
  const userIds = [];
  const studentIds = [];
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000, connectTimeoutMS: 15000 });

  try {
    const createCampus = async (side) => {
      const campus = await SchoolCampus.create({
        name: `Tenant test ${suffix} ${side}`,
        code: `${suffix.slice(-6)}${side}`.toUpperCase(),
        owner: { name: 'Integration Test', email: `${suffix}-${side}@example.com`, mobile: '9999999999' },
        address: { street: 'Test Road', city: 'Test City', state: 'Test State', pincode: '000000', country: 'India' }
      });
      campusIds.push(campus._id);
      return campus;
    };
    const campusA = await createCampus('a');
    const campusB = await createCampus('b');
    const createUser = async (role, label, campus) => {
      const user = await User.create({
        name: `Integration ${label}`,
        email: `${suffix}-${label}@example.com`,
        password: 'TenantTestPassword123!',
        role,
        franchise: campus._id,
        isActive: true
      });
      userIds.push(user._id);
      return user;
    };
    const adminA = await createUser('school_admin', 'admin-a', campusA);
    const adminB = await createUser('school_admin', 'admin-b', campusB);
    const studentUser = await createUser('student', 'student-a', campusA);
    const parentUser = await createUser('parent', 'parent-a', campusA);
    const student = await Student.create({
      user: studentUser._id,
      studentId: `IT-${suffix}-A`,
      enrollmentNumber: `ENR-${suffix}-A`,
      franchise: campusA._id,
      parent: parentUser._id,
      personalInfo: { firstName: 'Integration', lastName: 'Student' },
      contactInfo: { email: studentUser.email }
    });
    studentIds.push(student._id);
    parentUser.linkedStudents = [student._id];
    await parentUser.save();
    const otherStudentUser = await createUser('student', 'student-b', campusB);
    const otherStudent = await Student.create({
      user: otherStudentUser._id,
      studentId: `IT-${suffix}-B`,
      enrollmentNumber: `ENR-${suffix}-B`,
      franchise: campusB._id,
      personalInfo: { firstName: 'Other', lastName: 'Tenant' },
      contactInfo: { email: otherStudentUser.email }
    });
    studentIds.push(otherStudent._id);

    const tokenFor = (user) => jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '3m' });
    const get = (user, studentId, path = '') => fetch(
      `http://127.0.0.1:${process.env.PORT || 5000}/api/students/${studentId}${path}`,
      { headers: { Authorization: `Bearer ${tokenFor(user)}` } }
    );
    const postEmpty = (user, studentId, path) => fetch(
      `http://127.0.0.1:${process.env.PORT || 5000}/api/students/${studentId}/${path}`,
      { method: 'POST', headers: { Authorization: `Bearer ${tokenFor(user)}` } }
    );
    const cases = [
      ['same-school staff profile', adminA, student._id, '', 200],
      ['cross-school staff profile', adminB, student._id, '', 403],
      ['student own profile', studentUser, student._id, '', 200],
      ['student other-school profile', studentUser, otherStudent._id, '', 403],
      ['linked parent profile', parentUser, student._id, '', 200],
      ['unlinked parent profile', parentUser, otherStudent._id, '', 403],
      ['cross-school student dashboard', adminB, student._id, '/dashboard', 403],
      ['student other-school dashboard', studentUser, otherStudent._id, '/dashboard', 403]
    ];
    for (const [label, user, studentId, path, expectedStatus] of cases) {
      const response = await get(user, studentId, path);
      assert.equal(response.status, expectedStatus, label);
      console.log(`PASS ${label}: HTTP ${response.status}`);
      await response.body?.cancel();
    }
    const writeCases = [
      ['same-school document upload reaches file validation', adminA, student._id, 'documents', 400],
      ['cross-school document upload denied', adminB, student._id, 'documents', 403],
      ['parent document upload denied', parentUser, student._id, 'documents', 403],
      ['same-school photo upload reaches file validation', adminA, student._id, 'photo', 400],
      ['cross-school photo upload denied', adminB, student._id, 'photo', 403],
      ['student other-school photo upload denied', studentUser, otherStudent._id, 'photo', 403]
    ];
    for (const [label, user, studentId, path, expectedStatus] of writeCases) {
      const response = await postEmpty(user, studentId, path);
      assert.equal(response.status, expectedStatus, label);
      console.log(`PASS ${label}: HTTP ${response.status}`);
      await response.body?.cancel();
    }
  } finally {
    if (studentIds.length) await Student.deleteMany({ _id: { $in: studentIds } });
    if (userIds.length) await User.deleteMany({ _id: { $in: userIds } });
    if (campusIds.length) await SchoolCampus.deleteMany({ _id: { $in: campusIds } });
    await mongoose.disconnect();
  }
});
