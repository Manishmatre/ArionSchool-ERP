const Gallery = require('../models/Gallery');
const { isSchoolTenantUser } = require('../utils/tenantAccess');
const { deleteFile } = require('../utils/localUploader');
const { getUploadedUrl, isStoredFile } = require('../utils/cloudinary');

// @desc    Get all gallery images
// @route   GET /api/gallery
// @access  Public
exports.getAllImages = async (req, res, next) => {
  try {
    let query = { isActive: true };

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by school
    if (req.query.franchise) {
      query.franchise = req.query.franchise;
    }

    // Filter by tags
    if (req.query.tags) {
      query.tags = { $in: req.query.tags.split(',') };
    }

    const images = await Gallery.find(query)
      .populate('franchise', 'name code')
      .populate('uploadedBy', 'name')
      .sort('order -createdAt');

    res.status(200).json({
      success: true,
      count: images.length,
      data: images
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single image
// @route   GET /api/gallery/:id
// @access  Public
exports.getImage = async (req, res, next) => {
  try {
    const image = await Gallery.findById(req.params.id)
      .populate('franchise', 'name code address')
      .populate('uploadedBy', 'name email');

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    res.status(200).json({
      success: true,
      data: image
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload image
// @route   POST /api/gallery
// @access  Private (Super Admin / School Admin)
exports.uploadGalleryImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const { title, description, category, franchise, tags } = req.body;

    const imageUrl = getUploadedUrl(req.file);

    // Create gallery entry
    const image = await Gallery.create({
      title,
      description,
      imageUrl: imageUrl,
      category,
      franchise: isSchoolTenantUser(req.user) ? req.user.franchise : (franchise || null),
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      uploadedBy: req.user._id,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: image
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload multiple images
// @route   POST /api/gallery/bulk
// @access  Private (Super Admin / School Admin)
exports.uploadMultipleImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one image'
      });
    }

    const { category, franchise, tags } = req.body;
    const uploadedImages = [];
    const errors = [];

    for (const file of req.files) {
      try {
        const imageUrl = getUploadedUrl(file);

        // Create gallery entry
        const image = await Gallery.create({
          title: file.originalname.split('.')[0],
          imageUrl: imageUrl,
          category,
          franchise: isSchoolTenantUser(req.user) ? req.user.franchise : (franchise || null),
          tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
          uploadedBy: req.user._id,
          isActive: true
        });

        uploadedImages.push(image);
      } catch (error) {
        errors.push({ file: file.originalname, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Uploaded ${uploadedImages.length} images`,
      data: {
        uploaded: uploadedImages.length,
        failed: errors.length,
        images: uploadedImages,
        errors
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update image
// @route   PUT /api/gallery/:id
// @access  Private (Super Admin / School Admin)
exports.updateImage = async (req, res, next) => {
  try {
    let image = await Gallery.findById(req.params.id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Check permissions
    if (isSchoolTenantUser(req.user) &&
        String(image.franchise?._id || image.franchise || '') !== String(req.user.franchise?._id || req.user.franchise || '')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this image'
      });
    }

    // If new file uploaded, replace the image
    if (req.file) {
      if (image.imageUrl && isStoredFile(image.imageUrl)) {
        await deleteFile(image.imageUrl);
      }

      req.body.imageUrl = getUploadedUrl(req.file);
    }

    // Normalize tags: accept comma-separated string or array
    if (req.body.tags !== undefined) {
      if (typeof req.body.tags === 'string') {
        req.body.tags = req.body.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);
      }
    }

    // Never allow overwriting immutable/ownership fields via body
    delete req.body.uploadedBy;
    delete req.body._id;
    if (isSchoolTenantUser(req.user)) delete req.body.franchise;

    image = await Gallery.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Image updated successfully',
      data: image
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete image
// @route   DELETE /api/gallery/:id
// @access  Private (Super Admin / School Admin)
exports.deleteGalleryImage = async (req, res, next) => {
  try {
    const image = await Gallery.findById(req.params.id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Check permissions
    if (isSchoolTenantUser(req.user) &&
        String(image.franchise?._id || image.franchise || '') !== String(req.user.franchise?._id || req.user.franchise || '')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this image'
      });
    }

    if (image.imageUrl && isStoredFile(image.imageUrl)) {
      await deleteFile(image.imageUrl);
    }

    await image.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle image active status
// @route   PUT /api/gallery/:id/toggle
// @access  Private (Super Admin / School Admin)
exports.toggleImageStatus = async (req, res, next) => {
  try {
    const image = await Gallery.findById(req.params.id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    image.isActive = !image.isActive;
    await image.save();

    res.status(200).json({
      success: true,
      message: `Image ${image.isActive ? 'activated' : 'deactivated'} successfully`,
      data: image
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update image order
// @route   PUT /api/gallery/:id/order
// @access  Private (Super Admin / School Admin)
exports.updateImageOrder = async (req, res, next) => {
  try {
    const { order } = req.body;

    const image = await Gallery.findByIdAndUpdate(
      req.params.id,
      { order },
      { new: true, runValidators: true }
    );

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Image order updated successfully',
      data: image
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get images by category
// @route   GET /api/gallery/category/:category
// @access  Public
exports.getImagesByCategory = async (req, res, next) => {
  try {
    const images = await Gallery.find({
      category: req.params.category,
      isActive: true
    })
      .populate('franchise', 'name code')
      .sort('order -createdAt');

    res.status(200).json({
      success: true,
      count: images.length,
      data: images
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get gallery statistics
// @route   GET /api/gallery/stats
// @access  Private (Super Admin / School Admin)
exports.getGalleryStats = async (req, res, next) => {
  try {
    let query = {};

    if (isSchoolTenantUser(req.user)) {
      query.franchise = req.user.franchise;
    }

    const totalImages = await Gallery.countDocuments(query);
    const activeImages = await Gallery.countDocuments({ ...query, isActive: true });

    // Images by category
    const byCategory = await Gallery.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalImages,
        active: activeImages,
        inactive: totalImages - activeImages,
        byCategory
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
