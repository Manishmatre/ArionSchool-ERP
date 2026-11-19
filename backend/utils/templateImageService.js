const { uploadBase64Image, deleteStoredFile, isStoredFile } = require('./cloudinary');

const TEMPLATE_FOLDER = 'ses-lms/templates';

/**
 * Upload base64 template backgrounds to Cloudinary; keep existing URLs as-is.
 */
async function resolveTemplateImageForSave(templateImage, existingImage = null) {
  if (!templateImage) {
    return existingImage || null;
  }

  if (typeof templateImage === 'string' && templateImage.startsWith('data:image/')) {
    if (existingImage && isStoredFile(existingImage)) {
      await deleteStoredFile(existingImage).catch(() => {});
    }
    return uploadBase64Image(templateImage, TEMPLATE_FOLDER);
  }

  return templateImage;
}

module.exports = {
  TEMPLATE_FOLDER,
  resolveTemplateImageForSave
};
