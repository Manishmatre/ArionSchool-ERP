const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LoginActivity = require('../models/LoginActivity');

const trackPlatformAction = (req, res, user) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return;

  const routePath = `${req.baseUrl || ''}${req.route?.path || req.path || ''}`
    .replace(/\/{2,}/g, '/')
    .split('?')[0]
    .slice(0, 300);
  if (/(?:^|\/)(?:preview|render-preview|generate-sample|calculate|estimate|validate)(?:\/|$)/i.test(routePath)) return;

  const action = req.method === 'POST' ? 'created' : req.method === 'DELETE' ? 'deleted' : 'updated';
  const segments = routePath.split('/').filter((segment) => segment && segment !== 'api' && !segment.startsWith(':'));
  const resource = (segments[0] || 'platform').replace(/-/g, ' ');

  if (typeof res.once !== 'function') return;
  res.once('finish', () => {
    LoginActivity.create({
      user: user._id,
      eventType: 'action',
      occurredAt: new Date(),
      ipAddress: String(req.ip || '').slice(0, 100),
      userAgent: String(req.get('user-agent') || '').slice(0, 300),
      method: 'api_action',
      action,
      resource,
      path: routePath,
      httpMethod: req.method,
      statusCode: res.statusCode,
      role: user.role || '',
      franchise: user.franchise?._id || user.franchise || null,
    }).catch((error) => {
      console.error('Could not record platform activity:', error.message);
    });
  });
};

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    
    if (!req.user || !req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    if ((decoded.ver || 0) !== (req.user.tokenVersion || 0)) {
      return res.status(401).json({
        success: false,
        message: 'Session has expired. Please sign in again.'
      });
    }

    trackPlatformAction(req, res, req.user);
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Authorize specific roles with school_admin/franchise_admin equivalence
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized - No user found'
      });
    }

    const userRole = req.user.role;
    // Platform Super admin has global bypass for all administrative routes
    if (userRole === 'super_admin') {
      return next();
    }

    // Strict guard: /api/platform-admin is reserved exclusively for ArionexTech Company super_admin
    const isPlatformAdminApi = String(req.baseUrl || '').startsWith('/api/platform-admin');
    if (isPlatformAdminApi) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only Company Platform Super Admins can access this endpoint'
      });
    }

    // School Owner (multi-campus super admin for school group) has full access to school ERP admin routes
    if (userRole === 'school_owner' && (roles.includes('super_admin') || roles.includes('school_owner') || roles.includes('school_admin') || roles.includes('franchise_admin'))) {
      return next();
    }

    // Treat school_admin, principal, vice_principal, and legacy franchise_admin as equivalent
    const effectiveRoles = [...roles];
    if (roles.includes('franchise_admin') || roles.includes('school_admin')) {
      for (const r of ['school_admin', 'franchise_admin', 'principal', 'vice_principal', 'school_owner']) {
        if (!effectiveRoles.includes(r)) effectiveRoles.push(r);
      }
    }

    if (!effectiveRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `User role '${userRole}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Check fine-grained action permission or administrative role
exports.hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    const adminRoles = ['super_admin', 'school_owner', 'school_admin', 'franchise_admin', 'principal'];
    if (adminRoles.includes(req.user.role)) {
      return next();
    }
    if (Array.isArray(req.user.permissions) && req.user.permissions.includes(permission)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: `Permission denied: Required capability '${permission}' is not granted to this account`
    });
  };
};
