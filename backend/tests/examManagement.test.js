const assert = require('node:assert/strict');
const test = require('node:test');

const Exam = require('../models/Exam');
const Course = require('../models/Course');
const MCQ = require('../models/MCQ');
const examController = require('../controllers/examController');

const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
};

test('copyExam preserves generationConfig, masterQuestions, isFinalExam and creates a populated draft', async () => {
  const originalFindById = Exam.findById;
  const originalSave = Exam.prototype.save;
  const originalPopulate = Exam.prototype.populate;

  const existingExam = {
    _id: '507f1f77bcf86cd799439001',
    title: 'HTML Basics',
    description: 'HTML module test',
    course: '507f1f77bcf86cd799439011',
    franchise: '507f1f77bcf86cd799439022',
    questions: ['507f1f77bcf86cd799439031', '507f1f77bcf86cd799439032'],
    masterQuestions: ['507f1f77bcf86cd799439031', '507f1f77bcf86cd799439032'],
    generationConfig: {
      mode: 'automatic',
      modules: ['507f1f77bcf86cd799439041'],
      totalQuestions: 2,
      difficultyDistribution: { easy: 1, medium: 1, hard: 0 }
    },
    startTime: '2026-01-01T10:00:00.000Z',
    endTime: '2026-01-02T10:00:00.000Z',
    duration: 45,
    passPercentage: 60,
    maxAttempts: 2,
    negativeMarking: true,
    negativeMarksPerQuestion: 0.25,
    instructions: 'Read carefully',
    isFinalExam: true
  };

  let populatedArgs = null;

  try {
    Exam.findById = async () => existingExam;
    Exam.prototype.save = async function () {
      return this;
    };
    Exam.prototype.populate = async function (args) {
      populatedArgs = args;
      return this;
    };

    const req = {
      params: { id: existingExam._id },
      user: { _id: '507f1f77bcf86cd799439099' }
    };
    const res = createMockRes();
    let nextErr = null;

    await examController.copyExam(req, res, (err) => {
      nextErr = err;
    });

    assert.equal(nextErr, null);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, 'HTML Basics (Copy)');
    assert.equal(res.body.data.status, 'draft');
    assert.equal(res.body.data.isFinalExam, true);
    assert.equal(res.body.data.maxAttempts, 2);
    assert.equal(res.body.data.negativeMarking, true);
    assert.equal(res.body.data.negativeMarksPerQuestion, 0.25);
    assert.equal(res.body.data.instructions, 'Read carefully');
    assert.equal(res.body.data.generationConfig?.mode, 'automatic');
    assert.equal(res.body.data.masterQuestions?.length, 2);
    assert.ok(Array.isArray(populatedArgs));
  } finally {
    Exam.findById = originalFindById;
    Exam.prototype.save = originalSave;
    Exam.prototype.populate = originalPopulate;
  }
});

test('updateExam keeps draft status despite past endTime and publishes draft to active/scheduled with valid dates', async () => {
  const originalExamFindById = Exam.findById;
  const originalCourseFindById = Course.findById;
  const originalMcqCount = MCQ.countDocuments;
  const originalSave = Exam.prototype.save;
  const originalPopulate = Exam.prototype.populate;

  try {
    Course.findById = async (id) => ({ _id: id, title: 'Web Dev' });
    MCQ.countDocuments = async () => 2;
    Exam.prototype.save = async function () {
      return this;
    };
    Exam.prototype.populate = async function () {
      return this;
    };

    // 1. Draft with expired endTime stays 'draft' when updated
    const draftExamDoc = new Exam({
      title: 'Draft Exam',
      course: '507f1f77bcf86cd799439011',
      questions: ['507f1f77bcf86cd799439031', '507f1f77bcf86cd799439032'],
      startTime: '2020-01-01T10:00:00.000Z',
      endTime: '2020-01-02T10:00:00.000Z',
      duration: 60,
      status: 'draft',
      createdBy: '507f1f77bcf86cd799439099'
    });
    draftExamDoc.save = async function () { return this; };
    draftExamDoc.populate = async function () { return this; };

    Exam.findById = async () => draftExamDoc;

    const draftRes = createMockRes();
    await examController.updateExam(
      {
        params: { id: '507f1f77bcf86cd799439002' },
        body: { title: 'Draft Exam Updated', status: 'draft' }
      },
      draftRes,
      (err) => {
        throw err;
      }
    );

    assert.equal(draftRes.statusCode, 200);
    assert.equal(draftRes.body.data.status, 'draft');
    assert.equal(draftRes.body.data.title, 'Draft Exam Updated');

    // 2. Publishing draft with current active window becomes 'active'
    const now = Date.now();
    const publishRes = createMockRes();
    await examController.updateExam(
      {
        params: { id: '507f1f77bcf86cd799439002' },
        body: {
          status: 'active',
          startTime: new Date(now - 60000).toISOString(),
          endTime: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
          isFinalExam: true,
          mode: 'automatic',
          blueprint: {
            moduleIds: ['507f1f77bcf86cd799439041'],
            totalQuestions: 2,
            difficultyDistribution: { easy: 1, medium: 1, hard: 0 }
          }
        }
      },
      publishRes,
      (err) => {
        throw err;
      }
    );

    assert.equal(publishRes.statusCode, 200);
    assert.equal(publishRes.body.data.status, 'active');
    assert.equal(publishRes.body.data.isFinalExam, true);
    assert.equal(publishRes.body.data.generationConfig?.mode, 'automatic');
  } finally {
    Exam.findById = originalExamFindById;
    Course.findById = originalCourseFindById;
    MCQ.countDocuments = originalMcqCount;
    Exam.prototype.save = originalSave;
    Exam.prototype.populate = originalPopulate;
  }
});
