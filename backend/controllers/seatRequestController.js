const SeatRequest = require('../models/SeatRequest');
const Course = require('../models/Course');
const { getIO } = require('../utils/socket');

exports.getStats = async (req, res, next) => {
  try {
    const total = await SeatRequest.countDocuments();
    const pending = await SeatRequest.countDocuments({ status: 'pending' });
    const approved = await SeatRequest.countDocuments({ status: 'approved' });
    const rejected = await SeatRequest.countDocuments({ status: 'rejected' });
    res.status(200).json({ success: true, data: { total, pending, approved, rejected } });
  } catch (error) {
    next(error);
  }
};

exports.getMyStats = async (req, res, next) => {
  try {
    const franchiseId = req.user.franchise;
    const total = await SeatRequest.countDocuments({ franchise: franchiseId });
    const pending = await SeatRequest.countDocuments({ franchise: franchiseId, status: 'pending' });
    const approved = await SeatRequest.countDocuments({ franchise: franchiseId, status: 'approved' });
    const rejected = await SeatRequest.countDocuments({ franchise: franchiseId, status: 'rejected' });
    res.status(200).json({ success: true, data: { total, pending, approved, rejected } });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new seat request
// @route   POST /api/seat-requests
// @access  Private/FranchiseAdmin
exports.createSeatRequest = async (req, res, next) => {
  try {
    const { course, requestedSeats } = req.body;
    const franchise = req.user.franchise;

    if (!franchise) {
      return res.status(400).json({ success: false, message: 'User is not associated with a school.' });
    }

    const seatRequest = await SeatRequest.create({
      franchise,
      course,
      requestedSeats,
      requestedBy: req.user._id
    });

    // Notify super admins (all sockets) and the requesting school room.
    try {
      const io = getIO();
      io.emit('seat-request-created', { id: seatRequest._id, franchise });
      io.to(`franchise:${franchise}`).emit('seat-request-created', { id: seatRequest._id });
    } catch (e) { /* socket optional */ }

    res.status(201).json({ success: true, data: seatRequest });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all seat requests for a school
// @route   GET /api/seat-requests/my-requests
// @access  Private/FranchiseAdmin
exports.getMySeatRequests = async (req, res, next) => {
  try {
    const requests = await SeatRequest.find({ franchise: req.user.franchise })
      .populate('course', 'title')
      .populate('requestedBy', 'name')
      .populate('reviewedBy', 'name')
      .sort({ requestedAt: -1 });

    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all seat requests (for super admin)
// @route   GET /api/seat-requests
// @access  Private/SuperAdmin
exports.getAllSeatRequests = async (req, res, next) => {
  try {
    const requests = await SeatRequest.find()
      .populate('franchise', 'name')
      .populate('course', 'title')
      .populate('requestedBy', 'name')
      .sort({ requestedAt: -1 });

    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a seat request status (approve/reject)
// @route   PUT /api/seat-requests/:id
// @access  Private/SuperAdmin
exports.updateSeatRequest = async (req, res, next) => {
  try {
    const { status } = req.body;
    const requestId = req.params.id;

    const request = await SeatRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Seat request not found.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This request has already been reviewed.' });
    }

    request.status = status;
    request.reviewedBy = req.user._id;
    request.reviewedAt = Date.now();

    if (status === 'approved') {
      const course = await Course.findById(request.course);
      if (course) {
        const franchiseSeat = course.franchiseSeats.find(fs => fs.franchise.toString() === request.franchise.toString());

        if (franchiseSeat) {
          franchiseSeat.seats += request.requestedSeats;
        } else {
          course.franchiseSeats.push({ franchise: request.franchise, seats: request.requestedSeats });
        }
        await course.save();
      }
    }

    await request.save();

    // Notify the school (seats changed) and admins so lists refresh live.
    try {
      const io = getIO();
      const payload = { id: request._id, status: request.status, franchise: request.franchise };
      io.emit('seat-request-updated', payload);
      io.to(`franchise:${request.franchise}`).emit('seat-request-updated', payload);
    } catch (e) { /* socket optional */ }

    res.status(200).json({ success: true, data: request });

  } catch (error) {
    next(error);
  }
};

// @desc    Delete a seat request
// @route   DELETE /api/seat-requests/:id
// @access  Private/SuperAdmin
exports.deleteSeatRequest = async (req, res, next) => {
  try {
    const requestId = req.params.id;

    const request = await SeatRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Seat request not found.' });
    }

    // If the request was approved, we need to remove the allocated seats
    if (request.status === 'approved') {
      const course = await Course.findById(request.course);
      if (course) {
        const franchiseSeat = course.franchiseSeats.find(fs => fs.franchise.toString() === request.franchise.toString());
        
        if (franchiseSeat) {
          franchiseSeat.seats = Math.max(0, franchiseSeat.seats - request.requestedSeats);
          
          // Remove the school seat entry if seats become 0
          if (franchiseSeat.seats === 0) {
            course.franchiseSeats = course.franchiseSeats.filter(fs => fs.franchise.toString() !== request.franchise.toString());
          }
          
          await course.save();
        }
      }
    }

    const removedFranchise = request.franchise;
    await SeatRequest.findByIdAndDelete(requestId);

    try {
      const io = getIO();
      io.emit('seat-request-updated', { id: requestId, deleted: true, franchise: removedFranchise });
      io.to(`franchise:${removedFranchise}`).emit('seat-request-updated', { id: requestId, deleted: true });
    } catch (e) { /* socket optional */ }

    res.status(200).json({ success: true, message: 'Seat request deleted successfully' });

  } catch (error) {
    next(error);
  }
};
