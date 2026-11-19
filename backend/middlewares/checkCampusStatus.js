/**
 * checkCampusStatus.js
 * Validates school campus operational status and SaaS subscription health.
 */
const SchoolCampus = require('../models/SchoolCampus');
const SchoolSubscription = require('../models/SchoolSubscription');

const checkCampusStatus = async (req, res, next) => {
  try {
    // 1. Super admin & School Owner have multi-campus override
    if (req.user?.role === 'super_admin' || req.user?.role === 'school_owner') {
      return next();
    }

    const tenantId = req.tenantId || req.user?.franchise?._id || req.user?.franchise;
    if (!tenantId) {
      return next();
    }

    // 2. Fetch School Campus Status
    const campus = await SchoolCampus.findById(tenantId).select('status name planExpiresAt');
    if (!campus) {
      return res.status(404).json({
        success: false,
        message: 'Assigned school campus record not found'
      });
    }

    if (campus.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'School campus access is temporarily suspended. Please contact ArionexTech support.',
        code: 'TENANT_SUSPENDED'
      });
    }

    if (campus.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'This school account is currently deactivated. Contact your institution administrator.',
        code: 'TENANT_INACTIVE'
      });
    }

    // 3. Check Subscription Health if subscription record exists
    const subscription = await SchoolSubscription.findOne({ school: tenantId });
    if (subscription) {
      const now = new Date();
      if (subscription.status === 'suspended') {
        return res.status(403).json({
          success: false,
          message: 'School subscription is suspended. Contact ArionexTech billing.',
          code: 'SUBSCRIPTION_SUSPENDED'
        });
      }

      if (subscription.status === 'trial' && subscription.trialEndsAt && now > subscription.trialEndsAt) {
        // Check grace period
        const graceEnd = new Date(subscription.trialEndsAt.getTime() + (subscription.gracePeriodDays || 7) * 24 * 60 * 60 * 1000);
        if (now > graceEnd) {
          return res.status(402).json({
            success: false,
            message: 'School trial period has expired. Please upgrade to a paid subscription plan to resume operations.',
            code: 'TRIAL_EXPIRED'
          });
        }
      }

      if (subscription.status === 'active' && subscription.currentPeriodEnd && now > subscription.currentPeriodEnd) {
        const graceEnd = new Date(subscription.currentPeriodEnd.getTime() + (subscription.gracePeriodDays || 7) * 24 * 60 * 60 * 1000);
        if (now > graceEnd) {
          return res.status(402).json({
            success: false,
            message: 'Annual subscription has expired. Please renew your school license.',
            code: 'SUBSCRIPTION_EXPIRED'
          });
        }
      }
    }

    next();
  } catch (error) {
    console.error('Error checking campus status:', error);
    next(); // Fail open for resilience if database error
  }
};

module.exports = checkCampusStatus;
