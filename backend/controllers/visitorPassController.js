const VisitorPass = require('../models/VisitorPass');
const { getIO } = require('../utils/socket');

const getTenantFranchise = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

exports.getPasses = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};

    if (req.query.status) query.status = req.query.status;
    if (req.query.search) {
      query.$or = [
        { visitorName: { $regex: req.query.search, $options: 'i' } },
        { mobileNumber: { $regex: req.query.search, $options: 'i' } },
        { passNumber: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const passes = await VisitorPass.find(query)
      .populate('student', 'personalInfo.firstName personalInfo.lastName studentId rollNumber')
      .populate('staff', 'personalInfo.firstName personalInfo.lastName staffId')
      .populate('issuedBy', 'name email')
      .sort({ checkInTime: -1 });

    res.status(200).json({ success: true, count: passes.length, data: passes });
  } catch (error) {
    next(error);
  }
};

exports.createPass = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const pass = await VisitorPass.create({
      ...req.body,
      franchise: franchiseId,
      issuedBy: req.user._id,
      checkInTime: new Date(),
      status: 'inside'
    });

    const populated = await VisitorPass.findById(pass._id)
      .populate('student', 'personalInfo.firstName personalInfo.lastName studentId')
      .populate('staff', 'personalInfo.firstName personalInfo.lastName staffId');

    try {
      const io = getIO();
      if (io) {
        io.emit('visitor:checkin', { pass: populated });
      }
    } catch (e) {}

    res.status(201).json({
      success: true,
      message: `Visitor Gate Pass ${pass.passNumber} issued successfully`,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

exports.checkoutPass = async (req, res, next) => {
  try {
    const pass = await VisitorPass.findByIdAndUpdate(
      req.params.id,
      {
        status: 'checked_out',
        checkOutTime: new Date()
      },
      { new: true }
    );

    if (!pass) return res.status(404).json({ success: false, message: 'Visitor pass not found' });

    res.status(200).json({
      success: true,
      message: `Visitor ${pass.visitorName} checked out successfully`,
      data: pass
    });
  } catch (error) {
    next(error);
  }
};
