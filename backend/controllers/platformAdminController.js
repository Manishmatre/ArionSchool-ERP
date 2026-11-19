const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const os = require('os');
const crypto = require('crypto');
const SchoolCampus = require('../models/SchoolCampus');
const SchoolSubscription = require('../models/SchoolSubscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SchoolBranding = require('../models/SchoolBranding');
const AcademicSession = require('../models/AcademicSession');
const PlatformLead = require('../models/PlatformLead');
const PlatformConfig = require('../models/PlatformConfig');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const User = require('../models/User');
const Notification = require('../models/Notification');
const LoginActivity = require('../models/LoginActivity');
const AiUsageLog = require('../models/AiUsageLog');
const pkg = require('../package.json');

const APP_VERSION = pkg.version || '2.0.102';

const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'admin', 'api', 'console', 'platform', 'mail', 'smtp',
  'ftp', 'cdn', 'static', 'assets', 'docs', 'help', 'support', 'status',
  'billing', 'login', 'register', 'auth', 'arion', 'arionschool', 'arionextech'
]);

const sanitizeSubdomain = (value = '') =>
  String(value).trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');

// ============================================================
// PUBLIC ENDPOINTS (for standalone Landing Page & Domain Check)
// ============================================================

// @desc    Check if a school subdomain is available
// @route   GET /api/platform-admin/public/check-subdomain/:subdomain
exports.checkSubdomainAvailability = async (req, res, next) => {
  try {
    const clean = sanitizeSubdomain(req.params.subdomain);
    const config = await PlatformConfig.findOne({ singletonKey: 'GLOBAL_PLATFORM_CONFIG' }).select('primaryDomain').lean();
    const configuredDomain = config?.primaryDomain || 'seseducare.com';
    const primaryDomain = configuredDomain === 'arionschool.com' ? 'seseducare.com' : configuredDomain;
    if (!clean || clean.length < 3) {
      return res.status(400).json({
        success: false,
        available: false,
        message: 'Subdomain must be at least 3 alphanumeric characters.'
      });
    }
    if (RESERVED_SUBDOMAINS.has(clean)) {
      return res.status(200).json({
        success: true,
        available: false,
        subdomain: clean,
        domain: `${clean}.${primaryDomain}`,
        message: 'This subdomain is reserved by the platform.'
      });
    }

    const existing = await SchoolCampus.findOne({ subdomain: clean }).select('_id name');
    return res.status(200).json({
      success: true,
      available: !existing,
      subdomain: clean,
      domain: `${clean}.${primaryDomain}`,
      message: existing ? 'Subdomain is already registered to another school.' : 'Subdomain is available!'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public school platform and domain config
// @route   GET /api/platform-admin/public/config
exports.getPublicPlatformConfig = async (req, res, next) => {
  try {
    let config = await PlatformConfig.findOne({ singletonKey: 'GLOBAL_PLATFORM_CONFIG' });
    if (!config) {
      config = await PlatformConfig.create({ singletonKey: 'GLOBAL_PLATFORM_CONFIG' });
    }
    res.status(200).json({
      success: true,
      data: {
        productName: config.productName === 'Arion School' ? 'SES Educare' : config.productName,
        companyName: config.companyName === 'ArionexTech' ? 'STARTOLOGY EDUCARE SERVICES PRIVATE LIMITED' : config.companyName,
        primaryDomain: config.primaryDomain === 'arionschool.com' ? 'seseducare.com' : config.primaryDomain,
        appDomain: config.appDomain === 'app.arionschool.com' ? 'myapp.seseducare.com' : config.appDomain,
        maintenanceMode: config.maintenanceMode,
        maintenanceMessage: config.maintenanceMessage,
        supportEmail: config.supportEmail,
        supportPhone: config.supportPhone,
        version: APP_VERSION
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit a school demo request from the public school ERP site
// @route   POST /api/platform-admin/public/leads
exports.createPublicLead = async (req, res, next) => {
  try {
    const {
      schoolName,
      contactName,
      name,
      designation,
      email,
      phone,
      city,
      state,
      studentCount,
      board,
      requestedSubdomain,
      offerCode = 'SCHOOL_DEMO',
      notes = ''
    } = req.body;

    if (!schoolName || !(contactName || name) || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'School name, contact name, email, and phone are required.'
      });
    }

    const lead = await PlatformLead.create({
      schoolName,
      contactName: contactName || name,
      designation: designation || 'Principal / Director',
      email,
      phone,
      city: city || '',
      state: state || '',
      studentCount: studentCount || '500-1000',
      board: board || 'CBSE',
      requestedSubdomain: sanitizeSubdomain(requestedSubdomain || ''),
      offerCode,
      source: 'landing_page',
      status: 'new',
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Your school demo request has been received. The SES Educare team will contact you shortly.',
      data: lead
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 1. EXECUTIVE SAAS ANALYTICS & SYSTEM HEALTH
// ============================================================

// @desc    Get Platform-level SaaS Overview (Super Admin)
// @route   GET /api/platform-admin/overview
exports.getPlatformOverview = async (req, res, next) => {
  try {
    const [
      totalSchools,
      activeSchools,
      suspendedSchools,
      pendingSchools,
      totalStudents,
      totalStaff,
      totalUsers,
      subscriptions,
      plans,
      totalLeads,
      newLeads,
      recentSchools,
      recentLeads,
      aiCallsCount
    ] = await Promise.all([
      SchoolCampus.countDocuments(),
      SchoolCampus.countDocuments({ status: 'active' }),
      SchoolCampus.countDocuments({ status: 'suspended' }),
      SchoolCampus.countDocuments({ status: 'pending' }),
      Student.countDocuments({ status: 'active' }),
      Staff.countDocuments({ status: 'active' }),
      User.countDocuments(),
      SchoolSubscription.find().populate('plan', 'name code price billingCycle').populate('school', 'name code'),
      SubscriptionPlan.find().sort({ price: 1 }),
      PlatformLead.countDocuments(),
      PlatformLead.countDocuments({ status: 'new' }),
      SchoolCampus.find().sort({ createdAt: -1 }).limit(6).select('name code subdomain status board address.city createdAt'),
      PlatformLead.find().sort({ createdAt: -1 }).limit(6),
      AiUsageLog.countDocuments().catch(() => 0)
    ]);

    let trialCount = 0;
    let expiredCount = 0;
    let totalRevenue = 0;
    let estimatedMrr = 0;
    const planDistribution = {};
    const monthlyRevenueMap = {};
    const now = new Date();

    // Initialize last 6 months buckets for chart
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      monthlyRevenueMap[key] = { month: key, revenue: 0, schools: 0 };
    }

    subscriptions.forEach((sub) => {
      if (sub.status === 'trial') trialCount++;
      if (sub.status === 'expired' || (sub.currentPeriodEnd && now > sub.currentPeriodEnd)) expiredCount++;

      const planName = sub.plan?.name || 'Unassigned';
      planDistribution[planName] = (planDistribution[planName] || 0) + 1;

      if (sub.status === 'active' && sub.plan?.price) {
        if (sub.plan.billingCycle === 'monthly') estimatedMrr += sub.plan.price;
        else if (sub.plan.billingCycle === 'quarterly') estimatedMrr += Math.round(sub.plan.price / 3);
        else if (sub.plan.billingCycle === 'annual') estimatedMrr += Math.round(sub.plan.price / 12);
      }

      if (Array.isArray(sub.invoices)) {
        sub.invoices.forEach((inv) => {
          if (inv.status === 'paid' && inv.amount) {
            totalRevenue += inv.amount;
            const dt = new Date(inv.paidAt || inv.createdAt || now);
            const key = dt.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
            if (monthlyRevenueMap[key]) {
              monthlyRevenueMap[key].revenue += inv.amount;
            }
          }
        });
      }
    });

    // Add schools created per month to chart
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const schoolGrowth = await SchoolCampus.find({ createdAt: { $gte: sixMonthsAgo } }).select('createdAt');
    schoolGrowth.forEach((sc) => {
      const dt = new Date(sc.createdAt);
      const key = dt.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      if (monthlyRevenueMap[key]) {
        monthlyRevenueMap[key].schools += 1;
      }
    });

    const memUsage = process.memoryUsage();
    const systemHealth = {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      dbName: mongoose.connection.name || 'primary',
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsedMb: Math.round(memUsage.rss / 1024 / 1024),
      totalMemMb: Math.round(os.totalmem() / 1024 / 1024),
      nodeVersion: process.version,
      systemVersion: APP_VERSION
    };

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalSchools,
          activeSchools,
          trialSchools: trialCount,
          suspendedSchools,
          pendingSchools,
          expiredSchools: expiredCount,
          totalStudents,
          totalStaff,
          totalUsers,
          totalRevenue,
          estimatedMrr,
          estimatedArr: estimatedMrr * 12,
          totalLeads,
          newLeads,
          aiCallsCount,
          systemVersion: APP_VERSION
        },
        plansCount: plans.length,
        planDistribution: Object.entries(planDistribution).map(([name, value]) => ({ name, value })),
        monthlySeries: Object.values(monthlyRevenueMap),
        recentSchools,
        recentLeads,
        systemHealth
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 2. SCHOOLS / TENANTS FULL CRUD & LIFECYCLE CONTROL
// ============================================================

// @desc    Get All Schools with Subscription & Student Details
// @route   GET /api/platform-admin/schools
exports.getAllSchools = async (req, res, next) => {
  try {
    const { search, status, board, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status && status !== 'all') filter.status = status;
    if (board && board !== 'all') filter.board = board;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { subdomain: { $regex: search, $options: 'i' } },
        { customDomain: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'owner.email': { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [schools, total] = await Promise.all([
      SchoolCampus.find(filter)
        .populate('admin', 'name email mobile isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      SchoolCampus.countDocuments(filter)
    ]);

    const schoolIds = schools.map(s => s._id);
    const [studentCounts, staffCounts, subscriptions] = await Promise.all([
      Student.aggregate([
        { $match: { franchise: { $in: schoolIds } } },
        { $group: { _id: '$franchise', count: { $sum: 1 } } }
      ]),
      Staff.aggregate([
        { $match: { franchise: { $in: schoolIds } } },
        { $group: { _id: '$franchise', count: { $sum: 1 } } }
      ]),
      SchoolSubscription.find({ school: { $in: schoolIds } }).populate('plan', 'name code price billingCycle maxStudents')
    ]);

    const countMap = {};
    studentCounts.forEach(c => { countMap[c._id.toString()] = c.count; });

    const staffMap = {};
    staffCounts.forEach(c => { staffMap[c._id.toString()] = c.count; });

    const subMap = {};
    subscriptions.forEach(s => { subMap[s.school.toString()] = s; });

    const enhancedSchools = schools.map(sch => {
      const schObj = sch.toObject();
      schObj.activeStudentCount = countMap[sch._id.toString()] || 0;
      schObj.staffCount = staffMap[sch._id.toString()] || 0;
      schObj.subscription = subMap[sch._id.toString()] || null;
      return schObj;
    });

    res.status(200).json({
      success: true,
      count: enhancedSchools.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: enhancedSchools
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single School Tenant Deep Dive
// @route   GET /api/platform-admin/schools/:id
exports.getSchoolById = async (req, res, next) => {
  try {
    const school = await SchoolCampus.findById(req.params.id).populate('admin', 'name email mobile role isActive createdAt');
    if (!school) {
      return res.status(404).json({ success: false, message: 'School tenant not found' });
    }

    const [subscription, branding, studentCount, staffCount, userCount, sessions] = await Promise.all([
      SchoolSubscription.findOne({ school: school._id }).populate('plan'),
      SchoolBranding.findOne({ franchise: school._id }).catch(() => null),
      Student.countDocuments({ franchise: school._id }),
      Staff.countDocuments({ franchise: school._id }),
      User.countDocuments({ franchise: school._id }),
      AcademicSession.find({ franchise: school._id }).sort({ startDate: -1 })
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...school.toObject(),
        subscription,
        branding,
        stats: { studentCount, staffCount, userCount },
        sessions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Provision New School Tenant (Atomic: Campus + Principal Admin + Subscription + Branding + Session)
// @route   POST /api/platform-admin/schools
exports.provisionSchool = async (req, res, next) => {
  try {
    const {
      name,
      code,
      subdomain,
      customDomain = '',
      board = 'CBSE',
      affiliationNumber = '',
      ownerName,
      ownerEmail,
      ownerMobile,
      adminPassword,
      street = 'Main Campus Road',
      city = 'Jabalpur',
      state = 'Madhya Pradesh',
      pincode = '482001',
      planId,
      subscriptionStatus = 'active',
      trialDays = 14,
      enabledModules
    } = req.body;

    if (!name || !code || !ownerName || !ownerEmail || !ownerMobile) {
      return res.status(400).json({
        success: false,
        message: 'School name, code, principal name, email, and 10-digit mobile are required.'
      });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const cleanSubdomain = sanitizeSubdomain(subdomain || code);
    const cleanMobile = String(ownerMobile).replace(/\D/g, '').slice(-10);

    if (cleanMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number.' });
    }

    const existingCampus = await SchoolCampus.findOne({
      $or: [{ code: cleanCode }, ...(cleanSubdomain ? [{ subdomain: cleanSubdomain }] : [])]
    });
    if (existingCampus) {
      return res.status(400).json({
        success: false,
        message: 'A school with this code or subdomain already exists.'
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: ownerEmail.toLowerCase().trim() }, { mobile: cleanMobile }]
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Principal email or mobile number is already registered to another user.'
      });
    }

    // Resolve plan
    let selectedPlan = null;
    if (planId) {
      selectedPlan = await SubscriptionPlan.findById(planId);
    }
    if (!selectedPlan) {
      selectedPlan = await SubscriptionPlan.findOne({ isActive: true }).sort({ price: 1 });
    }

    // 1. Create School Campus
    const campus = await SchoolCampus.create({
      name: name.trim(),
      code: cleanCode,
      subdomain: cleanSubdomain || undefined,
      customDomain: customDomain ? customDomain.toLowerCase().trim() : '',
      board,
      affiliationNumber,
      owner: {
        name: ownerName.trim(),
        email: ownerEmail.toLowerCase().trim(),
        mobile: cleanMobile
      },
      address: { street, city, state, pincode, country: 'India' },
      contactInfo: { phone: cleanMobile, email: ownerEmail.toLowerCase().trim() },
      status: 'active',
      plan: selectedPlan ? selectedPlan._id : undefined,
      ...(enabledModules ? { enabledModules } : {})
    });

    // 2. Create Principal / School Admin User
    const initialPassword = adminPassword && adminPassword.length >= 8
      ? adminPassword
      : `${crypto.randomBytes(10).toString('hex')}aA1!`;
    const adminUser = await User.create({
      name: ownerName.trim(),
      email: ownerEmail.toLowerCase().trim(),
      mobile: cleanMobile,
      password: initialPassword,
      role: 'school_admin',
      franchise: campus._id,
      isActive: true
    });

    campus.admin = adminUser._id;
    await campus.save();

    // 3. Provision Default Academic Session
    const currentYear = new Date().getFullYear();
    const session = await AcademicSession.create({
      sessionName: `${currentYear}-${currentYear + 1}`,
      startDate: new Date(`${currentYear}-04-01`),
      endDate: new Date(`${currentYear + 1}-03-31`),
      isCurrent: true,
      franchise: campus._id,
      status: 'active',
      description: 'Auto-provisioned initial academic session'
    });
    campus.academicSession = session._id;
    await campus.save();

    // 4. Provision School Branding
    await SchoolBranding.create({
      franchise: campus._id,
      identity: {
        schoolName: campus.name,
        shortName: cleanCode,
        tagline: `${board} Affiliated K-12 School`,
        boardAffiliation: board,
        affiliationNumber
      },
      contact: {
        email: ownerEmail.toLowerCase().trim(),
        phone: cleanMobile,
        address: `${street}, ${city}, ${state} - ${pincode}`
      }
    }).catch(() => {});

    // 5. Provision School Subscription
    let subscription = null;
    if (selectedPlan) {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + Number(trialDays || selectedPlan.trialDays || 14) * 86400000);
      const periodEnd = new Date(now.getTime() + 365 * 86400000);
      subscription = await SchoolSubscription.create({
        school: campus._id,
        plan: selectedPlan._id,
        status: subscriptionStatus,
        trialStartsAt: now,
        trialEndsAt: trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd
      });
      campus.planExpiresAt = periodEnd;
      await campus.save();
    }

    res.status(201).json({
      success: true,
      message: `School "${campus.name}" provisioned successfully!`,
      data: {
        school: campus,
        adminCredentials: {
          email: adminUser.email,
          password: initialPassword,
          role: adminUser.role
        },
        subscription
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update School Tenant Details
// @route   PUT /api/platform-admin/schools/:id
exports.updateSchool = async (req, res, next) => {
  try {
    const school = await SchoolCampus.findById(req.params.id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School tenant not found' });
    }

    const {
      name, code, subdomain, customDomain, domainVerified, board, affiliationNumber,
      ownerName, ownerEmail, ownerMobile, street, city, state, pincode, status, enabledModules
    } = req.body;

    if (name) school.name = name.trim();
    if (code) school.code = code.trim().toUpperCase();
    if (subdomain !== undefined) school.subdomain = sanitizeSubdomain(subdomain) || undefined;
    if (customDomain !== undefined) school.customDomain = String(customDomain).trim().toLowerCase();
    if (typeof domainVerified === 'boolean') school.domainVerified = domainVerified;
    if (board) school.board = board;
    if (affiliationNumber !== undefined) school.affiliationNumber = affiliationNumber;
    if (status && ['active', 'inactive', 'pending', 'suspended'].includes(status)) school.status = status;

    if (ownerName) school.owner.name = ownerName;
    if (ownerEmail) {
      school.owner.email = ownerEmail.toLowerCase().trim();
      school.contactInfo.email = ownerEmail.toLowerCase().trim();
    }
    if (ownerMobile) {
      school.owner.mobile = ownerMobile;
      school.contactInfo.phone = ownerMobile;
    }

    if (street) school.address.street = street;
    if (city) school.address.city = city;
    if (state) school.address.state = state;
    if (pincode) school.address.pincode = pincode;
    if (enabledModules && typeof enabledModules === 'object') {
      school.enabledModules = { ...school.enabledModules?.toObject?.(), ...enabledModules };
    }

    await school.save();

    res.status(200).json({
      success: true,
      message: 'School tenant updated successfully',
      data: school
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update School Status (Activate, Suspend, Deactivate)
// @route   PATCH /api/platform-admin/schools/:id/status
exports.updateSchoolStatus = async (req, res, next) => {
  try {
    const { status, suspensionReason = '' } = req.body;
    if (!['active', 'inactive', 'pending', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const school = await SchoolCampus.findByIdAndUpdate(
      req.params.id,
      { status, suspensionReason: status === 'suspended' ? suspensionReason : '' },
      { new: true }
    );
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    if (status === 'suspended') {
      await SchoolSubscription.updateOne({ school: school._id }, { status: 'suspended' });
    } else if (status === 'active') {
      await SchoolSubscription.updateOne({ school: school._id }, { status: 'active' });
    }

    res.status(200).json({
      success: true,
      message: `School status updated to ${status}`,
      data: school
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle SaaS Module Feature Flags for a School
// @route   PATCH /api/platform-admin/schools/:id/features
exports.updateSchoolFeatures = async (req, res, next) => {
  try {
    const { enabledModules } = req.body;
    if (!enabledModules || typeof enabledModules !== 'object') {
      return res.status(400).json({ success: false, message: 'enabledModules object is required' });
    }

    const school = await SchoolCampus.findById(req.params.id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    school.enabledModules = {
      ...(school.enabledModules?.toObject ? school.enabledModules.toObject() : school.enabledModules),
      ...enabledModules
    };
    await school.save();

    res.status(200).json({
      success: true,
      message: 'School module permissions updated',
      data: school.enabledModules
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset School Principal / Admin Password
// @route   POST /api/platform-admin/schools/:id/reset-password
exports.resetSchoolAdminPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const school = await SchoolCampus.findById(req.params.id);
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });

    const adminUser = await User.findById(school.admin) || await User.findOne({
      franchise: school._id,
      role: { $in: ['school_admin', 'franchise_admin', 'principal'] }
    });
    if (!adminUser) return res.status(404).json({ success: false, message: 'School admin user not found' });

    adminUser.password = newPassword;
    await adminUser.save();

    res.status(200).json({
      success: true,
      message: `Password reset successfully for ${adminUser.email}`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate Short-lived Impersonation Token for Support/Ops
// @route   POST /api/platform-admin/schools/:id/impersonate
exports.impersonateSchoolAdmin = async (req, res, next) => {
  try {
    const school = await SchoolCampus.findById(req.params.id);
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });

    const adminUser = await User.findById(school.admin) || await User.findOne({
      franchise: school._id,
      role: { $in: ['school_admin', 'franchise_admin', 'principal'] }
    });
    if (!adminUser) return res.status(404).json({ success: false, message: 'School administrator account not found' });

    const token = jwt.sign(
      { id: adminUser._id, impersonatedBy: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.status(200).json({
      success: true,
      message: `Impersonation session created for ${school.name}`,
      data: {
        token,
        user: {
          _id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          franchise: school._id
        },
        schoolName: school.name,
        subdomain: school.subdomain
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete School Tenant
// @route   DELETE /api/platform-admin/schools/:id
exports.deleteSchool = async (req, res, next) => {
  try {
    const school = await SchoolCampus.findById(req.params.id);
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });

    await Promise.all([
      SchoolSubscription.deleteMany({ school: school._id }),
      SchoolBranding.deleteMany({ franchise: school._id }).catch(() => {}),
      SchoolCampus.findByIdAndDelete(school._id)
    ]);

    res.status(200).json({
      success: true,
      message: `School "${school.name}" deleted from platform`
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. SUBSCRIPTION PLANS FULL CRUD
// ============================================================

exports.getPlans = async (req, res, next) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ price: 1 });
    const subCounts = await SchoolSubscription.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    subCounts.forEach((c) => { if (c._id) countMap[c._id.toString()] = c.count; });

    const enriched = plans.map((p) => ({
      ...p.toObject(),
      activeTenants: countMap[p._id.toString()] || 0
    }));

    res.status(200).json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    next(error);
  }
};

exports.createPlan = async (req, res, next) => {
  try {
    const plan = await SubscriptionPlan.create(req.body);
    res.status(201).json({ success: true, message: 'Subscription plan created', data: plan });
  } catch (error) {
    next(error);
  }
};

exports.updatePlan = async (req, res, next) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.status(200).json({ success: true, message: 'Subscription plan updated', data: plan });
  } catch (error) {
    next(error);
  }
};

exports.deletePlan = async (req, res, next) => {
  try {
    const activeSubs = await SchoolSubscription.countDocuments({ plan: req.params.id });
    if (activeSubs > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan while ${activeSubs} school(s) are subscribed to it. Deactivate it or migrate schools first.`
      });
    }
    const plan = await SubscriptionPlan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.status(200).json({ success: true, message: 'Subscription plan deleted' });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 4. TENANT SUBSCRIPTIONS & INVOICES LEDGER
// ============================================================

exports.getAllSubscriptions = async (req, res, next) => {
  try {
    const subs = await SchoolSubscription.find()
      .populate('school', 'name code subdomain status owner.email')
      .populate('plan', 'name code price billingCycle maxStudents')
      .sort({ updatedAt: -1 });

    const studentCounts = await Student.aggregate([
      { $group: { _id: '$franchise', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    studentCounts.forEach((c) => { if (c._id) countMap[c._id.toString()] = c.count; });

    const data = subs.map((s) => ({
      ...s.toObject(),
      currentStudents: s.school ? (countMap[s.school._id.toString()] || 0) : 0
    }));

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

exports.updateSchoolSubscription = async (req, res, next) => {
  try {
    const { schoolId } = req.params;
    const { planId, status, currentPeriodEnd, trialEndsAt, studentQuotaOverride, autoRenew } = req.body;

    let sub = await SchoolSubscription.findOne({ school: schoolId });
    if (!sub) {
      if (!planId) return res.status(400).json({ success: false, message: 'planId is required to create subscription' });
      sub = new SchoolSubscription({ school: schoolId, plan: planId });
    }

    if (planId) sub.plan = planId;
    if (status) sub.status = status;
    if (currentPeriodEnd) sub.currentPeriodEnd = new Date(currentPeriodEnd);
    if (trialEndsAt) sub.trialEndsAt = new Date(trialEndsAt);
    if (studentQuotaOverride !== undefined) sub.studentQuotaOverride = studentQuotaOverride === '' ? null : Number(studentQuotaOverride);
    if (typeof autoRenew === 'boolean') sub.autoRenew = autoRenew;

    await sub.save();

    await SchoolCampus.findByIdAndUpdate(schoolId, {
      plan: sub.plan,
      planExpiresAt: sub.currentPeriodEnd,
      ...(status === 'suspended' ? { status: 'suspended' } : status === 'active' ? { status: 'active' } : {})
    });

    const populated = await SchoolSubscription.findById(sub._id).populate('school', 'name code').populate('plan');
    res.status(200).json({ success: true, message: 'School subscription updated', data: populated });
  } catch (error) {
    next(error);
  }
};

exports.recordSubscriptionInvoice = async (req, res, next) => {
  try {
    const { schoolId } = req.params;
    const { amount, paymentMethod = 'razorpay', paymentReference = '', status = 'paid', extendDays = 365 } = req.body;

    const sub = await SchoolSubscription.findOne({ school: schoolId });
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found for this school' });

    const invoiceNumber = `INV-ARION-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;
    const now = new Date();
    const newPeriodEnd = new Date(Math.max(now.getTime(), sub.currentPeriodEnd ? sub.currentPeriodEnd.getTime() : now.getTime()) + Number(extendDays) * 86400000);

    sub.invoices.push({
      invoiceNumber,
      amount: Number(amount),
      currency: 'INR',
      billingPeriodStart: now,
      billingPeriodEnd: newPeriodEnd,
      paidAt: status === 'paid' ? now : undefined,
      paymentMethod,
      paymentReference,
      status
    });

    if (status === 'paid') {
      sub.status = 'active';
      sub.lastPaymentAt = now;
      sub.currentPeriodEnd = newPeriodEnd;
      await SchoolCampus.findByIdAndUpdate(schoolId, { status: 'active', planExpiresAt: newPeriodEnd });
    }

    await sub.save();

    res.status(201).json({
      success: true,
      message: `Invoice ${invoiceNumber} recorded successfully`,
      data: sub
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllInvoices = async (req, res, next) => {
  try {
    const subs = await SchoolSubscription.find()
      .populate('school', 'name code subdomain owner.email')
      .populate('plan', 'name code');

    const invoices = [];
    subs.forEach((sub) => {
      (sub.invoices || []).forEach((inv) => {
        invoices.push({
          ...inv.toObject(),
          schoolId: sub.school?._id,
          schoolName: sub.school?.name || 'Deleted School',
          schoolCode: sub.school?.code || '-',
          planName: sub.plan?.name || '-'
        });
      });
    });

    invoices.sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt));

    res.status(200).json({ success: true, count: invoices.length, data: invoices });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 5. SUBDOMAINS & CUSTOM DOMAINS REGISTRY
// ============================================================

exports.getDomainsRegistry = async (req, res, next) => {
  try {
    const schools = await SchoolCampus.find()
      .select('name code subdomain customDomain domainVerified status board createdAt')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: schools.length, data: schools });
  } catch (error) {
    next(error);
  }
};

exports.updateSchoolDomain = async (req, res, next) => {
  try {
    const { subdomain, customDomain, domainVerified } = req.body;
    const school = await SchoolCampus.findById(req.params.schoolId);
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });

    if (subdomain !== undefined) {
      const clean = sanitizeSubdomain(subdomain);
      if (clean && RESERVED_SUBDOMAINS.has(clean)) {
        return res.status(400).json({ success: false, message: 'Subdomain is reserved by platform' });
      }
      school.subdomain = clean || undefined;
    }
    if (customDomain !== undefined) school.customDomain = String(customDomain).trim().toLowerCase();
    if (typeof domainVerified === 'boolean') school.domainVerified = domainVerified;

    await school.save();
    res.status(200).json({ success: true, message: 'Domain mapping updated', data: school });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 6. SCHOOL ONBOARDING LEADS (FULL CRUD + TENANT PROVISIONING)
// ============================================================

exports.getLeads = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { schoolName: { $regex: search, $options: 'i' } },
        { contactName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { requestedSubdomain: { $regex: search, $options: 'i' } }
      ];
    }
    const leads = await PlatformLead.find(filter)
      .populate('convertedSchool', 'name code subdomain')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    next(error);
  }
};

exports.createLead = async (req, res, next) => {
  try {
    const lead = await PlatformLead.create({
      ...req.body,
      requestedSubdomain: sanitizeSubdomain(req.body.requestedSubdomain || ''),
      source: req.body.source || 'manual'
    });
    res.status(201).json({ success: true, message: 'Lead created', data: lead });
  } catch (error) {
    next(error);
  }
};

exports.updateLead = async (req, res, next) => {
  try {
    const lead = await PlatformLead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.status(200).json({ success: true, message: 'Lead updated', data: lead });
  } catch (error) {
    next(error);
  }
};

exports.deleteLead = async (req, res, next) => {
  try {
    const lead = await PlatformLead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.status(200).json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    next(error);
  }
};

exports.convertLeadToSchool = async (req, res, next) => {
  try {
    const lead = await PlatformLead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (lead.convertedSchool) {
      return res.status(400).json({ success: false, message: 'Lead has already been converted to a school' });
    }

    const codePrefix = lead.schoolName.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'SCH';
    const generatedCode = `${codePrefix}-${Math.floor(100 + Math.random() * 900)}`;
    const generatedSubdomain = lead.requestedSubdomain || sanitizeSubdomain(lead.schoolName).slice(0, 20);
    const defaultPlan = await SubscriptionPlan.findOne({ isActive: true, isPopular: true }) ||
      await SubscriptionPlan.findOne({ isActive: true }).sort({ price: 1 });
    const crypto = require('crypto');
    const initialPassword = req.body.adminPassword || `${crypto.randomBytes(10).toString('hex')}aA1!`;

    req.body = {
      name: lead.schoolName,
      code: req.body.code || generatedCode,
      subdomain: req.body.subdomain || generatedSubdomain,
      board: lead.board || 'CBSE',
      ownerName: lead.contactName,
      ownerEmail: lead.email,
      ownerMobile: String(lead.phone).replace(/\D/g, '').slice(-10) || '9999999999',
      adminPassword: initialPassword,
      city: lead.city || 'Jabalpur',
      state: lead.state || 'Madhya Pradesh',
      planId: req.body.planId || defaultPlan?._id,
      subscriptionStatus: 'active'
    };

    // Reuse provisionSchool logic cleanly via custom response hook
    const originalJson = res.json.bind(res);
    res.json = async (payload) => {
      if (payload?.success && payload?.data?.school?._id) {
        lead.status = 'converted';
        lead.convertedSchool = payload.data.school._id;
        await lead.save();
      }
      return originalJson(payload);
    };

    return exports.provisionSchool(req, res, next);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 7. GLOBAL USERS & PLATFORM COMPANY TEAM CRUD
// ============================================================

exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, search, schoolId, franchise, limit = 100 } = req.query;
    const filter = {};
    if (role && role !== 'all') filter.role = role;
    const assignedSchoolId = schoolId || franchise;
    if (assignedSchoolId && assignedSchoolId !== 'all') filter.franchise = assignedSchoolId;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .populate('franchise', 'name code subdomain')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    const data = users.map((user) => {
      const record = user.toObject();
      record.school = record.franchise || null;
      delete record.franchise;
      return record;
    });
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

exports.createPlatformUser = async (req, res, next) => {
  try {
    const { name, email, mobile, password, role = 'super_admin', isActive = true } = req.body;
    const schoolId = req.body.schoolId || req.body.franchise;
    const managedRoles = ['super_admin', 'school_owner', 'school_admin', 'principal', 'vice_principal'];
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }
    if (!managedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Staff, parent, and student accounts must be created from the school ERP so their required profiles are set up.' });
    }
    if (role !== 'super_admin' && !schoolId) {
      return res.status(400).json({ success: false, message: 'Choose the school this account will administer.' });
    }
    if (schoolId && !mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ success: false, message: 'Choose a valid school.' });
    }
    if (schoolId && !(await SchoolCampus.exists({ _id: schoolId }))) {
      return res.status(404).json({ success: false, message: 'The selected school was not found.' });
    }
    const cleanMobile = mobile ? String(mobile).replace(/\D/g, '').slice(-10) : undefined;
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      ...(cleanMobile && cleanMobile.length === 10 ? { mobile: cleanMobile } : {}),
      password,
      role,
      ...(role !== 'super_admin' && schoolId ? { franchise: schoolId } : {}),
      isActive: Boolean(isActive)
    });

    res.status(201).json({
      success: true,
      message: `User "${user.name}" (${user.role}) created`,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePlatformUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { name, email, mobile, role, isActive, password } = req.body;
    const schoolId = req.body.schoolId ?? req.body.franchise;
    const managedRoles = ['super_admin', 'school_owner', 'school_admin', 'principal', 'vice_principal'];
    if (role && role !== user.role && !managedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Staff, parent, and student roles are managed from the school ERP.' });
    }
    const nextRole = role || user.role;
    const nextSchoolId = schoolId || user.franchise?.toString();
    if (nextRole !== 'super_admin' && !nextSchoolId) {
      return res.status(400).json({ success: false, message: 'Choose the school this account will administer.' });
    }
    if (nextRole !== 'super_admin' && nextSchoolId && !mongoose.Types.ObjectId.isValid(nextSchoolId)) {
      return res.status(400).json({ success: false, message: 'Choose a valid school.' });
    }
    if (nextRole !== 'super_admin' && nextSchoolId && !(await SchoolCampus.exists({ _id: nextSchoolId }))) {
      return res.status(404).json({ success: false, message: 'The selected school was not found.' });
    }
    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (mobile !== undefined) {
      const clean = String(mobile).replace(/\D/g, '').slice(-10);
      if (clean.length === 10) user.mobile = clean;
    }
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (nextRole === 'super_admin') user.franchise = undefined;
    else user.franchise = nextSchoolId;
    if (password && password.length >= 6) user.password = password;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

exports.deletePlatformUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own active super admin account.' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, message: 'User deleted permanently' });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 8. PLATFORM BROADCASTS & GLOBAL SYSTEM CONFIG
// ============================================================

exports.getBroadcasts = async (req, res, next) => {
  try {
    const broadcasts = await Notification.find({
      $or: [{ isPlatformGlobal: true }, { type: 'announcement' }]
    })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, count: broadcasts.length, data: broadcasts });
  } catch (error) {
    next(error);
  }
};

exports.broadcastAnnouncement = async (req, res, next) => {
  try {
    const { title, message, priority = 'medium', link = '' } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const notification = await Notification.create({
      title,
      message,
      type: 'announcement',
      recipients: 'all',
      isPlatformGlobal: true,
      priority,
      link,
      status: 'sent',
      sentAt: new Date(),
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Platform announcement broadcasted successfully to all schools',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteBroadcast = async (req, res, next) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Broadcast deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getPlatformConfig = async (req, res, next) => {
  try {
    let config = await PlatformConfig.findOne({ singletonKey: 'GLOBAL_PLATFORM_CONFIG' });
    if (!config) {
      config = await PlatformConfig.create({ singletonKey: 'GLOBAL_PLATFORM_CONFIG' });
    }
    const data = config.toObject();
    if (data.productName === 'Arion School') data.productName = 'SES Educare';
    if (data.companyName === 'ArionexTech') data.companyName = 'STARTOLOGY EDUCARE SERVICES PRIVATE LIMITED';
    if (data.primaryDomain === 'arionschool.com') data.primaryDomain = 'seseducare.com';
    if (data.appDomain === 'app.arionschool.com') data.appDomain = 'myapp.seseducare.com';
    if (data.adminConsoleDomain === 'admin.arionschool.com') data.adminConsoleDomain = 'admin.seseducare.com';
    if (data.supportEmail === 'support@arionschool.com') data.supportEmail = 'seseducare@gmail.com';
    if (String(data.maintenanceMessage || '').includes('Arion School')) {
      data.maintenanceMessage = 'SES Educare School ERP is undergoing scheduled maintenance. Please check back soon.';
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.updatePlatformConfig = async (req, res, next) => {
  try {
    const config = await PlatformConfig.findOneAndUpdate(
      { singletonKey: 'GLOBAL_PLATFORM_CONFIG' },
      { ...req.body, updatedBy: req.user._id },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(200).json({ success: true, message: 'Platform configuration saved', data: config });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 9. AUDIT LOGS & AI CONSUMPTION TELEMETRY
// ============================================================

exports.getAuditLogs = async (req, res, next) => {
  try {
    const logs = await LoginActivity.find()
      .populate('user', 'name email role')
      .populate('franchise', 'name code')
      .sort({ createdAt: -1 })
      .limit(100);
    const data = logs.map((log) => {
      const record = log.toObject();
      record.school = record.franchise || null;
      delete record.franchise;
      return record;
    });
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

exports.getAiTelemetry = async (req, res, next) => {
  try {
    const [recentLogs, summaryBySchool] = await Promise.all([
      AiUsageLog.find()
        .populate('user', 'name email role')
        .populate('franchise', 'name code')
        .sort({ createdAt: -1 })
        .limit(50),
      AiUsageLog.aggregate([
        {
          $group: {
            _id: '$franchise',
            totalRequests: { $sum: 1 },
            totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
            avgLatencyMs: { $avg: { $ifNull: ['$responseTimeMs', 0] } }
          }
        },
        { $sort: { totalRequests: -1 } },
        { $limit: 20 }
      ])
    ]);

    const schoolScopedLogs = recentLogs.map((log) => {
      const record = log.toObject();
      record.school = record.franchise || null;
      delete record.franchise;
      return record;
    });
    res.status(200).json({
      success: true,
      data: { recentLogs: schoolScopedLogs, summaryBySchool }
    });
  } catch (error) {
    next(error);
  }
};
