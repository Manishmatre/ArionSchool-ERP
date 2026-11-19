const SubscriptionPlan = require('../models/SubscriptionPlan');
const SchoolSubscription = require('../models/SchoolSubscription');
const SchoolCampus = require('../models/SchoolCampus');
const Student = require('../models/Student');

// Default SaaS Tiers for Indian K-12 Schools
const DEFAULT_PLANS = [
  {
    name: 'Starter School',
    code: 'PLAN_STARTER',
    description: 'Perfect for small primary schools and single-branch preschools up to 500 students.',
    billingCycle: 'annual',
    price: 36000,
    maxStudents: 500,
    maxCampuses: 1,
    maxStaff: 30,
    storageLimitGb: 10,
    trialDays: 14,
    features: [
      'student_admissions',
      'academic_calendar',
      'classes_and_sections',
      'student_attendance',
      'razorpay_fees',
      'transfer_certificates',
      'notice_board'
    ],
    isPopular: false,
    isActive: true
  },
  {
    name: 'Growth Academy',
    code: 'PLAN_GROWTH',
    description: 'Ideal for K-12 CBSE/ICSE schools up to 1,500 students with AI Pedagogy and RFID.',
    billingCycle: 'annual',
    price: 72000,
    maxStudents: 1500,
    maxCampuses: 2,
    maxStaff: 80,
    storageLimitGb: 50,
    trialDays: 14,
    features: [
      'student_admissions',
      'academic_calendar',
      'classes_and_sections',
      'student_attendance',
      'razorpay_fees',
      'transfer_certificates',
      'notice_board',
      'cce_report_cards',
      'anti_cheat_seating',
      'ai_pedagogy',
      'rfid_attendance',
      'transport_gps',
      'digital_library',
      'staff_payroll'
    ],
    isPopular: true,
    isActive: true
  },
  {
    name: 'Enterprise Institution',
    code: 'PLAN_ENTERPRISE',
    description: 'For large educational institutions & multi-campus trusts with unlimited students and full suite.',
    billingCycle: 'annual',
    price: 140000,
    maxStudents: 0, // unlimited
    maxCampuses: 10,
    maxStaff: 300,
    storageLimitGb: 250,
    trialDays: 30,
    features: [
      'student_admissions',
      'academic_calendar',
      'classes_and_sections',
      'student_attendance',
      'razorpay_fees',
      'transfer_certificates',
      'notice_board',
      'cce_report_cards',
      'anti_cheat_seating',
      'ai_pedagogy',
      'rfid_attendance',
      'transport_gps',
      'digital_library',
      'staff_payroll',
      'hostel_management',
      'visitor_gate_pass',
      'multi_branch_hq',
      'white_label_custom_domain',
      'priority_dedicated_support'
    ],
    isPopular: false,
    isActive: true
  }
];

// Helper: seed plans if database is empty
exports.ensureDefaultPlans = async () => {
  const count = await SubscriptionPlan.countDocuments();
  if (count === 0) {
    await SubscriptionPlan.insertMany(DEFAULT_PLANS);
    console.log('Default SaaS Subscription Plans seeded successfully');
  }
};

