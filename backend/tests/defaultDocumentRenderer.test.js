const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { createCanvas, loadImage } = require('canvas');
const QRCode = require('qrcode');
const { buildCertificateVerificationUrl } = require('../utils/qrCodeGenerator');
const {
  renderDefaultMarksheetCanvas,
  renderDefaultStudentCertificateCanvas
} = require('../utils/defaultDocumentRenderer');

const backgroundPath = path.join(__dirname, '..', 'assets', 'main-branch-marksheet.jpg');
const franchiseBackgroundPath = path.join(__dirname, '..', 'assets', 'branch-marksheet.jpg');

test('main-branch default marksheet preserves its A4 artwork and draws a transparent marks table', async () => {
  const photoCanvas = createCanvas(80, 100);
  const photoContext = photoCanvas.getContext('2d');
  photoContext.fillStyle = '#1d4ed8';
  photoContext.fillRect(0, 0, photoCanvas.width, photoCanvas.height);
  photoContext.fillStyle = '#facc15';
  photoContext.fillRect(20, 15, 40, 35);
  const qrCodeDataUrl = await QRCode.toDataURL('SES-MARKS-TEST-01', { margin: 1, width: 120 });
  const input = {
    student: {
      studentId: 'SES-TEST-01',
      enrollmentNumber: 'SES-ENR-TEST-01',
      personalInfo: { firstName: 'Test', lastName: 'Student', fatherName: 'Parent Name', motherName: 'Parent Two', photo: photoCanvas.toDataURL() }
    },
    course: { title: 'Diploma in Computer Application', duration: 12 },
    marks: [
      { subject: 'Computer Fundamentals', totalMarks: 100, obtainedMarks: 92 },
      { subject: 'Office Applications', totalMarks: 100, obtainedMarks: 88 }
    ],
    totalMarks: 200,
    totalObtainedMarks: 180,
    percentage: 90,
    grade: 'A+',
    marksheetNumber: 'SES-MARKS-TEST-01',
    issueDate: new Date('2026-10-29T00:00:00.000Z'),
    qrCodeDataUrl,
    companyInfo: {}
  };

  const outputBuffer = await renderDefaultMarksheetCanvas(input);
  const outputImage = await loadImage(outputBuffer);
  const referenceImage = await loadImage(backgroundPath);

  assert.equal(outputImage.width, referenceImage.width);
  assert.equal(outputImage.height, referenceImage.height);
  assert.ok(Math.abs(outputImage.width / outputImage.height - 210 / 297) < 0.002, 'output should remain A4 portrait');

  const outputCanvas = createCanvas(outputImage.width, outputImage.height);
  const outputContext = outputCanvas.getContext('2d');
  outputContext.drawImage(outputImage, 0, 0);
  const referenceCanvas = createCanvas(referenceImage.width, referenceImage.height);
  const referenceContext = referenceCanvas.getContext('2d');
  referenceContext.drawImage(referenceImage, 0, 0);

  const outputPixel = outputContext.getImageData(1250, 900, 1, 1).data;
  const referencePixel = referenceContext.getImageData(1250, 900, 1, 1).data;
  assert.deepEqual([...outputPixel], [...referencePixel], 'marks-table body must leave the watermark/background visible');

  const borderPixel = outputContext.getImageData(140, 844, 1, 1).data;
  const referenceBorderPixel = referenceContext.getImageData(140, 844, 1, 1).data;
  assert.ok(Math.abs(borderPixel[0] - referenceBorderPixel[0]) > 20, 'marks-table border should be visible');

  const tableEndPixel = outputContext.getImageData(140, 1284, 1, 1).data;
  const oldFixedHeightPixel = referenceContext.getImageData(140, 1284, 1, 1).data;
  assert.deepEqual([...tableEndPixel], [...oldFixedHeightPixel], 'marks table must stop after its used rows instead of keeping a fixed-height blank box');

  const duplicateIsoPixel = outputContext.getImageData(1250, 1480, 1, 1).data;
  const backgroundPixel = referenceContext.getImageData(1250, 1480, 1, 1).data;
  assert.deepEqual([...duplicateIsoPixel], [...backgroundPixel], 'the renderer must not add a second ISO badge above the QR area');

  const photoPixel = outputContext.getImageData(1234, 300, 1, 1).data;
  assert.ok(photoPixel[2] > photoPixel[0], 'student photo should render in the upper-right photo box');

  let qrPixelDifferences = 0;
  for (let y = 1620; y < 1660; y += 1) {
    for (let x = 1240; x < 1280; x += 1) {
      const output = outputContext.getImageData(x, y, 1, 1).data;
      const reference = referenceContext.getImageData(x, y, 1, 1).data;
      if (Math.abs(output[0] - reference[0]) > 40 || Math.abs(output[1] - reference[1]) > 40 || Math.abs(output[2] - reference[2]) > 40) qrPixelDifferences += 1;
    }
  }
  assert.ok(qrPixelDifferences > 100, 'generated QR code should render in the lower-right verification area');
});

