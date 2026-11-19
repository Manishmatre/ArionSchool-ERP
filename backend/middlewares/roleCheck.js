// Role-based access control middleware with school_admin/franchise_admin equivalence
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized - No user found'
      });
    }

    const userRole = req.user.role;
    if (userRole === 'super_admin') {
      return next();
    }

    const isPlatformAdminApi = String(req.baseUrl || '').startsWith('/api/platform-admin');
    if (isPlatformAdminApi) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only Company Platform Super Admins can access this endpoint'
      });
    }

    if (userRole === 'school_owner' && (roles.includes('super_admin') || roles.includes('school_owner') || roles.includes('school_admin') || roles.includes('franchise_admin'))) {
      return next();
    }

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

module.exports = authorize;
