const HostelBuilding = require('../models/HostelBuilding');
const HostelRoom = require('../models/HostelRoom');
const HostelAllocation = require('../models/HostelAllocation');
const Student = require('../models/Student');
const FeeObligation = require('../models/FeeObligation');

const getTenantFranchise = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

// ==========================================
// 1. BUILDINGS
// ==========================================

exports.getBuildings = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};

    const buildings = await HostelBuilding.find(query)
      .populate('warden', 'personalInfo.firstName personalInfo.lastName contactInfo.mobile')
      .sort({ name: 1 });

    // Attach rooms count
    const buildingIds = buildings.map((b) => b._id);
    const rooms = await HostelRoom.find({ building: { $in: buildingIds } });

    const data = buildings.map((b) => {
      const bRooms = rooms.filter((r) => r.building.toString() === b._id.toString());
      const totalCapacity = bRooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
      const currentOccupancy = bRooms.reduce((acc, r) => acc + (r.currentOccupancy || 0), 0);
      return {
        ...b.toObject(),
        roomsCount: bRooms.length,
        totalCapacity,
        currentOccupancy
      };
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

exports.createBuilding = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const building = await HostelBuilding.create({
      ...req.body,
      franchise: franchiseId
    });
    res.status(201).json({ success: true, message: 'Hostel building added', data: building });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. ROOMS
// ==========================================

exports.getRooms = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};

    if (req.query.building) query.building = req.query.building;
    if (req.query.status) query.status = req.query.status;

    const rooms = await HostelRoom.find(query)
      .populate('building', 'name code genderType')
      .sort({ roomNumber: 1 });

    res.status(200).json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    next(error);
  }
};

exports.createRoom = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const room = await HostelRoom.create({
      ...req.body,
      franchise: franchiseId
    });
    res.status(201).json({ success: true, message: 'Hostel room created', data: room });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. ALLOCATIONS
// ==========================================

exports.allocateBed = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const { studentId, buildingId, roomId, bedNumber, securityDeposit, messPreference, monthlyFee } = req.body;

    const room = await HostelRoom.findById(roomId);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    if (room.currentOccupancy >= room.capacity) {
      return res.status(400).json({
        success: false,
        message: `Room ${room.roomNumber} is at maximum capacity (${room.capacity} students)`
      });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Check if student already has active hostel allocation
    const existingAllocation = await HostelAllocation.findOne({ student: student._id, status: 'active' });
    if (existingAllocation) {
      return res.status(400).json({
        success: false,
        message: 'Student already has an active hostel room allocation'
      });
    }

    const allocation = await HostelAllocation.create({
      student: student._id,
      building: buildingId,
      room: room._id,
      bedNumber: bedNumber || `Bed ${room.currentOccupancy + 1}`,
      securityDeposit: securityDeposit ? Number(securityDeposit) : 0,
      messPreference: messPreference || 'veg',
      franchise: franchiseId || student.franchise
    });

    // Update Room occupancy
    room.currentOccupancy += 1;
    if (room.currentOccupancy >= room.capacity) {
      room.status = 'occupied';
    }
    await room.save();

    // Create Fee Obligation if monthly hostel fee configured
    const feeToCharge = monthlyFee !== undefined ? Number(monthlyFee) : (room.monthlyFee || 0);
    if (feeToCharge > 0) {
      await FeeObligation.create({
        student: student._id,
        franchise: franchiseId || student.franchise,
        component: 'hostel',
        amountDue: feeToCharge,
        amountPending: feeToCharge,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        status: 'open',
        source: 'manual',
        description: `Hostel Fee: Room ${room.roomNumber} (${allocation.bedNumber})`
      });
    }

    const populated = await HostelAllocation.findById(allocation._id)
      .populate('student', 'personalInfo.firstName personalInfo.lastName studentId rollNumber')
      .populate('building', 'name code')
      .populate('room', 'roomNumber roomType monthlyFee');

    res.status(201).json({
      success: true,
      message: 'Student successfully allocated to hostel room',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

exports.vacateBed = async (req, res, next) => {
  try {
    const allocation = await HostelAllocation.findById(req.params.id);
    if (!allocation) return res.status(404).json({ success: false, message: 'Allocation not found' });

    allocation.status = 'vacated';
    allocation.vacatedDate = new Date();
    await allocation.save();

    const room = await HostelRoom.findById(allocation.room);
    if (room) {
      room.currentOccupancy = Math.max(0, room.currentOccupancy - 1);
      if (room.currentOccupancy < room.capacity && room.status === 'occupied') {
        room.status = 'available';
      }
      await room.save();
    }

    res.status(200).json({
      success: true,
      message: 'Hostel room successfully vacated'
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllocations = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};

    if (req.query.status) query.status = req.query.status;
    if (req.query.building) query.building = req.query.building;

    const allocations = await HostelAllocation.find(query)
      .populate('student', 'personalInfo.firstName personalInfo.lastName studentId admissionNumber contactInfo.mobile')
      .populate('building', 'name code')
      .populate('room', 'roomNumber roomType')
      .sort({ allocatedDate: -1 });

    res.status(200).json({ success: true, count: allocations.length, data: allocations });
  } catch (error) {
    next(error);
  }
};