// @desc    Get all subscription plans
// @route   GET /api/subscriptions/plans
exports.getPlans = async (req, res, next) => {
  try {
    await exports.ensureDefaultPlans();
    const query = ['super_admin', 'school_owner'].includes(req.user?.role) ? {} : { isActive: true };
    const plans = await SubscriptionPlan.find(query).sort({ price: 1 });
    res.status(200).json({ success: true, count: plans.length, data: plans });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new subscription plan (Super Admin)
// @route   POST /api/subscriptions/plans
exports.createPlan = async (req, res, next) => {
  try {
    const plan = await SubscriptionPlan.create(req.body);
    res.status(201).json({ success: true, message: 'Subscription plan created', data: plan });
  } catch (error) {
    next(error);
  }
};

// @desc    Update subscription plan (Super Admin)
// @route   PUT /api/subscriptions/plans/:id
exports.updatePlan = async (req, res, next) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    res.status(200).json({ success: true, message: 'Subscription plan updated', data: plan });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete subscription plan (Super Admin)
// @route   DELETE /api/subscriptions/plans/:id
exports.deletePlan = async (req, res, next) => {
  try {
    const assignedCount = await SchoolSubscription.countDocuments({ plan: req.params.id });
    if (assignedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan: currently assigned to ${assignedCount} school(s)`
      });
    }
    const plan = await SubscriptionPlan.findByIdAndDelete(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    res.status(200).json({ success: true, message: 'Plan removed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get subscription status of current school
// @route   GET /api/subscriptions/my-subscription
exports.getMySchoolSubscription = async (req, res, next) => {
  try {
    const schoolId = req.tenantId || req.user?.franchise?._id || req.user?.franchise;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School tenant context not found' });
    }

    let subscription = await SchoolSubscription.findOne({ school: schoolId }).populate('plan');
    if (!subscription) {
      // Auto-assign default Starter plan on trial if not yet created
      await exports.ensureDefaultPlans();
      const defaultPlan = await SubscriptionPlan.findOne({ code: 'PLAN_STARTER' }) || await SubscriptionPlan.findOne();
      if (defaultPlan) {
        subscription = await SchoolSubscription.create({
          school: schoolId,
          plan: defaultPlan._id,
          status: 'trial',
          trialStartsAt: new Date(),
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        });
        subscription = await subscription.populate('plan');
      }
    }

    // Compute live quota usage
    const activeStudentCount = await Student.countDocuments({
      franchise: schoolId,
      status: 'active'
    });

    const maxStudents = subscription?.studentQuotaOverride ?? (subscription?.plan?.maxStudents || 500);
    const quotaUsedPercent = maxStudents > 0 ? Math.round((activeStudentCount / maxStudents) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        subscription,
        usage: {
          activeStudents: activeStudentCount,
          maxStudents,
          quotaUsedPercent,
          isQuotaExceeded: maxStudents > 0 && activeStudentCount >= maxStudents
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign plan to school / Update school subscription (Super Admin)
// @route   POST /api/subscriptions/assign
exports.assignPlanToSchool = async (req, res, next) => {
  try {
    const { schoolId, planId, status, durationMonths, paidAmount, paymentMethod, paymentReference } = req.body;
    if (!schoolId || !planId) {
      return res.status(400).json({ success: false, message: 'School ID and Plan ID are required' });
    }

    const school = await SchoolCampus.findById(schoolId);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const now = new Date();
    const months = Number(durationMonths) || 12;
    const periodEnd = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);

    let subscription = await SchoolSubscription.findOne({ school: schoolId });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const newInvoice = {
      invoiceNumber,
      amount: paidAmount !== undefined ? Number(paidAmount) : plan.price,
      currency: plan.currency || 'INR',
      billingPeriodStart: now,
      billingPeriodEnd: periodEnd,
      paidAt: now,
      paymentMethod: paymentMethod || 'manual',
      paymentReference: paymentReference || `REF-${Date.now()}`,
      status: 'paid'
    };

    if (subscription) {
      subscription.plan = plan._id;
      subscription.status = status || 'active';
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = periodEnd;
      subscription.lastPaymentAt = now;
      subscription.invoices.push(newInvoice);
      await subscription.save();
    } else {
      subscription = await SchoolSubscription.create({
        school: schoolId,
        plan: plan._id,
        status: status || 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        lastPaymentAt: now,
        invoices: [newInvoice]
      });
    }

    // Sync back to SchoolCampus
    school.plan = plan._id;
    school.planExpiresAt = periodEnd;
    school.status = 'active';
    await school.save();

    res.status(200).json({
      success: true,
      message: `Plan '${plan.name}' assigned to '${school.name}' successfully`,
      data: subscription
    });
  } catch (error) {
    next(error);
  }
};
