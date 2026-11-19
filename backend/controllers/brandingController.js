const SchoolBranding = require('../models/SchoolBranding');
const SchoolCampus = require('../models/SchoolCampus');
const path = require('path');
const fs = require('fs');

const DEFAULT_BRANDING = {
  identity: {
    schoolName: 'SES Educare',
    shortName: 'SES',
    motto: 'One Platform. Complete School Management.',
    description: 'Modern school management and education ERP platform by SES Educare.',
    affiliationBoard: 'CBSE',
    registrationNumber: 'ARION-SCH-2026',
    address: {
      street: 'Napier Town',
      city: 'Jabalpur',
      state: 'Madhya Pradesh',
      pincode: '482001',
      country: 'India'
    },
    contact: {
      phone: '+91 98765 43210',
      email: 'seseducare@gmail.com',
      websiteUrl: 'https://seseducare.com'
    }
  },
  visual: {
    logoUrl: '/seseducare-logo.png',
    secondaryLogoUrl: '/seseducare-logo.png',
    loginLogoUrl: '/seseducare-logo.png',
    faviconUrl: '/favicon.ico',
    primaryColor: '#0f172a',    // Deep Navy Blue
    secondaryColor: '#2563eb',  // Royal Blue
    accentColor: '#0ea5e9',     // Cyan / Sky Blue
    backgroundColor: '#f8fafc', // Clean White / Light Grey
    headerColor: '#0f172a',
    sidebarColor: '#0f172a',
    themeMode: 'brand-chrome'
  },
  login: {
    welcomeTitle: 'Welcome to SES Educare',
    welcomeSubtitle: 'Unified School Management ERP Platform',
    bannerImageUrl: '',
    bgImageUrl: '',
    showPlatformAttribution: true
  },
  whiteLabel: {
    enabled: false,
    customDomain: '',
    subdomain: '',
    status: 'active'
  },
  email: {
    senderName: 'SES Educare',
    footerText: 'Powered by SES Educare School Management ERP.'
  },
  document: {
    reportHeader: 'SES EDUCARE SCHOOL MANAGEMENT SYSTEM',
    authorizedSignatoryTitle: 'Authorized Principal / Head of Institution'
  }
};

// Helper to resolve school ID
const resolveTenantId = async (req) => {
  if (req.user?.franchise) {
    return req.user.franchise._id || req.user.franchise;
  }
  if (req.query?.franchise) {
    return req.query.franchise;
  }
  if (req.body?.franchise) {
    return req.body.franchise;
  }
  if (['super_admin', 'school_owner'].includes(req.user?.role)) {
    const campus = await SchoolCampus.findOne({ status: 'active' }) || await SchoolCampus.findOne();
    return campus?._id || null;
  }
  return null;
};

