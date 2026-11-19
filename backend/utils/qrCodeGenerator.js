const QRCode = require('qrcode');

const buildCertificateVerificationUrl = (certificateType, certificateId, frontendUrl) => {
  const configuredFrontendUrl = frontendUrl || process.env.FRONTEND_URL || 'https://seseducare.com';
  const frontendBaseUrl = String(configuredFrontendUrl || 'http://localhost:3000').replace(/\/+$/, '');
  return `${frontendBaseUrl}/verify-certificate?${certificateType}=${encodeURIComponent(certificateId)}`;
};

// Generate QR code for certificate verification
const generateCertificateQR = async (certificateType, certificateId, frontendUrl) => {
  try {
    const verificationUrl = buildCertificateVerificationUrl(certificateType, certificateId, frontendUrl);
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

// Generate QR code for student certificate
const generateStudentCertificateQR = async (certificateId, frontendUrl) => {
  return generateCertificateQR('student', certificateId, frontendUrl);
};

const generateMarksheetQR = async (marksheetId, frontendUrl) => {
  return generateCertificateQR('marksheet', marksheetId, frontendUrl);
};

// Generate QR code for franchise certificate
const generateFranchiseCertificateQR = async (certificateId) => {
  return generateCertificateQR('franchise', certificateId);
};

module.exports = {
  buildCertificateVerificationUrl,
  generateCertificateQR,
  generateStudentCertificateQR,
  generateMarksheetQR,
  generateFranchiseCertificateQR
};
