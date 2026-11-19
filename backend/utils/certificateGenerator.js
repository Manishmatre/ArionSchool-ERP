let Jimp;
try {
  Jimp = require('jimp');
} catch (e) {
  // jimp optional / fallback
}
const path = require('path');
const fs = require('fs');

const generateAuthorizationCertificate = async (franchise, plan, settings) => {
  if (!Jimp) {
    return { success: false, error: 'Image processing library (Jimp) is not installed.' };
  }

  try {
    const certificateFormat = await Jimp.read(plan.authorizationCertificateFormat);
    const sealImage = await Jimp.read(settings.sealImage);
    const signImage = await Jimp.read(settings.signImage);

    // Resize seal and sign images
    sealImage.resize(150, Jimp.AUTO);
    signImage.resize(150, Jimp.AUTO);

    // Composite images
    certificateFormat.composite(sealImage, 100, 500);
    certificateFormat.composite(signImage, 500, 500);

    // Add text
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    certificateFormat.print(font, 100, 200, `This is to certify that ${franchise.name}`);
    certificateFormat.print(font, 100, 250, `located at ${franchise.address.city}, ${franchise.address.state}`);
    certificateFormat.print(font, 100, 300, `is an authorized franchise of ${settings.siteName}`);

    // Define the destination path for the certificate
    const certsDir = path.join(__dirname, '..', 'uploads', 'certificates');
    if (!fs.existsSync(certsDir)) {
      fs.mkdirSync(certsDir, { recursive: true });
    }

    const filename = `franchise-cert-${franchise._id}-${Date.now()}.png`;
    const filePath = path.join(certsDir, filename);

    // Save the certificate to the local file system
    await certificateFormat.writeAsync(filePath);

    // Return the local URL of the certificate
    const fileUrl = `/uploads/certificates/${filename}`;
    return { success: true, filePath: fileUrl };
  } catch (error) {
    console.error('Error generating certificate:', error);
    return { success: false, error };
  }
};

module.exports = { generateAuthorizationCertificate };
