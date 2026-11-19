const Staff = require('../models/Staff');
const { isSchoolTenantUser, getSchoolTenantId } = require('../utils/tenantAccess');
const User = require('../models/User');
const Franchise = require('../models/SchoolCampus');

const staffScope = (user) => isSchoolTenantUser(user)
  ? { franchise: getSchoolTenantId(user) || '__missing_school__' }
  : {};

const roleForStaff = (department, designation) => {
  const value = `${department || ''} ${designation || ''}`.toLowerCase();
  if (/teach|faculty|instruct|academic/.test(value)) return 'teacher';
  if (/account|finance|payroll/.test(value)) return 'accountant';
  if (/admission|admissions|counsel/.test(value)) return 'admission_officer';
  if (/human resource|\bhr\b|management|admin/.test(value)) return 'hr_manager';
  if (/transport|driver/.test(value)) return 'transport_manager';
  if (/librar/.test(value)) return 'librarian';
  return 'security_staff';
};

// Helper to ensure administrators (super_admin & franchise_admin) have default Staff profiles
// so they can act as trainers, instructors, and teachers for small institutes
const ensureAdminStaffProfile = async (user, targetFranchiseId) => {
  if (!user || !['super_admin', 'franchise_admin'].includes(user.role)) return null;

  try {
    let staff = await Staff.findOne({ user: user._id });
    if (staff) return staff;

    // Resolve target school
    let franchise = targetFranchiseId || user.franchise;
    if (!franchise) {
      const f = await Franchise.findOne({ isMainBranch: true }) || await Franchise.findOne({});
      franchise = f?._id;
    }
    if (!franchise) return null;

    const names = (user.name || 'Admin Owner').trim().split(' ');
    const firstName = names[0] || 'Admin';
    const lastName = names.slice(1).join(' ') || '(Lead Trainer)';
    const staffId = `ADM-${String(user._id).slice(-4).toUpperCase()}`;

    // Verify staffId uniqueness
    const existingStaffId = await Staff.findOne({ staffId });
    const finalStaffId = existingStaffId ? `ADM-${Date.now().toString().slice(-6)}` : staffId;

    staff = await Staff.create({
      user: user._id,
      staffId: finalStaffId,
      franchise: franchise,
      personalInfo: {
        firstName: firstName,
        lastName: `${lastName} [Admin]`,
        dateOfBirth: new Date(1990, 0, 1),
        gender: 'male'
      },
      contactInfo: {
        email: user.email,
        mobile: user.mobile || '9876543210',
        address: {
          street: 'Main Campus / Admin Office',
          city: 'Center',
          state: 'State',
          pincode: '110001',
          country: 'India'
        }
      },
      employmentDetails: {
        designation: 'teacher',
        department: 'Academic & Administration',
        employeeType: 'full-time',
        joiningDate: new Date()
      },
      status: 'active'
    });

    return staff;
  } catch (err) {
    console.error('Auto-create admin staff profile error:', err);
    return null;
  }
};

