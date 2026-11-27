const test = require('node:test');
const assert = require('node:assert/strict');
const { canAccessStudentRecord } = require('../utils/tenantAccess');

const student = {
  _id: 'student-1',
  user: 'student-user-1',
  parent: 'parent-user-1',
  franchise: 'school-1'
};

test('school staff can access records only inside their assigned school', () => {
  assert.equal(canAccessStudentRecord({ role: 'school_admin', _id: 'admin-1', franchise: 'school-1' }, student), true);
  assert.equal(canAccessStudentRecord({ role: 'school_admin', _id: 'admin-2', franchise: 'school-2' }, student), false);
  assert.equal(canAccessStudentRecord({ role: 'school_admin', _id: 'admin-3' }, student), false);
});

test('student accounts can only access their own student record', () => {
  assert.equal(canAccessStudentRecord({ role: 'student', _id: 'student-user-1' }, student), true);
  assert.equal(canAccessStudentRecord({ role: 'student', _id: 'student-user-2' }, student), false);
});

test('parents can only access explicitly linked student records', () => {
  assert.equal(canAccessStudentRecord({ role: 'parent', _id: 'parent-user-1' }, student), true);
  assert.equal(canAccessStudentRecord({ role: 'parent', _id: 'parent-user-2', linkedStudents: ['student-1'] }, student), true);
  assert.equal(canAccessStudentRecord({ role: 'parent', _id: 'parent-user-3' }, student), false);
});

test('platform administrators may access records across schools', () => {
  assert.equal(canAccessStudentRecord({ role: 'super_admin', _id: 'root' }, student), true);
});