test('franchise default marksheet uses franchise artwork and places center-head signature at the left footer', async () => {
  const signatureCanvas = createCanvas(60, 20);
  signatureCanvas.getContext('2d').fillStyle = '#1600ff';
  signatureCanvas.getContext('2d').fillRect(0, 0, 60, 20);
  const outputBuffer = await renderDefaultMarksheetCanvas({
    student: {
      studentId: 'SES-STU-2026-0004',
      enrollmentNumber: 'SES-ENR-2026-0004',
      franchise: {
        name: 'Test Learning Center',
        code: 'TLC-04',
        isMainBranch: false,
        owner: { ownerSignature: signatureCanvas.toDataURL() },
        address: { street: 'Test Road', city: 'Rajim', state: 'Chhattisgarh', pincode: '493885' }
      },
      personalInfo: { firstName: 'Franchise', lastName: 'Student' }
    },
    course: { title: 'Computer Applications', duration: '6 Months' },
    marks: [],
    totalMarks: 0,
    totalObtainedMarks: 0,
    percentage: 0,
    grade: 'F',
    marksheetNumber: 'SES-MARKS-2026-0004',
    companyInfo: {}
  });

  const outputImage = await loadImage(outputBuffer);
  const franchiseBackground = await loadImage(franchiseBackgroundPath);
  assert.equal(outputImage.width, franchiseBackground.width);
  assert.equal(outputImage.height, franchiseBackground.height);

  const outputCanvas = createCanvas(outputImage.width, outputImage.height);
  const outputContext = outputCanvas.getContext('2d');
  outputContext.drawImage(outputImage, 0, 0);
  const centerSignaturePixel = outputContext.getImageData(100, 1840, 1, 1).data;
  assert.ok(centerSignaturePixel[2] > 200, 'center-head signature should render in the lower-left footer area');
});

test('default student certificate renders both branch types with a visible verification QR', async () => {
  const qrCodeDataUrl = await QRCode.toDataURL('http://localhost/verify-certificate?student=SES-CERT-2026-0001', { margin: 1, width: 180 });
  const branchCases = [
    { franchise: { _id: 'main', name: 'Main Branch', isMainBranch: true } },
    { franchise: { _id: 'branch', name: 'Franchise Center', code: 'FC-01', isMainBranch: false } }
  ];

  for (const branchData of branchCases) {
    const outputBuffer = await renderDefaultStudentCertificateCanvas({
      student: {
        ...branchData,
        personalInfo: { firstName: 'Test', lastName: 'Student' },
        contactInfo: { address: { city: 'Rajim', state: 'Chhattisgarh' } }
      },
      course: { title: 'Computer Applications', durationValue: 6, durationType: 'months' },
      companyInfo: { name: 'Startology Educare Services Pvt. Ltd.' },
      certificateNumber: 'SES-CERT-2026-0001',
      issueDate: new Date('2026-10-29T00:00:00.000Z'),
      grade: 'A+',
      qrCodeDataUrl
    });
    const outputImage = await loadImage(outputBuffer);
    assert.equal(outputImage.width, 1024);
    assert.equal(outputImage.height, 723);

    const outputCanvas = createCanvas(outputImage.width, outputImage.height);
    const outputContext = outputCanvas.getContext('2d');
    outputContext.drawImage(outputImage, 0, 0);
    let darkQrPixels = 0;
    for (let y = 475; y < 565; y += 1) {
      for (let x = 896; x < 964; x += 1) {
        const pixel = outputContext.getImageData(x, y, 1, 1).data;
        if (pixel[0] < 80 && pixel[1] < 80 && pixel[2] < 80) darkQrPixels += 1;
      }
    }
    assert.ok(darkQrPixels > 200, 'verification QR modules should be drawn in the lower-right area');
  }
});

test('student certificate QR uses the requesting production site and verification query', () => {
  assert.equal(
    buildCertificateVerificationUrl('student', 'SES-CERT-2026-0001', 'https://seseducare.com/'),
    'https://seseducare.com/verify-certificate?student=SES-CERT-2026-0001'
  );
});
