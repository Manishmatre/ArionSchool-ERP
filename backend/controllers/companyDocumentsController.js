const CompanyInformation = require('../models/CompanyInformation');
const { deleteFile } = require('../utils/localUploader');
const { getUploadedUrl, isStoredFile } = require('../utils/cloudinary');

// @desc    Upload a company document
// @route   POST /api/company-information/documents
// @access  Private/Super Admin
exports.uploadCompanyDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const fileUrl = getUploadedUrl(req.file);

    const companyInfo = await CompanyInformation.findOneAndUpdate(
      {},
      {
        $push: {
          documents: {
            name: req.body.name || req.file.originalname,
            url: fileUrl,
          },
        },
      },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, data: companyInfo });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a company document
// @route   DELETE /api/company-information/documents/:docId
// @access  Private/Super Admin
exports.deleteCompanyDocument = async (req, res, next) => {
  try {
    // First, find the document to get its URL
    const companyInfoBefore = await CompanyInformation.findOne({});
    const docToDelete = companyInfoBefore?.documents.id(req.params.docId);

    if (docToDelete?.url && isStoredFile(docToDelete.url)) {
      await deleteFile(docToDelete.url);
    }

    const companyInfo = await CompanyInformation.findOneAndUpdate(
      {},
      {
        $pull: {
          documents: { _id: req.params.docId },
        },
      },
      { new: true }
    );

    if (!companyInfo) {
        return res.status(404).json({ success: false, message: 'Company information not found' });
    }

    res.status(200).json({ success: true, data: companyInfo });
  } catch (error) {
    next(error);
  }
};
