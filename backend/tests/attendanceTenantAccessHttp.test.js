const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const SchoolCampus = require('../models/SchoolCampus');
const SchoolClass = require('../models/SchoolClass');
const User = require('../models/User');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

test('live attendance APIs isolate school records and prevent cross-tenant writes', {
  skip: process.env.RUN_ATTENDANCE_HTTP_INTEGRATION !== '1'
}, async () => {
  assert.equal(process.env.NODE_ENV, 'development', 'Refusing to create attendance fixtures outside development');
  assert.ok(process.env.MONGODB_URI && process.env.JWT_SECRET);
  const dbHost = new URL(process.env.MONGODB_URI).hostname;
  assert.equal(dbHost.endsWith('.mongodb.net'), true, 'Use the configured development MongoDB deployment only');

  const suffix = `attit${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const campusIds = [];
  const classIds = [];
  const userIds = [];
  const studentIds = [];
  const attendanceIds = [];
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000, connectTimeoutMS: 15000 });

  try {
    const createCampus = async (side) => {
      const campus = await SchoolCampus.create({
        name: `Attendance test ${suffix} ${side}`,
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
        name: `Attendance ${label}`,
        email: `${suffix}-${label}@example.com`,
        password: 'AttendanceTestPassword123!',
        role,
        franchise: campus._id,
        isActive: true
      });
      userIds.push(user._id);
      return user;
    };
    const adminA = await createUser('school_admin', 'admin-a', campusA);
    const studentUserA = await createUser('student', 'student-a', campusA);
    const studentUserB = await createUser('student', 'student-b', campusB);

    const createClass = async (campus, side) => {
      const record = await SchoolClass.create({
        name: `Attendance ${side}`,
        code: `${suffix.slice(-6)}${side}`.toUpperCase(),
        franchise: campus._id,
        order: 1
      });
      classIds.push(record._id);
      return record;
    };
    const classA = await createClass(campusA, 'A');
    const classB = await createClass(campusB, 'B');

    const createStudent = async (user, campus, schoolClass, side) => {
      const student = await Student.create({
        user: user._id,
        studentId: `${suffix}-${side}`.toUpperCase(),
        enrollmentNumber: `${suffix}-${side}-ENR`.toUpperCase(),
        franchise: campus._id,
        schoolClass: schoolClass._id,
        rfidCardId: `${suffix}-${side}-RFID`.toUpperCase(),
        personalInfo: { firstName: 'Attendance', lastName: side },
        contactInfo: { email: user.email }
      });
      studentIds.push(student._id);
      return student;
    };
    const studentA = await createStudent(studentUserA, campusA, classA, 'A');
    const studentB = await createStudent(studentUserB, campusB, classB, 'B');

    const dateA = new Date('2026-11-20T09:00:00.000Z');
    const dateB = new Date('2026-11-21T09:00:00.000Z');
    studentA.attendance.totalClasses = 1;
    studentA.attendance.attendedClasses = 1;
    studentA.attendance.attendancePercentage = 100;
    await studentA.save();
    const recordA = await Attendance.create({ student: studentA._id, franchise: campusA._id, schoolClass: classA._id, date: dateA, status: 'present', session: 'full_day' });
    const recordB = await Attendance.create({ student: studentB._id, franchise: campusB._id, schoolClass: classB._id, date: dateB, status: 'present', session: 'full_day' });
    attendanceIds.push(recordA._id, recordB._id);

    const tokenFor = (user) => jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '3m' });
    const base = `http://127.0.0.1:${process.env.PORT || 5000}/api/attendance`;
    const request = (user, path, method = 'GET', body) => fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${tokenFor(user)}`,
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });

    const list = await request(adminA, '/');
    assert.equal(list.status, 200);
    const listBody = await list.json();
    assert.equal(listBody.count, 1, 'school A list must exclude school B attendance');
    assert.equal(String(listBody.data[0]._id), String(recordA._id));
    console.log('PASS attendance list is tenant-scoped');

    const requestedForeignSchool = await request(adminA, `/?franchise=${campusB._id}`);
    assert.equal(requestedForeignSchool.status, 200);
    assert.equal((await requestedForeignSchool.json()).count, 1, 'tenant users cannot override their school filter');

    const crossStudentRead = await request(studentUserA, `/student/${studentB._id}`);
    assert.equal(crossStudentRead.status, 403, 'student cannot read another school student attendance');
    console.log('PASS tenant filter override and cross-school student read rejected');

    const stats = await request(adminA, '/stats');
    assert.equal(stats.status, 200);
    assert.equal((await stats.json()).data.totalRecords, 1, 'school A statistics must exclude school B records');
    console.log('PASS attendance statistics are tenant-scoped');

    const crossMark = await request(adminA, '/', 'POST', {
      studentId: studentB._id, date: '2026-11-22', status: 'present'
    });
    assert.equal(crossMark.status, 403, 'school A cannot mark attendance for school B');
    assert.equal(await Attendance.countDocuments({ student: studentB._id, date: { $gte: new Date('2026-11-22'), $lt: new Date('2026-11-23') } }), 0);
    console.log('PASS cross-school single mark rejected');

    const crossBulk = await request(adminA, '/bulk', 'POST', {
      date: '2026-11-23', students: [{ studentId: studentB._id, status: 'present' }]
    });
    assert.equal(crossBulk.status, 200);
    assert.equal((await crossBulk.json()).data.failed, 1, 'cross-school bulk entry must be rejected per student');
    assert.equal(await Attendance.countDocuments({ student: studentB._id, date: { $gte: new Date('2026-11-23'), $lt: new Date('2026-11-24') } }), 0);
    console.log('PASS cross-school bulk mark rejected without creating records');

    const crossUpdate = await request(adminA, `/${recordB._id}`, 'PUT', { status: 'absent' });
    assert.equal(crossUpdate.status, 403, 'school A cannot update school B attendance');
    assert.equal((await Attendance.findById(recordB._id)).status, 'present');
    console.log('PASS cross-school update rejected');

    const ownUpdate = await request(adminA, `/${recordA._id}`, 'PUT', {
      status: 'absent', franchise: campusB._id, student: studentB._id
    });
    assert.equal(ownUpdate.status, 200, 'same-school status update should succeed');
    const updatedA = await Attendance.findById(recordA._id);
    assert.equal(updatedA.status, 'absent');
    assert.equal(String(updatedA.franchise), String(campusA._id), 'client payload must not move attendance between schools');
    assert.equal(String(updatedA.student), String(studentA._id), 'client payload must not reassign the student');
    console.log('PASS same-school update works and ignores tenant reassignment fields');

    const crossDelete = await request(adminA, `/${recordB._id}`, 'DELETE');
    assert.equal(crossDelete.status, 403, 'school A cannot delete school B attendance');
    assert.ok(await Attendance.exists({ _id: recordB._id }));
    console.log('PASS cross-school delete rejected');

    const crossRoster = await request(adminA, `/school-daily?schoolClass=${classB._id}`);
    assert.equal(crossRoster.status, 403, 'school A cannot read school B daily roster');
    console.log('PASS cross-school daily roster read rejected');

    const crossRfid = await request(adminA, '/rfid-punch', 'POST', { rfidCardId: studentB.rfidCardId });
    assert.equal(crossRfid.status, 403, 'school A cannot punch a school B student');
    console.log('PASS cross-school RFID punch rejected');

    const foreignQr = await request(studentUserA, '/qr/punch', 'POST', {
      qrData: { type: 'SES_ATTENDANCE_QR', franchiseId: String(campusB._id), session: 'full_day' }
    });
    assert.equal(foreignQr.status, 403, 'student cannot use another school QR code');
    console.log('PASS foreign-school QR punch rejected');

    const ownDelete = await request(adminA, `/${recordA._id}`, 'DELETE');
    assert.equal(ownDelete.status, 200, 'same-school attendance delete should succeed');
    assert.equal(await Attendance.exists({ _id: recordA._id }), null);
    console.log('PASS same-school delete works');
  } finally {
    if (attendanceIds.length) await Attendance.deleteMany({ _id: { $in: attendanceIds } });
    if (studentIds.length) await Student.deleteMany({ _id: { $in: studentIds } });
    if (userIds.length) await User.deleteMany({ _id: { $in: userIds } });
    if (classIds.length) await SchoolClass.deleteMany({ _id: { $in: classIds } });
    if (campusIds.length) await SchoolCampus.deleteMany({ _id: { $in: campusIds } });
    const leftovers = {
      attendance: attendanceIds.length ? await Attendance.countDocuments({ _id: { $in: attendanceIds } }) : 0,
      students: studentIds.length ? await Student.countDocuments({ _id: { $in: studentIds } }) : 0,
      users: userIds.length ? await User.countDocuments({ _id: { $in: userIds } }) : 0,
      classes: classIds.length ? await SchoolClass.countDocuments({ _id: { $in: classIds } }) : 0,
      campuses: campusIds.length ? await SchoolCampus.countDocuments({ _id: { $in: campusIds } }) : 0
    };
    await mongoose.disconnect();
    assert.deepEqual(leftovers, { attendance: 0, students: 0, users: 0, classes: 0, campuses: 0 }, 'all attendance test fixtures must be removed');
  }
});