// @desc    Get all staff
// @route   GET /api/staff
// @access  Private (Super Admin / School Admin)
exports.getAllStaff = async (req, res, next) => {
  try {
    // Automatically ensure the requesting admin has a Staff profile for trainer assignments
    await ensureAdminStaffProfile(req.user, req.query.franchise);

    let query = {};

    // If school admin, only show their franchise staff
    if (isSchoolTenantUser(req.user)) {
      query.franchise = getSchoolTenantId(req.user) || '__missing_school__';
    }

    // Filter by school
    if (!isSchoolTenantUser(req.user) && req.query.franchise) {
      query.franchise = req.query.franchise;
    }

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by designation - case-insensitive and multi-alias matching
    if (req.query.designation) {
      const des = req.query.designation.toLowerCase().trim();
      if (['teacher', 'trainer', 'faculty', 'instructor'].includes(des)) {
        query['employmentDetails.designation'] = {
          $in: [
            new RegExp('^teacher$', 'i'),
            new RegExp('^trainer$', 'i'),
            new RegExp('^faculty$', 'i'),
            new RegExp('^instructor$', 'i'),
            new RegExp('admin', 'i')
          ]
        };
      } else {
        query['employmentDetails.designation'] = new RegExp(`^${req.query.designation}$`, 'i');
      }
    }

    const staff = await Staff.find(query)
      .populate('user', 'name email mobile')
      .populate('franchise', 'name code')
      .populate('employmentDetails.reportingTo', 'personalInfo.firstName personalInfo.lastName')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: staff.length,
      data: staff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single staff
// @route   GET /api/staff/:id
// @access  Private
exports.getStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id, ...staffScope(req.user) })
      .populate('user')
      .populate('franchise')
      .populate('employmentDetails.reportingTo')
      .populate('leaves.approvedBy', 'name')
      .populate('performance.reviews.reviewedBy', 'name');

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }

    res.status(200).json({
      success: true,
      data: staff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new staff
// @route   POST /api/staff
// @access  Private (Super Admin / School Admin)
exports.createStaff = async (req, res, next) => {
  try {
    const {
      firstName, lastName, email, phone, dateOfBirth, gender,
      bloodGroup, aadharNumber, panNumber, alternatePhone,
      address, city, state, pincode,
      designation, department, employeeType, joiningDate,
      basicSalary, hra, ta, da, otherAllowances,
      pf, esi, tax, otherDeductions,
      accountNumber, ifscCode, bankName, branchName, paymentMode,
      franchise, password
    } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Generate staff ID
    const count = await Staff.countDocuments();
    const staffId = `STF${new Date().getFullYear()}${String(count + 1).padStart(5, '0')}`;

    // Create user account for staff
    const assignedSchool = isSchoolTenantUser(req.user) ? getSchoolTenantId(req.user) : franchise;
    if (!assignedSchool) return res.status(400).json({ success: false, message: 'A school campus is required' });
    const initialPassword = password || `Staff@${Math.random().toString(36).slice(-8)}`;
    const user = await User.create({
      name: `${firstName} ${lastName}`,
      email,
      mobile: phone,
      password: initialPassword,
      role: roleForStaff(department, designation),
      franchise: assignedSchool
    });

    const staff = await Staff.create({
      user: user._id,
      staffId,
      franchise: assignedSchool,
      personalInfo: {
        firstName,
        lastName,
        dateOfBirth,
        gender,
        bloodGroup,
        aadharNumber,
        panNumber
      },
      contactInfo: {
        email,
        mobile: phone,
        alternatePhone,
        address: {
          street: address,
          city,
          state,
          pincode,
          country: 'India'
        }
      },
      employmentDetails: {
        designation,
        department,
        employeeType: employeeType || 'full-time',
        joiningDate: joiningDate || new Date()
      },
      salary: {
        basicSalary: basicSalary || 0,
        allowances: {
          hra: hra || 0,
          ta: ta || 0,
          da: da || 0,
          other: otherAllowances || 0
        },
        deductions: {
          pf: pf || 0,
          esi: esi || 0,
          tax: tax || 0,
          other: otherDeductions || 0
        },
        paymentMode: paymentMode || 'bank_transfer',
        bankDetails: {
          accountNumber,
          ifscCode,
          bankName,
          branchName
        }
      },
      status: 'active'
    });


    // Send Welcome Email with Credentials to Staff
    try {
      const { sendStaffWelcomeCredentialsEmail } = require('../utils/emailService');
      await sendStaffWelcomeCredentialsEmail({
        name: `${firstName} ${lastName}`,
        email: email,
        password: initialPassword,
        designation: designation
      });
      console.log('Staff welcome email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send staff welcome email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Staff created successfully',
      data: staff
    });
  } catch (error) {
    console.error('Error in createStaff:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create staff'
    });
  }
};

// @desc    Update staff
// @route   PUT /api/staff/:id
// @access  Private (Super Admin / School Admin)
exports.updateStaff = async (req, res, next) => {
  try {
    let staff = await Staff.findOne({ _id: req.params.id, ...staffScope(req.user) });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }

    // Update staff
    const updates = { ...req.body };
    if (isSchoolTenantUser(req.user)) delete updates.franchise;
    delete updates.user;
    staff.set(updates);
    await staff.save();
    if (staff.user && (updates.contactInfo?.email || updates.contactInfo?.mobile || updates.employmentDetails?.designation || updates.employmentDetails?.department)) {
      const userUpdates = {};
      if (updates.contactInfo?.email) userUpdates.email = updates.contactInfo.email;
      if (updates.contactInfo?.mobile) userUpdates.mobile = updates.contactInfo.mobile;
      if (updates.employmentDetails?.designation || updates.employmentDetails?.department) {
        userUpdates.role = roleForStaff(updates.employmentDetails?.department || staff.employmentDetails?.department, updates.employmentDetails?.designation || staff.employmentDetails?.designation);
      }
      await User.findByIdAndUpdate(staff.user, userUpdates, { runValidators: true });
    }

    res.status(200).json({
      success: true,
      message: 'Staff updated successfully',
      data: staff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete staff
// @route   DELETE /api/staff/:id
// @access  Private (Super Admin)
exports.deleteStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id, ...staffScope(req.user) });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }

    // Delete associated user
    await User.findByIdAndDelete(staff.user);

    // Delete staff
    await staff.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Staff deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update staff status
// @route   PUT /api/staff/:id/status
// @access  Private (Super Admin / School Admin)
exports.updateStaffStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const staff = await Staff.findOneAndUpdate(
      { _id: req.params.id, ...staffScope(req.user) },
      { status },
      { new: true, runValidators: true }
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Staff status updated successfully',
      data: staff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark staff attendance
// @route   POST /api/staff/:id/attendance
// @access  Private
exports.markAttendance = async (req, res, next) => {
  try {
    const { date, status, checkIn, checkOut, remarks } = req.body;

    const staff = await Staff.findOne({ _id: req.params.id, ...staffScope(req.user) });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }

    // Calculate working hours if check-in and check-out provided
    let workingHours = 0;
    if (checkIn && checkOut) {
      const inTime = new Date(`2000-01-01 ${checkIn}`);
      const outTime = new Date(`2000-01-01 ${checkOut}`);
      workingHours = (outTime - inTime) / (1000 * 60 * 60);
    }

    staff.attendance.push({
      date: date || new Date(),
      status,
      checkIn,
      checkOut,
      workingHours,
      remarks
    });

    await staff.save();

    res.status(200).json({
      success: true,
      message: 'Attendance marked successfully',
      data: staff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Apply for leave
// @route   POST /api/staff/:id/leave
// @access  Private
exports.applyLeave = async (req, res, next) => {
  try {
    const { type, from, to, reason } = req.body;

    const staff = await Staff.findOne({ _id: req.params.id, ...staffScope(req.user) });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }

    // Calculate days
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;

    staff.leaves.push({
      type,
      from: fromDate,
      to: toDate,
      days,
      reason,
      status: 'pending'
    });

    await staff.save();

    res.status(200).json({
      success: true,
      message: 'Leave application submitted successfully',
      data: staff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get staff stats
// @route   GET /api/staff/stats
// @access  Private (Super Admin / School Admin)
exports.getStaffStats = async (req, res, next) => {
  try {
    let query = {};

    if (isSchoolTenantUser(req.user)) {
      query.franchise = getSchoolTenantId(req.user) || '__missing_school__';
    }

    const totalStaff = await Staff.countDocuments(query);
    const activeStaff = await Staff.countDocuments({ ...query, status: 'active' });
    const onLeave = await Staff.countDocuments({ ...query, status: 'on-leave' });
    const inactive = await Staff.countDocuments({ ...query, status: 'inactive' });

    res.status(200).json({
      success: true,
      data: {
        totalStaff,
        activeStaff,
        onLeave,
        inactive
      }
    });
  } catch (error) {
    next(error);
  }
};
