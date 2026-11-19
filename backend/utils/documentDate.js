const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseDocumentDate = (value) => {
  if (value === undefined || value === null || value === '') {
    return new Date();
  }

  if (typeof value === 'string' && DATE_ONLY_PATTERN.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
      return date;
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Issue date must be a valid date');
  }
  return date;
};

module.exports = { parseDocumentDate };