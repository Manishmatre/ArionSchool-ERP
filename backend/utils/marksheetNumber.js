const getMarksheetNumberForStudent = (student, fallbackYear = new Date().getFullYear(), certificateNumber = '') => {
  const certificateMatch = String(certificateNumber || '').trim().match(/^SES-CERT-(\d{4})-(\d+)$/i);
  if (certificateMatch) {
    return `SES-MARKS-${certificateMatch[1]}-${certificateMatch[2]}`;
  }

  const candidates = [student?.enrollmentNumber, student?.studentId];
  for (const candidate of candidates) {
    const match = String(candidate || '').trim().match(/(?:SES-ENR|SES-STU)-(\d{4})-(\d+)$/i);
    if (match) return `SES-MARKS-${match[1]}-${match[2]}`;
  }

  const id = String(student?._id || '');
  const serial = id.slice(-4).replace(/\D/g, '').padStart(4, '0').slice(-4);
  return `SES-MARKS-${fallbackYear}-${serial}`;
};

module.exports = { getMarksheetNumberForStudent };
