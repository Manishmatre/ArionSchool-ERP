const hasInvalidMarkScore = (marks = []) => marks.some((mark) => {
  const total = Number(mark?.totalMarks);
  const obtained = Number(mark?.obtainedMarks);
  return !Number.isFinite(total) || !Number.isFinite(obtained) || total < 0 || obtained < 0 || obtained > total;
});

module.exports = { hasInvalidMarkScore };
