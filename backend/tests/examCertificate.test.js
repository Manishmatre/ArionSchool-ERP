const assert = require('node:assert/strict');
const test = require('node:test');
const { getOrGenerateExamCertificate } = require('../utils/examCertificate');

test('exam generation preserves an existing certificate without rendering or replacing it', async () => {
  const existingCertificate = {
    _id: 'existing-certificate-id',
    certificateNumber: 'SES-CERT-2026-0042',
    template: 'manual-template-id',
    fileUrl: 'https://example.test/original-certificate.png'
  };
  let renderCalls = 0;

  const certificate = await getOrGenerateExamCertificate(existingCertificate, async () => {
    renderCalls += 1;
    return { _id: 'replacement-certificate-id' };
  });

  assert.equal(certificate, existingCertificate);
  assert.equal(renderCalls, 0);
  assert.equal(certificate.certificateNumber, 'SES-CERT-2026-0042');
  assert.equal(certificate.fileUrl, 'https://example.test/original-certificate.png');
});

test('exam generation creates a certificate when none exists', async () => {
  const generatedCertificate = { _id: 'new-certificate-id' };
  let renderCalls = 0;

  const certificate = await getOrGenerateExamCertificate(null, async () => {
    renderCalls += 1;
    return generatedCertificate;
  });

  assert.equal(certificate, generatedCertificate);
  assert.equal(renderCalls, 1);
});
