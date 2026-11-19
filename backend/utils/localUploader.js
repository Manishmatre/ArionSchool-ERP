const { deleteStoredFile } = require('./cloudinary');

const deleteFile = async (filePath) => {
  try {
    await deleteStoredFile(filePath);
    return { success: true, message: 'File deleted successfully.' };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, message: 'Error deleting file.' };
  }
};

module.exports = { deleteFile };