// ==========================================
// 1. PUBLIC BRANDING RESOLVER
// ==========================================
exports.getPublicBranding = async (req, res, next) => {
  try {
    const { tenant, subdomain, domain } = req.query;
    let branding = null;

    if (tenant) {
      // Find by campus ID or code
      const campus = await SchoolCampus.findOne({
        $or: [
          { _id: tenant.match(/^[0-9a-fA-F]{24}$/) ? tenant : null },
          { code: tenant.toUpperCase() }
        ]
      });
      if (campus) {
        branding = await SchoolBranding.findOne({ franchise: campus._id }).populate('franchise', 'name code');
      }
    } else if (subdomain) {
      branding = await SchoolBranding.findOne({ 'whiteLabel.subdomain': subdomain.toLowerCase() }).populate('franchise', 'name code');
    } else if (domain) {
      branding = await SchoolBranding.findOne({ 'whiteLabel.customDomain': domain.toLowerCase() }).populate('franchise', 'name code');
    }

    if (!branding) {
      // Return default SES Educare branding
      return res.status(200).json({
        success: true,
        source: 'default',
        data: DEFAULT_BRANDING
      });
    }

    res.status(200).json({
      success: true,
      source: 'tenant',
      data: branding
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. AUTHENTICATED TENANT BRANDING
// ==========================================
exports.getCurrentBranding = async (req, res, next) => {
  try {
    const tenantId = await resolveTenantId(req);
    let branding = null;

    if (tenantId) {
      branding = await SchoolBranding.findOne({ franchise: tenantId }).populate('franchise', 'name code');
    }

    if (!branding) {
      // If none found for tenant, synthesize from Campus details if available
      let synthesized = JSON.parse(JSON.stringify(DEFAULT_BRANDING));
      if (tenantId) {
        const campus = await SchoolCampus.findById(tenantId);
        if (campus) {
          synthesized.identity.schoolName = campus.name;
          synthesized.identity.shortName = campus.code || campus.name.slice(0, 10);
          if (campus.address) {
            synthesized.identity.address = {
              street: campus.address.street || '',
              city: campus.address.city || 'Jabalpur',
              state: campus.address.state || 'Madhya Pradesh',
              pincode: campus.address.pincode || '482001',
              country: campus.address.country || 'India'
            };
          }
          if (campus.owner) {
            synthesized.identity.contact.phone = campus.owner.mobile || synthesized.identity.contact.phone;
            synthesized.identity.contact.email = campus.owner.email || synthesized.identity.contact.email;
          }
          synthesized.franchise = campus._id;
        }
      }
      return res.status(200).json({
        success: true,
        source: 'synthesized',
        data: synthesized
      });
    }

    res.status(200).json({
      success: true,
      source: 'tenant',
      data: branding
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. UPDATE TENANT BRANDING
// ==========================================
exports.updateBranding = async (req, res, next) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'School campus tenant reference required' });
    }

    const {
      identity,
      visual,
      login,
      whiteLabel,
      email,
      document
    } = req.body;

    // Validate Hex Colors and themeMode if provided
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const validThemeModes = ['brand-chrome', 'sidebar-accent', 'header-accent', 'full-light', 'full-dark', 'tinted-studio'];
    if (visual) {
      ['primaryColor', 'secondaryColor', 'accentColor', 'backgroundColor', 'headerColor', 'sidebarColor'].forEach(key => {
        if (visual[key] && !hexRegex.test(visual[key])) {
          visual[key] = DEFAULT_BRANDING.visual[key] || '#0f172a';
        }
      });
      if (visual.themeMode && !validThemeModes.includes(visual.themeMode)) {
        visual.themeMode = 'brand-chrome';
      }
    }

    let branding = await SchoolBranding.findOne({ franchise: tenantId });
    if (!branding) {
      branding = new SchoolBranding({
        franchise: tenantId,
        identity: identity || DEFAULT_BRANDING.identity,
        visual: visual || DEFAULT_BRANDING.visual,
        login: login || DEFAULT_BRANDING.login,
        whiteLabel: whiteLabel || DEFAULT_BRANDING.whiteLabel,
        email: email || DEFAULT_BRANDING.email,
        document: document || DEFAULT_BRANDING.document
      });
    } else {
      if (identity) branding.identity = { ...branding.identity.toObject(), ...identity };
      if (visual) branding.visual = { ...branding.visual.toObject(), ...visual };
      if (login) branding.login = { ...branding.login.toObject(), ...login };
      if (whiteLabel) branding.whiteLabel = { ...branding.whiteLabel.toObject(), ...whiteLabel };
      if (email) branding.email = { ...branding.email.toObject(), ...email };
      if (document) branding.document = { ...branding.document.toObject(), ...document };
    }

    await branding.save();

    res.status(200).json({
      success: true,
      message: 'School branding saved successfully',
      data: branding
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. RESET TO DEFAULT ARION SCHOOL BRANDING
// ==========================================
exports.resetBranding = async (req, res, next) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'School campus tenant reference required' });
    }

    await SchoolBranding.findOneAndDelete({ franchise: tenantId });

    res.status(200).json({
      success: true,
      message: 'Branding reset to SES Educare defaults',
      data: DEFAULT_BRANDING
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. UPLOAD BRANDING ASSET (LOGO / FAVICON)
// ==========================================
exports.uploadBrandingAsset = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload' });
    }

    // Supported formats
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/x-icon'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file format. Please upload PNG, JPG, WebP, SVG, or ICO.'
      });
    }

    // Max 2MB
    if (req.file.size > 2 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds maximum 2MB limit'
      });
    }

    // Relative web URL
    const fileUrl = `/uploads/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: 'Branding asset uploaded successfully',
      url: fileUrl
    });
  } catch (error) {
    next(error);
  }
};
