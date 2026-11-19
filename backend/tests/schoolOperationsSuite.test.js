const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

// 1. Test VisitorPass model
test('VisitorPass validates visitor info and generates passNumber format', async () => {
  const VisitorPass = require('../models/VisitorPass');
  const dummyFranchise = new mongoose.Types.ObjectId();

  const pass = new VisitorPass({
    visitorName: 'Dr. Ramesh Kumar',
    mobileNumber: '9876543210',
    purpose: 'Fee clearance and PTM discussion',
    visitingPersonType: 'staff',
    personToMeet: 'Principal',
    franchise: dummyFranchise,
    numberOfPersons: 2
  });

  const err = pass.validateSync();
  assert.equal(err, undefined, 'VisitorPass should pass validation');
  assert.equal(pass.numberOfPersons, 2);
  assert.equal(pass.status, 'inside');
});

// 2. Test Vehicle and VehicleTelemetry models
test('Vehicle and VehicleTelemetry validate GPS tracking and overspeed flag', () => {
  const Vehicle = require('../models/Vehicle');
  const VehicleTelemetry = require('../models/VehicleTelemetry');
  const dummyId = new mongoose.Types.ObjectId();

  const bus = new Vehicle({
    busNumber: 'Bus 05',
    vehicleNumber: 'DL-01-XY-9988',
    capacity: 45,
    driverName: 'Suresh Yadav',
    driverMobile: '9988776655',
    franchise: dummyId,
    gpsDeviceId: 'GPS-BUS-05'
  });
  assert.equal(bus.validateSync(), undefined);

  // Speed: 62 km/h (> 50 km/h) -> isOverSpeed: true
  const telemetry = new VehicleTelemetry({
    vehicle: dummyId,
    gpsDeviceId: 'GPS-BUS-05',
    franchise: dummyId,
    latitude: 28.6139,
    longitude: 77.2090,
    speedKmh: 62,
    isOverSpeed: 62 > 50
  });
  assert.equal(telemetry.validateSync(), undefined);
  assert.equal(telemetry.isOverSpeed, true);
  assert.equal(telemetry.speedKmh, 62);
});

// 3. Test StaffShift model
test('StaffShift validates morning primary shift hours and grace minutes', () => {
  const StaffShift = require('../models/StaffShift');
  const dummyId = new mongoose.Types.ObjectId();

  const shift = new StaffShift({
    name: 'Morning Primary Shift',
    franchise: dummyId,
    startTime: '08:00',
    endTime: '14:30',
    graceMinutes: 15,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  });

  assert.equal(shift.validateSync(), undefined);
  assert.equal(shift.graceMinutes, 15);
});

// 4. Test LeaveApplication model
test('LeaveApplication validates date span and total days computation', () => {
  const LeaveApplication = require('../models/LeaveApplication');
  const dummyId = new mongoose.Types.ObjectId();

  const start = new Date('2026-10-01');
  const end = new Date('2026-10-03');
  const totalDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

  const leave = new LeaveApplication({
    applicantType: 'staff',
    staff: dummyId,
    franchise: dummyId,
    leaveType: 'medical',
    startDate: start,
    endDate: end,
    totalDays,
    reason: 'Medical recovery post viral fever'
  });

  assert.equal(leave.validateSync(), undefined);
  assert.equal(leave.totalDays, 3);
  assert.equal(leave.status, 'pending');
});

// 5. Test DisciplineRecord model
test('DisciplineRecord tracks merit and demerit points accurately', () => {
  const DisciplineRecord = require('../models/DisciplineRecord');
  const dummyId = new mongoose.Types.ObjectId();

  const merit = new DisciplineRecord({
    student: dummyId,
    franchise: dummyId,
    recordType: 'merit',
    category: 'sports_excellence',
    title: 'Inter-School Athletics Gold Medalist',
    points: 15
  });
  assert.equal(merit.validateSync(), undefined);
  assert.equal(merit.points, 15);

  const demerit = new DisciplineRecord({
    student: dummyId,
    franchise: dummyId,
    recordType: 'demerit',
    category: 'uniform_violation',
    title: 'Repeated non-regulation footwear',
    points: -5
  });
  assert.equal(demerit.validateSync(), undefined);
  assert.equal(demerit.points, -5);
});

// 6. Test PTMSlot model
test('PTMSlot validates appointment schedule details', () => {
  const PTMSlot = require('../models/PTMSlot');
  const dummyId = new mongoose.Types.ObjectId();

  const ptm = new PTMSlot({
    franchise: dummyId,
    title: 'Term 1 Parent Teacher Conference',
    teacher: dummyId,
    schoolClass: dummyId,
    date: new Date('2026-11-20'),
    startTime: '10:00 AM',
    endTime: '10:15 AM',
    mode: 'in_person'
  });

  assert.equal(ptm.validateSync(), undefined);
  assert.equal(ptm.status, 'available');
});
