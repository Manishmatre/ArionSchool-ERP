/**
 * Centralized Multi-Tenant Resolution & Isolation Middleware
 * Enforces strict tenant boundaries and eliminates IDOR vulnerabilities across all school operations.
 */
const mongoose = require('mongoose');
const SchoolCampus = require('../models/SchoolCampus');

/**
 * Resolves tenant identifier and blocks cross-tenant tampering.
 */
const resolveTenant = (options = {}) => {
  return async (req, res, next) => {
    try {
      // 1. Unauthenticated or public routes: allow through unless tenant is strictly required
      if (!req.user) {
        if (options.required) {
          return res.status(401).json({ success: false, message: 'Authentication required for tenant operations' });
        }
        return next();
      }

      const userRole = req.user.role;
      let targetTenantId = null;

      // 2. Super Administrator / School Owner: Has multi-campus scope, can optionally target a specific tenant
      if (userRole === 'super_admin' || userRole === 'school_owner') {
        const headerTenant = req.headers['x-tenant-id'] || req.headers['x-campus-id'];
        const paramTenant = req.query?.franchise || req.query?.campusId || req.body?.franchise || req.body?.campusId;
        const resolvedId = headerTenant || paramTenant || req.user.franchise || null;

        if (resolvedId && mongoose.Types.ObjectId.isValid(resolvedId)) {
          req.tenantId = new mongoose.Types.ObjectId(resolvedId);
        } else if (resolvedId && typeof resolvedId === 'object' && resolvedId._id) {
          req.tenantId = new mongoose.Types.ObjectId(resolvedId._id);
        } else {
          req.tenantId = null;
        }

        req.isSuperAdmin = true;
        return next();
      }

      // 3. School Tenant Roles: Strictly bound to their authenticated school school
      const userTenantId = req.user.franchise?._id || req.user.franchise;
      if (!userTenantId) {
        if (options.required) {
          return res.status(403).json({
            success: false,
            message: 'Access Denied: User account is not assigned to any active school tenant'
          });
        }
        req.tenantId = null;
        return next();
      }

      const userTenantObjId = new mongoose.Types.ObjectId(userTenantId);

      // 4. Prevent IDOR: Detect if client sent an explicit parameter or header targeting another school
      const requestedTenantId = req.headers['x-tenant-id'] ||
        req.headers['x-campus-id'] ||
        req.query?.franchise ||
        req.query?.campusId ||
        req.body?.franchise ||
        req.body?.campusId;

      if (requestedTenantId && requestedTenantId !== 'all') {
        const parsedReqId = String(requestedTenantId?._id || requestedTenantId).trim();
        if (parsedReqId && parsedReqId !== userTenantObjId.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Security Alert: Cross-tenant access denied. You are not authorized to view or mutate records of another school.'
          });
        }
      }

      // 5. Sanitize request queries and bodies to prevent blind parameter pollution
      if (req.query?.franchise && req.query.franchise !== userTenantObjId.toString()) {
        req.query.franchise = userTenantObjId.toString();
      }
      if (req.body?.franchise && req.body.franchise !== userTenantObjId.toString()) {
        req.body.franchise = userTenantObjId.toString();
      }

      req.tenantId = userTenantObjId;
      req.isSuperAdmin = false;

      next();
    } catch (error) {
      console.error('Tenant resolution error:', error);
      res.status(500).json({ success: false, message: 'Internal tenant resolution error' });
    }
  };
};

/**
 * Middleware ensuring an active tenant is present on the request
 */
const requireTenant = (req, res, next) => {
  if (!req.tenantId && req.user?.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Active school tenant context is required for this operation'
    });
  }
  next();
};

module.exports = {
  resolveTenant,
  requireTenant
};
