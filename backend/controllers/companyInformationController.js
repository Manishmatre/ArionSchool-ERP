const CompanyInformation = require('../models/CompanyInformation');
const { uploadBase64Image } = require('../utils/cloudinary');

// @desc    Get company information
// @route   GET /api/company-information
// @access  Private/Super Admin
exports.getCompanyInformation = async (req, res, next) => {
  try {
    let companyInfo = await CompanyInformation.findOne();

    if (!companyInfo) {
      // If no info exists, create a default one for The Vits School
      companyInfo = await CompanyInformation.create({
        name: 'The Vits School',
        legalName: 'The Vits School (Managed by ArionexTech)',
        description: 'CBSE Affiliated Senior Secondary School • Jabalpur, Madhya Pradesh',
        address: 'Jabalpur, Madhya Pradesh, India - 482001',
        addressDetails: {
          street: 'Campus Road',
          city: 'Jabalpur',
          state: 'Madhya Pradesh',
          zipCode: '482001',
          country: 'India'
        },
        phone: '+91 761 000 0000',
        email: 'info@thevitsschool.edu.in',
        website: 'https://thevitsschool.edu.in'
      });
    }

    res.status(200).json({ success: true, data: companyInfo });
  } catch (error) {
    next(error);
  }
};

// @desc    Update company information
// @route   PUT /api/company-information
// @access  Private/Super Admin
exports.updateCompanyInformation = async (req, res, next) => {
  try {
    const updateBody = { ...req.body };

    if (updateBody.superAdminSignature && typeof updateBody.superAdminSignature === 'string' && updateBody.superAdminSignature.startsWith('data:image/')) {
      const matches = updateBody.superAdminSignature.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.*)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ success: false, message: 'Invalid signature image format' });
      }

      updateBody.superAdminSignature = await uploadBase64Image(
        updateBody.superAdminSignature,
        'ses-lms/signatures'
      );
    }

    if (updateBody.companySeal && typeof updateBody.companySeal === 'string' && updateBody.companySeal.startsWith('data:image/')) {
      const matches = updateBody.companySeal.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.*)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ success: false, message: 'Invalid company seal image format' });
      }

      updateBody.companySeal = await uploadBase64Image(
        updateBody.companySeal,
        'ses-lms/seals'
      );
    }

    const companyInfo = await CompanyInformation.findOneAndUpdate({}, updateBody, {
      new: true,
      upsert: true, // Creates the document if it doesn't exist
      runValidators: true,
    });

    res.status(200).json({ success: true, data: companyInfo });
  } catch (error) {
    next(error);
  }
};
