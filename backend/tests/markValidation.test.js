const assert = require('node:assert/strict');
const test = require('node:test');
const { hasInvalidMarkScore } = require('../utils/markValidation');

test('marksheet score validation rejects obtained marks above the total', () => {
  assert.equal(hasInvalidMarkScore([{ totalMarks: 100, obtainedMarks: 101 }]), true);
});

test('marksheet score validation accepts obtained marks at or below the total', () => {
  assert.equal(hasInvalidMarkScore([
    { totalMarks: 100, obtainedMarks: 100 },
    { totalMarks: 75, obtainedMarks: 0 }
  ]), false);
});

test('marksheet score validation rejects missing and negative scores', () => {
  assert.equal(hasInvalidMarkScore([{ totalMarks: 100 }]), true);
  assert.equal(hasInvalidMarkScore([{ totalMarks: -1, obtainedMarks: 0 }]), true);
});
