const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const StudentEnrollment = require('../models/StudentEnrollment');
const StudentPromotion = require('../models/StudentPromotion');

test('StudentEnrollment validates required fields and compound unique constraints', () => {
  const enrollment = new StudentEnrollment({
    student: new mongoose.Types.ObjectId(),
    academicSession: new mongoose.Types.ObjectId(),
    schoolClass: new mongoose.Types.ObjectId(),
    section: new mongoose.Types.ObjectId(),
    rollNumber: '12',
    status: 'active',
    franchise: new mongoose.Types.ObjectId()
  });

  const err = enrollment.validateSync();
  assert.equal(err, undefined, 'Valid StudentEnrollment should have no validation errors');
  assert.equal(enrollment.status, 'active');
  assert.equal(enrollment.resultSummary.academicStatus, 'pending');
});

test('StudentEnrollment tracks academic status and promotion target', () => {
  const nextSessionId = new mongoose.Types.ObjectId();
  const nextClassId = new mongoose.Types.ObjectId();
  const nextSectionId = new mongoose.Types.ObjectId();

  const enrollment = new StudentEnrollment({
    student: new mongoose.Types.ObjectId(),
    academicSession: new mongoose.Types.ObjectId(),
    schoolClass: new mongoose.Types.ObjectId(),
    status: 'promoted',
    resultSummary: {
      totalMarks: 450,
      maxMarks: 500,
      percentage: 90,
      grade: 'A2',
      academicStatus: 'pass'
    },
    promotedTo: {
      academicSession: nextSessionId,
      schoolClass: nextClassId,
      section: nextSectionId,
      promotedAt: new Date()
    },
    franchise: new mongoose.Types.ObjectId()
  });

  assert.equal(enrollment.status, 'promoted');
  assert.equal(enrollment.resultSummary.academicStatus, 'pass');
  assert.equal(enrollment.resultSummary.grade, 'A2');
  assert.equal(enrollment.promotedTo.schoolClass.toString(), nextClassId.toString());
});

test('StudentPromotion validates batch rollover records and student details', () => {
  const studentId = new mongoose.Types.ObjectId();
  const fromClassId = new mongoose.Types.ObjectId();
  const toClassId = new mongoose.Types.ObjectId();

  const promotion = new StudentPromotion({
    batchNumber: 'PRM-2027-001',
    previousSession: new mongoose.Types.ObjectId(),
    nextSession: new mongoose.Types.ObjectId(),
    fromClass: fromClassId,
    toClass: toClassId,
    promotedBy: new mongoose.Types.ObjectId(),
    totalStudents: 1,
    promotedCount: 1,
    detainedCount: 0,
    details: [{
      student: studentId,
      studentName: 'Aarav Sharma',
      enrollmentNumber: 'ENR-2026-101',
      fromClass: fromClassId,
      toClass: toClassId,
      decision: 'promoted',
      resultMarks: {
        percentage: 85.5,
        grade: 'A2',
        academicStatus: 'pass'
      }
    }],
    franchise: new mongoose.Types.ObjectId()
  });

  const err = promotion.validateSync();
  assert.equal(err, undefined, 'Valid StudentPromotion batch should validate with zero errors');
  assert.equal(promotion.batchNumber, 'PRM-2027-001');
  assert.equal(promotion.details[0].decision, 'promoted');
  assert.equal(promotion.promotedCount, 1);
});

test('processPromotionBatch rejects identical sessions and empty promotion rosters', async () => {
  const { processPromotionBatch } = require('../controllers/promotionController');
  
  // Test 1: identical sessions
  let resStatus = null;
  let resJson = null;
  const mockRes = {
    status(code) {
      resStatus = code;
      return this;
    },
    json(data) {
      resJson = data;
      return this;
    }
  };

  const sameSessionId = new mongoose.Types.ObjectId().toString();
  await processPromotionBatch({
    body: {
      previousSessionId: sameSessionId,
      nextSessionId: sameSessionId,
      fromClassId: new mongoose.Types.ObjectId().toString(),
      promotions: [{ studentId: new mongoose.Types.ObjectId().toString(), decision: 'promoted' }]
    },
    user: { franchise: new mongoose.Types.ObjectId() }
  }, mockRes);

  assert.equal(resStatus, 400);
  assert.equal(resJson.success, false);
  assert.match(resJson.message, /Previous session and next session cannot be the same/i);

  // Test 2: empty promotions roster
  await processPromotionBatch({
    body: {
      previousSessionId: new mongoose.Types.ObjectId().toString(),
      nextSessionId: new mongoose.Types.ObjectId().toString(),
      fromClassId: new mongoose.Types.ObjectId().toString(),
      promotions: []
    },
    user: { franchise: new mongoose.Types.ObjectId() }
  }, mockRes);

  assert.equal(resStatus, 400);
  assert.equal(resJson.success, false);
  assert.match(resJson.message, /non-empty promotions array/i);
});
