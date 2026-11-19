const assert = require('node:assert/strict');
const test = require('node:test');
const { createCanvas } = require('canvas');

test('marksheet table column proportions and header text fitting', () => {
  const canvas = createCanvas(1414, 2000);
  const ctx = canvas.getContext('2d');

  const width = 1414;
  const tableWidth = width - 280; // 1134px

  const col0W = Math.round(tableWidth * 0.08); // SR. NO. (~91px)
  const col1W = Math.round(tableWidth * 0.47); // SUBJECT (~533px)
  const col2W = Math.round(tableWidth * 0.10); // MAX. (~113px)
  const col3W = Math.round(tableWidth * 0.10); // MIN. (~113px)
  const col4W = tableWidth - col0W - col1W - col2W - col3W; // OBTAINED MARKS (~284px)

  assert.ok(col4W >= 250, `col4W should be at least 250px for OBTAINED MARKS, got ${col4W}`);
  assert.equal(col0W + col1W + col2W + col3W + col4W, tableWidth, 'column widths must sum to tableWidth');

  // Test that "OBTAINED MARKS" fits comfortably inside col4W with margin
  const headerFontSize = 22;
  ctx.font = `bold ${headerFontSize}px Arial`;
  const obtainedWidth = ctx.measureText('OBTAINED MARKS').width;
  const minWidth = ctx.measureText('MIN.').width;

  assert.ok(obtainedWidth < col4W - 20, `OBTAINED MARKS (${obtainedWidth}px) must fit inside col4W (${col4W}px) with at least 20px margin`);
  assert.ok(minWidth < col3W - 20, `MIN. (${minWidth}px) must fit inside col3W (${col3W}px) with at least 20px margin`);

  // Verify half-width distances from divider line
  // Divider between col3 and col4 is at colX[4]
  const col4Center = col4W / 2;
  const col3Center = col3W / 2;

  // Left edge of OBTAINED MARKS text from divider line:
  const leftEdgeObtained = col4Center - obtainedWidth / 2;
  assert.ok(leftEdgeObtained > 10, `OBTAINED MARKS text must stay at least 10px away from divider line, got ${leftEdgeObtained}px`);

  // Right edge of MIN. text from divider line:
  const rightEdgeMin = col3Center - minWidth / 2;
  assert.ok(rightEdgeMin > 10, `MIN. text must stay at least 10px away from divider line, got ${rightEdgeMin}px`);
});

