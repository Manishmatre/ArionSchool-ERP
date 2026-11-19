const Footer = require('../models/Footer');
const { deleteFile } = require('../utils/localUploader');
const { getUploadedUrl, isStoredFile } = require('../utils/cloudinary');

// @desc    Get footer content
// @route   GET /api/footer
// @access  Public
exports.getFooter = async (req, res) => {
  try {
    let footer = await Footer.findOne();

    // Create default footer if none exists
    if (!footer) {
      footer = await Footer.create({
        about: {
          description: 'SES Educare - Your trusted partner in education and skill development.',
          tagline: 'Empowering Education, Enriching Lives'
        },
        quickLinks: [
          { title: 'Home', url: '/', order: 1 },
          { title: 'About Us', url: '/about', order: 2 },
          { title: 'Courses', url: '/courses', order: 3 },
          { title: 'Contact', url: '/contact', order: 4 }
        ],
        coursesLinks: [
          { title: 'Tally Course', url: '/courses/tally', order: 1 },
          { title: 'Computer Basics', url: '/courses/computer-basics', order: 2 },
          { title: 'Digital Marketing', url: '/courses/digital-marketing', order: 3 }
        ],
        importantLinks: [
          { title: 'Admissions', url: '/admissions', order: 1 },
          { title: 'Franchise', url: '/franchise-opportunity', order: 2 },
          { title: 'Certificates', url: '/certificates', order: 3 },
          { title: 'Gallery', url: '/gallery', order: 4 }
        ],
        contact: {
          address: '123 Main Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          phone: '+91 1234567890',
          email: 'info@seseducare.com',
          whatsapp: '+91 9876543210'
        },
        socialMedia: {
          facebook: 'https://facebook.com/seseducare',
          instagram: 'https://instagram.com/seseducare',
          twitter: 'https://twitter.com/seseducare',
          linkedin: 'https://linkedin.com/company/seseducare',
          youtube: 'https://youtube.com/@seseducare'
        },
        newsletter: {
          enabled: true,
          heading: 'Subscribe to Our Newsletter',
          description: 'Get latest updates about courses and offers',
          placeholder: 'Enter your email'
        },
        copyright: {
          text: 'All rights reserved.',
          year: new Date().getFullYear(),
          companyName: 'SES Educare'
        },
        businessHours: {
          weekdays: 'Mon - Fri: 9:00 AM - 6:00 PM',
          saturday: 'Sat: 9:00 AM - 2:00 PM',
          sunday: 'Closed'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: footer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update footer content
// @route   PUT /api/footer
// @access  Private/Admin
exports.updateFooter = async (req, res) => {
  try {
    let footer = await Footer.findOne();

    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };

    if (footer) {
      footer = await Footer.findByIdAndUpdate(
        footer._id,
        updateData,
        { new: true, runValidators: true }
      );
    } else {
      footer = await Footer.create(updateData);
    }

    res.status(200).json({
      success: true,
      message: 'Footer updated successfully',
      data: footer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add quick link
// @route   POST /api/footer/quick-links
// @access  Private/Admin
exports.addQuickLink = async (req, res) => {
  try {
    const footer = await Footer.findOne();
    
    if (!footer) {
      return res.status(404).json({
        success: false,
        message: 'Footer not found'
      });
    }

    footer.quickLinks.push({
      ...req.body,
      order: footer.quickLinks.length + 1
    });

    await footer.save();

    res.status(200).json({
      success: true,
      message: 'Quick link added successfully',
      data: footer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update quick link
// @route   PUT /api/footer/quick-links/:id
// @access  Private/Admin
exports.updateQuickLink = async (req, res) => {
  try {
    const footer = await Footer.findOne();
    
    if (!footer) {
      return res.status(404).json({
        success: false,
        message: 'Footer not found'
      });
    }

    const link = footer.quickLinks.id(req.params.id);
    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Link not found'
      });
    }

    Object.assign(link, req.body);
    await footer.save();

    res.status(200).json({
      success: true,
      message: 'Quick link updated successfully',
      data: footer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete quick link
// @route   DELETE /api/footer/quick-links/:id
// @access  Private/Admin
exports.deleteQuickLink = async (req, res) => {
  try {
    const footer = await Footer.findOne();
    
    if (!footer) {
      return res.status(404).json({
        success: false,
        message: 'Footer not found'
      });
    }

    footer.quickLinks.pull(req.params.id);
    await footer.save();

    res.status(200).json({
      success: true,
      message: 'Quick link deleted successfully',
      data: footer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Upload footer logo
// @route   POST /api/footer/logo
// @access  Private/Admin
exports.uploadLogo = async (req, res) => {
  try {
    const footer = await Footer.findOne();
    
    if (!footer) {
      return res.status(404).json({
        success: false,
        message: 'Footer not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    if (footer.about.logo && isStoredFile(footer.about.logo)) {
      try {
        await deleteFile(footer.about.logo);
      } catch (error) {
        console.error('Error deleting old logo:', error);
      }
    }

    const logoUrl = getUploadedUrl(req.file);

    footer.about.logo = logoUrl;
    footer.updatedBy = req.user.id;
    await footer.save();

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

// @desc    Add trust badge
// @route   POST /api/footer/trust-badges
// @access  Private/Admin
exports.addTrustBadge = async (req, res) => {
  try {
    const footer = await Footer.findOne();
    
    if (!footer) {
      return res.status(404).json({
        success: false,
        message: 'Footer not found'
      });
    }

    footer.trustBadges.push({
      ...req.body,
      order: footer.trustBadges.length + 1
    });

    await footer.save();

    res.status(200).json({
      success: true,
      message: 'Trust badge added successfully',
      data: footer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Upload trust badge image
// @route   POST /api/footer/trust-badges/:id/image
// @access  Private/Admin
exports.uploadTrustBadgeImage = async (req, res) => {
  try {
    const footer = await Footer.findOne();
    
    if (!footer) {
      return res.status(404).json({
        success: false,
        message: 'Footer not found'
      });
    }

    const badge = footer.trustBadges.id(req.params.id);
    if (!badge) {
      return res.status(404).json({
        success: false,
        message: 'Trust badge not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    if (badge.image && isStoredFile(badge.image)) {
      try {
        await deleteFile(badge.image);
      } catch (error) {
        console.error('Error deleting old image:', error);
      }
    }

    const imageUrl = getUploadedUrl(req.file);

    badge.image = imageUrl;
    footer.updatedBy = req.user.id;
    await footer.save();

    res.status(200).json({
      success: true,
      message: 'Badge image uploaded successfully',
      data: {
        image: imageUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = exports;
