const test = require('node:test');
const assert = require('node:assert/strict');
const { appendSearchConditions } = require('../utils/studentSearchQuery');

test('student search combines with the parent ownership filter instead of replacing it', () => {
  const ownership = [{ parent: 'parent-1' }, { _id: { $in: ['student-1'] } }];
  const search = [{ studentId: { $regex: 'alex', $options: 'i' } }];
  const query = appendSearchConditions({ franchise: 'school-1', $or: ownership }, search);

  assert.equal(query.franchise, 'school-1');
  assert.equal(query.$or, undefined);
  assert.deepEqual(query.$and, [{ $or: ownership }, { $or: search }]);
});

test('student search preserves the existing ownership AND filters', () => {
  const tenantQuery = { franchise: 'school-1', status: 'active' };
  const search = [{ enrollmentNumber: { $regex: 'A-1', $options: 'i' } }];
  const query = appendSearchConditions(tenantQuery, search);

  assert.equal(query.franchise, 'school-1');
  assert.equal(query.status, 'active');
  assert.deepEqual(query.$or, search);
});
