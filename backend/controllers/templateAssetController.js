const path = require('path');
const fs = require('fs');
const CompanyInformation = require('../models/CompanyInformation');
const { getUploadedUrl, uploadBase64Image, deleteStoredFile } = require('../utils/cloudinary');

// Asset metadata definitions
const ASSET_DEFINITIONS = [
  {
    key: 'companySeal',
    label: 'Official Company Seal / Stamp',
    category: 'identity',
    description: 'Round official company seal stamp printed on certificates, marksheets, and student ID cards.',
    usedIn: ['Marksheets', 'Student Certificates', 'Student ID Cards'],
    recommendedSize: '300 x 300 px (Transparent PNG)',
    defaultNote: 'System uses built-in high-resolution vector SES round seal when not uploaded.'
  },
  {
    key: 'logo',
    label: 'Primary Company Logo',
    category: 'identity',
    description: 'Main brand logo displayed on headers of all official documents.',
    usedIn: ['Marksheets', 'Student Certificates', 'Student ID Cards', 'Franchise Certificates'],
    recommendedSize: '600 x 200 px (Transparent PNG)',
    defaultNote: 'System uses built-in Arion School primary logo.'
  },
  {
    key: 'superAdminSignature',
    label: 'CEO / Director Signature',
    category: 'signatures',
    description: 'Official signature of Chief Executive Officer / Super Administrator.',
    usedIn: ['Marksheets', 'Student Certificates', 'Student ID Cards', 'Franchise Certificates'],
    recommendedSize: '400 x 150 px (Transparent PNG)',
    defaultNote: 'System uses built-in stylized calligraphy signature when not uploaded.'
  },
  {
    key: 'controllerSignature',
    label: 'Examination Controller Signature',
    category: 'signatures',
    description: 'Signature of Controller of Examinations for academic validations.',
    usedIn: ['Marksheets', 'Student Certificates'],
    recommendedSize: '400 x 150 px (Transparent PNG)',
    defaultNote: 'Printed alongside CEO signature on official academic transcripts.'
  },
  {
    key: 'isoLogo',
    label: 'ISO 9001:2015 Certification Badge',
    category: 'accreditation',
    description: 'Official ISO 9001:2015 Gold Rosette / Badge of quality management.',
    usedIn: ['Marksheets Header & Footer', 'Certificates'],
    recommendedSize: '300 x 300 px (Transparent PNG or JPG)',
    defaultNote: 'System uses built-in ISO 9001:2015 Gold Rosette vector seal.'
  },
  {
    key: 'msmeLogo',
    label: 'MSME Registration Logo',
    category: 'accreditation',
    description: 'Ministry of Micro, Small and Medium Enterprises credential logo.',
    usedIn: ['Marksheets Accreditation Strip', 'Certificates'],
    recommendedSize: '350 x 150 px (Transparent PNG)',
    defaultNote: 'System uses built-in official MSME emblem.'
  },
  {
    key: 'govtEmblem',
    label: 'Government / MCA Emblem',
    category: 'accreditation',
    description: 'Government of India / Ministry of Corporate Affairs / Startup India recognition badge.',
    usedIn: ['Marksheets Accreditation Strip', 'Certificates'],
    recommendedSize: '300 x 300 px (Transparent PNG)',
    defaultNote: 'System uses built-in National Emblem & MCA insignia.'
  },
  {
    key: 'skillIndiaLogo',
    label: 'Skill India / NCVET Logo',
    category: 'accreditation',
    description: 'Skill India / National Skill Development Corporation affiliation badge.',
    usedIn: ['Marksheets Footer', 'Certificates'],
    recommendedSize: '350 x 150 px (Transparent PNG)',
    defaultNote: 'Optional accreditation partner logo.'
  },
  {
    key: 'watermarkImage',
    label: 'Document Center Watermark',
    category: 'identity',
    description: 'Faint security watermark rendered at center with 8% opacity to prevent counterfeiting.',
    usedIn: ['Marksheets Background', 'Certificates Background'],
    recommendedSize: '600 x 600 px (Monochrome / Grayscale PNG)',
    defaultNote: 'System uses faint circular SES logo watermark.'
  },
  {
    key: 'idCardHeaderBanner',
    label: 'ID Card Top Header Ribbon',
    category: 'id_card',
    description: 'Top decorative header ribbon background for Student Identity Cards.',
    usedIn: ['Student ID Cards (Front & Back)'],
    recommendedSize: '1080 x 200 px (PNG / JPG)',
    defaultNote: 'System uses geometric dual-tone gradient header bar.'
  }
];

const VALID_ASSET_KEYS = ASSET_DEFINITIONS.map(a => a.key);

