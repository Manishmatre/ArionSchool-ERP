const getOrGenerateExamCertificate = async (existingCertificate, generateCertificate) => {
  if (existingCertificate) return existingCertificate;
  return generateCertificate();
};

module.exports = { getOrGenerateExamCertificate };
