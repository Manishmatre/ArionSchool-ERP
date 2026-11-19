const Fee = require('../models/Fee');
const Course = require('../models/Course');
const Franchise = require('../models/SchoolCampus');

// @desc    Get all fee structures
// @route   GET /api/fees
// @access  Private (Super Admin / School Admin)
exports.getAllFees = async (req, res, next) => {
  try {
    let query = { isActive: true };

    // Filter by course
    if (req.query.course) {
      query.course = req.query.course;
    }

    // Non-super_admin users are strictly scoped to their own school's fee structure
    if (!['super_admin', 'school_owner'].includes(req.user.role)) {
      const userFid = req.user.franchise?._id || req.user.franchise;
      query.$or = [
        { franchise: userFid },
        { franchise: null } // Global school templates
      ];
    } else if (req.query.franchise && req.query.franchise !== 'all') {
      query.franchise = req.query.franchise;
    }

    const fees = await Fee.find(query)
      .populate('course', 'title category')
      .populate('franchise', 'name code')
      .populate('createdBy', 'name')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: fees.length,
      data: fees
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single fee structure
// @route   GET /api/fees/:id
// @access  Private
exports.getFee = async (req, res, next) => {
  try {
    const fee = await Fee.findById(req.params.id)
      .populate('course')
      .populate('franchise')
      .populate('createdBy', 'name email');

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee structure not found'
      });
    }

    res.status(200).json({
      success: true,
      data: fee
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get fee for course and school
// @route   GET /api/fees/course/:courseId/school/:franchiseId
// @access  Private
exports.getFeeForCourseAndFranchise = async (req, res, next) => {
  try {
    const { courseId, franchiseId } = req.params;

    // First try to find school-specific fee
    let fee = await Fee.findOne({
      course: courseId,
      franchise: franchiseId,
      isActive: true
    }).populate('course franchise');

    // If not found, try to find global fee for the course
    if (!fee) {
      fee = await Fee.findOne({
        course: courseId,
        franchise: null,
        isActive: true
      }).populate('course');
    }

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee structure not found for this course'
      });
    }

    res.status(200).json({
      success: true,
      data: fee
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create fee structure
// @route   POST /api/fees
// @access  Private (Super Admin)
exports.createFee = async (req, res, next) => {
  try {
    const {
      course,
      franchise,
      feeStructure,
      installments,
      discounts,
      taxes,
      effectiveFrom,
      effectiveTill
    } = req.body;

    // Verify course exists
    const courseExists = await Course.findById(course);
    if (!courseExists) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Verify school exists if provided
    if (franchise) {
      const franchiseExists = await Franchise.findById(franchise);
      if (!franchiseExists) {
        return res.status(404).json({
          success: false,
          message: 'School not found'
        });
      }
    }

    // Check if fee structure already exists
    const existingFee = await Fee.findOne({
      course,
      franchise: franchise || null,
      isActive: true
    });

    if (existingFee) {
      return res.status(400).json({
        success: false,
        message: 'Fee structure already exists for this course and school'
      });
    }

    const fee = await Fee.create({
      course,
      franchise,
      feeStructure,
      installments,
      discounts,
      taxes,
      effectiveFrom,
      effectiveTill,
      createdBy: req.user._id,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Fee structure created successfully',
      data: fee
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update fee structure
// @route   PUT /api/fees/:id
// @access  Private (Super Admin)
exports.updateFee = async (req, res, next) => {
  try {
    let fee = await Fee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee structure not found'
      });
    }

    fee = await Fee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Fee structure updated successfully',
      data: fee
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete fee structure
// @route   DELETE /api/fees/:id
// @access  Private (Super Admin)
exports.deleteFee = async (req, res, next) => {
  try {
    const fee = await Fee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee structure not found'
      });
    }

    await fee.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Fee structure deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle fee structure active status
// @route   PUT /api/fees/:id/toggle
// @access  Private (Super Admin)
exports.toggleFeeStatus = async (req, res, next) => {
  try {
    const fee = await Fee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee structure not found'
      });
    }

    fee.isActive = !fee.isActive;
    await fee.save();

    res.status(200).json({
      success: true,
      message: `Fee structure ${fee.isActive ? 'activated' : 'deactivated'} successfully`,
      data: fee
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add discount to fee structure
// @route   POST /api/fees/:id/discount
// @access  Private (Super Admin)
exports.addDiscount = async (req, res, next) => {
  try {
    const fee = await Fee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee structure not found'
      });
    }

    const { type, value, description, validFrom, validTill } = req.body;

    fee.discounts.push({
      type,
      value,
      description,
      validFrom,
      validTill
    });

    await fee.save();

    res.status(200).json({
      success: true,
      message: 'Discount added successfully',
      data: fee
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add installment plan
// @route   POST /api/fees/:id/installment
// @access  Private (Super Admin)
exports.addInstallment = async (req, res, next) => {
  try {
    const fee = await Fee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee structure not found'
      });
    }

    const { installmentNumber, amount, dueDate, description } = req.body;

    fee.installments.push({
      installmentNumber,
      amount,
      dueDate,
      description
    });

    await fee.save();

    res.status(200).json({
      success: true,
      message: 'Installment added successfully',
      data: fee
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Calculate total fee with discounts
// @route   POST /api/fees/:id/calculate
// @access  Private
exports.calculateFee = async (req, res, next) => {
  try {
    const fee = await Fee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee structure not found'
      });
    }

    let totalFee = fee.feeStructure.totalFee;
    let discountAmount = 0;

    // Apply valid discounts
    const currentDate = new Date();
    fee.discounts.forEach(discount => {
      const isValid = (!discount.validFrom || discount.validFrom <= currentDate) &&
                     (!discount.validTill || discount.validTill >= currentDate);
      
      if (isValid) {
        if (discount.type === 'percentage') {
          discountAmount += (totalFee * discount.value) / 100;
        } else {
          discountAmount += discount.value;
        }
      }
    });

    const netAmount = totalFee - discountAmount;
    const gstAmount = (netAmount * fee.taxes.gst) / 100;
    const finalAmount = netAmount + gstAmount + (fee.taxes.otherTaxes || 0);

    res.status(200).json({
      success: true,
      data: {
        totalFee,
        discountAmount,
        netAmount,
        gstAmount,
        otherTaxes: fee.taxes.otherTaxes || 0,
        finalAmount,
        breakdown: fee.feeStructure
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get fee statistics
// @route   GET /api/fees/stats
// @access  Private (Super Admin)
exports.getFeeStats = async (req, res, next) => {
  try {
    const totalFeeStructures = await Fee.countDocuments();
    const activeFeeStructures = await Fee.countDocuments({ isActive: true });
    const globalFees = await Fee.countDocuments({ franchise: null });
    const franchiseSpecificFees = await Fee.countDocuments({ franchise: { $ne: null } });

    // Average fee by course category
    const avgFeeByCategory = await Fee.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseData'
        }
      },
      { $unwind: '$courseData' },
      {
        $group: {
          _id: '$courseData.category',
          avgFee: { $avg: '$feeStructure.totalFee' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalFeeStructures,
        active: activeFeeStructures,
        global: globalFees,
        franchiseSpecific: franchiseSpecificFees,
        avgFeeByCategory
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