// @desc    Get all template assets and company registration details
// @route   GET /api/template-assets
// @access  Private/Super Admin
exports.getTemplateAssets = async (req, res, next) => {
  try {
    let companyInfo = await CompanyInformation.findOne();
    if (!companyInfo) {
      companyInfo = await CompanyInformation.create({
        name: 'Startology Educare Services Private Limited',
        description: 'An ISO 9001:2015 Certified Educational Institution',
        cin: 'U85499CT2024PTC016832',
        registrationNumber: 'UDYAM-CG-14-0012948',
        isoNumber: 'ISO 9001:2015',
        address: 'Kanha Bhairav, Rajim, Phingeshwar, Raipur- 493885, Chhattisgarh, India',
        website: 'www.seseducare.com',
        email: 'info@seseducare.com',
        phone: '9165179272'
      });
    }

    const assets = ASSET_DEFINITIONS.map(def => {
      const url = companyInfo[def.key] || '';
      return {
        ...def,
        url,
        isCustom: Boolean(url && url.trim().length > 0)
      };
    });

    res.status(200).json({
      success: true,
      data: {
        assets,
        companyDetails: {
          name: companyInfo.name || 'Startology Educare Services Private Limited',
          legalName: companyInfo.legalName || companyInfo.name || 'Startology Educare Services Private Limited',
          description: companyInfo.description || '',
          cin: companyInfo.cin || 'U85499CT2024PTC016832',
          registrationNumber: companyInfo.registrationNumber || 'UDYAM-CG-14-0012948',
          isoNumber: companyInfo.isoNumber || 'ISO 9001:2015',
          address: companyInfo.address || 'Kanha Bhairav, Rajim, Phingeshwar, Raipur- 493885, Chhattisgarh, India',
          addressDetails: companyInfo.addressDetails || null,
          website: companyInfo.website || 'www.seseducare.com',
          email: companyInfo.email || 'info@seseducare.com',
          phone: companyInfo.phone || '9165179272',
          establishedYear: companyInfo.establishedYear || '2024',
          gstNumber: companyInfo.gstNumber || '',
          panNumber: companyInfo.panNumber || '',
          documents: companyInfo.documents || []
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload or update a template asset (seal, logo, signature, badge, etc.)
// @route   POST /api/template-assets/upload
// @access  Private/Super Admin
exports.uploadTemplateAsset = async (req, res, next) => {
  try {
    const assetKey = req.body.assetKey || req.query.assetKey;

    if (!assetKey || !VALID_ASSET_KEYS.includes(assetKey)) {
      return res.status(400).json({
        success: false,
        message: `Invalid assetKey. Allowed keys: ${VALID_ASSET_KEYS.join(', ')}`
      });
    }

    let fileUrl = '';

    // 1. If file uploaded via multer multipart
    const uploadedFile = req.file || req.files?.file?.[0] || req.files?.asset?.[0];
    if (uploadedFile) {
      fileUrl = getUploadedUrl(uploadedFile);
    }
    // 2. If base64 dataUrl string passed in body
    else if (req.body.dataUrl || req.body.image) {
      const base64Data = req.body.dataUrl || req.body.image;
      if (typeof base64Data === 'string' && base64Data.startsWith('data:image/')) {
        fileUrl = await uploadBase64Image(base64Data, `ses-lms/template-assets/${assetKey}`);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid base64 image data'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'No file or image data provided'
      });
    }

    const updatePayload = { [assetKey]: fileUrl };

    const companyInfo = await CompanyInformation.findOneAndUpdate(
      {},
      { $set: updatePayload },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: `${assetKey} updated successfully`,
      assetKey,
      url: fileUrl,
      data: companyInfo
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a template asset and revert to system default
// @route   DELETE /api/template-assets/:assetKey
// @access  Private/Super Admin
exports.deleteTemplateAsset = async (req, res, next) => {
  try {
    const { assetKey } = req.params;

    if (!assetKey || !VALID_ASSET_KEYS.includes(assetKey)) {
      return res.status(400).json({
        success: false,
        message: `Invalid assetKey. Allowed keys: ${VALID_ASSET_KEYS.join(', ')}`
      });
    }

    const companyInfo = await CompanyInformation.findOne();
    if (companyInfo && companyInfo[assetKey]) {
      const oldUrl = companyInfo[assetKey];
      try {
        await deleteStoredFile(oldUrl);
      } catch (err) {
        console.warn('Could not remove stored file:', err.message);
      }

      companyInfo[assetKey] = '';
      await companyInfo.save();
    }

    res.status(200).json({
      success: true,
      message: `${assetKey} reverted to system default`,
      assetKey
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update company credentials & registration details
// @route   PUT /api/template-assets/company-details (or /info)
// @access  Private/Super Admin
exports.updateCompanyDetails = async (req, res, next) => {
  try {
    const {
      name,
      legalName,
      description,
      cin,
      registrationNumber,
      isoNumber,
      address,
      website,
      email,
      phone,
      establishedYear,
      gstNumber,
      panNumber
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (legalName !== undefined) updateData.legalName = legalName;
    if (description !== undefined) updateData.description = description;
    if (cin !== undefined) updateData.cin = cin;
    if (registrationNumber !== undefined) updateData.registrationNumber = registrationNumber;
    if (isoNumber !== undefined) updateData.isoNumber = isoNumber;

    if (address !== undefined) {
      if (address && typeof address === 'object') {
        const parts = [address.street, address.city, address.state, address.zipCode, address.country].filter(Boolean);
        updateData.address = parts.join(', ');
        updateData.addressDetails = address;
      } else {
        updateData.address = address;
      }
    }

    if (website !== undefined) updateData.website = website;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (establishedYear !== undefined) updateData.establishedYear = establishedYear;
    if (gstNumber !== undefined) updateData.gstNumber = gstNumber;
    if (panNumber !== undefined) updateData.panNumber = panNumber;

    const companyInfo = await CompanyInformation.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Company registration details updated successfully',
      data: companyInfo
    });
  } catch (error) {
    next(error);
  }
};

