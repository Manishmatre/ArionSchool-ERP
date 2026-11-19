const WebsiteContent = require('../models/WebsiteContent');
const WebsiteSettings = require('../models/WebsiteSettings');
const { deleteFile } = require('../utils/localUploader');
const { getUploadedUrl, isStoredFile } = require('../utils/cloudinary');
const Franchise = require('../models/SchoolCampus');

// @desc    Get all content for a specific page
// @route   GET /api/website/content/:page
// @access  Public
exports.getPageContent = async (req, res) => {
  try {
    const { page } = req.params;
    
    const content = await WebsiteContent.find({ 
      page, 
      isActive: true 
    }).sort('order');
    
    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get public list of schools for marketing website
// @route   GET /api/website/schools
// @access  Public
exports.getPublicSchools = async (req, res) => {
  try {
    const { q } = req.query;

    const query = {
      isActive: true
    };

    if (q && q.trim()) {
      const term = q.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { code: { $regex: term, $options: 'i' } },
        { 'address.city': { $regex: term, $options: 'i' } },
        { 'address.state': { $regex: term, $options: 'i' } }
      ];
    }

    const campuses = await Franchise.find(query)
      .select('name code address contactInfo owner establishedDate status')
      .sort({ createdAt: -1 })
      .lean();

    const data = campuses.map((f) => {
      const addressObj = f.address || {};
      const contactObj = f.contactInfo || {};
      const ownerObj = f.owner || {};

      const fullAddress = `${addressObj.street || ''}${addressObj.city ? `, ${addressObj.city}` : ''}${addressObj.state ? `, ${addressObj.state}` : ''}${addressObj.pincode ? ` - ${addressObj.pincode}` : ''}${addressObj.country ? `, ${addressObj.country}` : ''}`.trim();

      return {
        id: f._id,
        name: f.name,
        code: f.code,
        city: addressObj.city || '',
        state: addressObj.state || '',
        pincode: addressObj.pincode || '',
        address: addressObj.street || '',
        fullAddress,
        phone: contactObj.phone || '',
        email: contactObj.email || '',
        ownerName: ownerObj.name || '',
        ownerMobile: ownerObj.mobile || '',
        establishedDate: f.establishedDate || null
      };
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch franchises'
    });
  }
};

// @desc    Get all website content
// @route   GET /api/website/content
// @access  Public (for learning website) / Admin (with auth details)
exports.getAllContent = async (req, res) => {
  try {
    const { page, section } = req.query;
    let query = {};
    
    if (page) query.page = page;
    if (section) query.section = section;
    
    // Only show active content for public access
    if (!req.user) {
      query.isActive = true;
    }
    
    let contentQuery = WebsiteContent.find(query).sort('page order');
    
    // Only populate user details if authenticated (admin)
    if (req.user) {
      contentQuery = contentQuery.populate('updatedBy', 'name email');
    }
    
    const content = await contentQuery;
    
    res.status(200).json({
      success: true,
      count: content.length,
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single content by ID
// @route   GET /api/website/content/item/:id
// @access  Private/Admin
exports.getContentById = async (req, res) => {
  try {
    const content = await WebsiteContent.findById(req.params.id)
      .populate('updatedBy', 'name email');
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new content
// @route   POST /api/website/content
// @access  Private/Admin
exports.createContent = async (req, res) => {
  try {
    const contentData = {
      ...req.body,
      updatedBy: req.user.id
    };
    
    const content = await WebsiteContent.create(contentData);
    
    res.status(201).json({
      success: true,
      message: 'Content created successfully',
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update content
// @route   PUT /api/website/content/:id
// @access  Private/Admin
exports.updateContent = async (req, res) => {
  try {
    let content = await WebsiteContent.findById(req.params.id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }
    
    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };
    
    content = await WebsiteContent.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Content updated successfully',
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete content
// @route   DELETE /api/website/content/:id
// @access  Private/Admin
exports.deleteContent = async (req, res) => {
  try {
    const content = await WebsiteContent.findById(req.params.id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }
    
    if (content.imageUrl && isStoredFile(content.imageUrl)) {
      try {
        await deleteFile(content.imageUrl);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }
    
    await content.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Upload content image
// @route   POST /api/website/content/:id/image
// @access  Private/Admin
exports.uploadContentImage = async (req, res) => {
  try {
    const content = await WebsiteContent.findById(req.params.id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }
    
    if (content.imageUrl && isStoredFile(content.imageUrl)) {
      try {
        await deleteFile(content.imageUrl);
      } catch (error) {
        console.error('Error deleting old image:', error);
      }
    }

    const imageUrl = getUploadedUrl(req.file);
    
    content.imageUrl = imageUrl;
    content.updatedBy = req.user.id;
    await content.save();
    
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        imageUrl: imageUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== WEBSITE SETTINGS ====================

// @desc    Get website settings
// @route   GET /api/website/settings
// @access  Public
exports.getSettings = async (req, res) => {
  try {
    let settings = await WebsiteSettings.findOne();
    
    // Create default settings if none exist
    if (!settings) {
      settings = await WebsiteSettings.create({
        siteName: 'The Vits School',
        siteTagline: 'CBSE Affiliated Senior Secondary School • Jabalpur (M.P.)'
      });
    }
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update website settings
// @route   PUT /api/website/settings
// @access  Private/Admin
exports.updateSettings = async (req, res) => {
  try {
    let settings = await WebsiteSettings.findOne();
    
    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };
    
    if (settings) {
      settings = await WebsiteSettings.findByIdAndUpdate(
        settings._id,
        updateData,
        { new: true, runValidators: true }
      );
    } else {
      settings = await WebsiteSettings.create(updateData);
    }
    
    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Upload logo
// @route   POST /api/website/settings/logo
// @access  Private/Admin
exports.uploadLogo = async (req, res) => {
  try {
    let settings = await WebsiteSettings.findOne();
    
    if (!settings) {
      settings = await WebsiteSettings.create({});
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }
    
    if (settings.logo && isStoredFile(settings.logo)) {
      try {
        await deleteFile(settings.logo);
      } catch (error) {
        console.error('Error deleting old logo:', error);
      }
    }

    const logoUrl = getUploadedUrl(req.file);
    
    settings.logo = logoUrl;
    settings.updatedBy = req.user.id;
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logo: logoUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Upload favicon
// @route   POST /api/website/settings/favicon
// @access  Private/Admin
exports.uploadFavicon = async (req, res) => {
  try {
    let settings = await WebsiteSettings.findOne();
    
    if (!settings) {
      settings = await WebsiteSettings.create({});
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }
    
    if (settings.favicon && isStoredFile(settings.favicon)) {
      try {
        await deleteFile(settings.favicon);
      } catch (error) {
        console.error('Error deleting old favicon:', error);
      }
    }

    const faviconUrl = getUploadedUrl(req.file);
    
    settings.favicon = faviconUrl;
    settings.updatedBy = req.user.id;
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: 'Favicon uploaded successfully',
      data: {
        favicon: faviconUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Bulk update content order
// @route   PUT /api/website/content/reorder
// @access  Private/Admin
exports.reorderContent = async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, order }
    
    const updatePromises = items.map(item =>
      WebsiteContent.findByIdAndUpdate(item.id, { 
        order: item.order,
        updatedBy: req.user.id
      })
    );
    
    await Promise.all(updatePromises);
    
    res.status(200).json({
      success: true,
      message: 'Content reordered successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = exports;
