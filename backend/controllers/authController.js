const User = require('../models/User');
const Student = require('../models/Student');
const LoginActivity = require('../models/LoginActivity');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../utils/emailService');
const { isSchoolTenantUser } = require('../utils/tenantAccess');

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign({ id: user._id, ver: user.tokenVersion || 0 }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

const recordLoginActivity = (req, user, method) => LoginActivity.create({
  user: user._id,
  eventType: 'sign_in',
  occurredAt: new Date(),
  ipAddress: String(req.ip || '').slice(0, 100),
  userAgent: String(req.get('user-agent') || '').slice(0, 300),
  method,
  role: user.role || '',
  franchise: user.franchise?._id || user.franchise || null,
});

const recordUserAction = (req, user, { action, resource, path, statusCode = 200 }) => LoginActivity.create({
  user: user._id,
  eventType: 'action',
  occurredAt: new Date(),
  ipAddress: String(req.ip || '').slice(0, 100),
  userAgent: String(req.get('user-agent') || '').slice(0, 300),
  method: 'api_action',
  action,
  resource,
  path,
  httpMethod: 'POST',
  statusCode,
  role: user.role || '',
  franchise: user.franchise?._id || user.franchise || null,
}).catch((error) => {
  console.error('Could not record account activity:', error.message);
});

exports.getLoginActivity = async (req, res) => {
  try {
    const activities = await LoginActivity.find({
      user: req.user.id,
      $or: [{ eventType: 'sign_in' }, { eventType: { $exists: false } }],
    })
      .sort({ occurredAt: -1 }).limit(20).select('occurredAt ipAddress userAgent method').lean();
    res.status(200).json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load sign-in activity' });
  }
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, mobile, password, role } = req.body;

    const normalizedEmail = String(email || '').toLowerCase().trim();

    // Check if user already exists
    const userExists = await User.findOne({
      $or: [{ email: normalizedEmail }, { mobile: mobile || null }]
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or mobile'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email: normalizedEmail,
      mobile,
      password,
      role: role || 'student'
    });
    await recordUserAction(req, user, {
      action: 'created', resource: 'user', path: '/api/auth/register', statusCode: 201,
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Forgot password (send reset link)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email, identifier } = req.body;
    const searchVal = String(email || identifier || '').toLowerCase().trim();

    if (!searchVal) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered email or mobile number'
      });
    }

    const user = await User.findOne({
      $or: [
        { email: searchVal },
        { mobile: searchVal }
      ]
    });

    // Always return success to avoid user enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists for this email, a reset link has been sent.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetEmail(user, resetToken);
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please try again later.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'If an account exists for this email, a reset link has been sent.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (!password || String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a password with at least 6 characters'
      });
    }

    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token is invalid or has expired'
      });
    }

    user.password = password;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    await recordUserAction(req, user, {
      action: 'updated', resource: 'password', path: '/api/auth/reset-password/:token',
    });

    const jwtToken = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      token: jwtToken
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const rawIdentifier = req.body.identifier || req.body.email;
    const identifierValue = rawIdentifier ? String(rawIdentifier).trim() : '';
    const identifier = identifierValue.includes('@') ? identifierValue.toLowerCase() : identifierValue;
    const { password } = req.body; // identifier can be email or mobile

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/mobile and password'
      });
    }

    // Check for user (email or mobile)
    const user = await User.findOne({
      $or: [{ email: identifier }, { mobile: identifier }]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }

    await recordLoginActivity(req, user, 'password');

    const token = generateToken(user);

    let profilePicture = user.profilePicture;
    let studentDetails = null;
    let franchiseDetails = user.franchise;

    if (user.role === 'student') {
      const student = await Student.findOne({ user: user._id }).populate('franchise');
      if (student) {
        studentDetails = student;
        if (!profilePicture && student.personalInfo?.photo) {
          profilePicture = student.personalInfo.photo;
        }
      }
    } else if (isSchoolTenantUser(user) && user.franchise) {
      const populatedUser = await User.findById(user._id).populate({
        path: 'franchise',
        populate: { path: 'plan' }
      });
      franchiseDetails = populatedUser.franchise;
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        franchise: franchiseDetails,
        profilePicture,
        createdAt: user.createdAt,
        studentDetails
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    let profilePicture = user.profilePicture;
    let studentDetails = null;
    let franchiseDetails = user.franchise;

    if (user.role === 'student') {
      const student = await Student.findOne({ user: user._id }).populate('franchise');
      if (student) {
        studentDetails = student;
        if (!profilePicture && student.personalInfo?.photo) {
          profilePicture = student.personalInfo.photo;
        }
      }
    } else if (isSchoolTenantUser(user) && user.franchise) {
      const populatedUser = await User.findById(req.user.id).populate({
        path: 'franchise',
        populate: { path: 'plan' }
      });
      franchiseDetails = populatedUser.franchise;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        franchise: franchiseDetails,
        profilePicture,
        createdAt: user.createdAt,
        studentDetails // will be null if not a student
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.logout = async (req, res) => {
  try {
    req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
    await req.user.save({ validateBeforeSave: false });
    return res.status(200).json({ success: true, message: 'Signed out successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to end this session' });
  }
};


// Helper to verify Google token (supports both ID Token and OAuth Access Token)
const verifyGoogleToken = async (rawToken) => {
  if (!rawToken) {
    throw new Error('Google token is missing');
  }

  // 1. Try validating as Google ID Token first
  try {
    const idTokenUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(rawToken)}`;
    const idResponse = await fetch(idTokenUrl);
    if (idResponse.ok) {
      const payload = await idResponse.json();
      const validAudiences = [
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
        '207858797235-1i5rnv0kehqaf34a3cj04el6r4i5rvng.apps.googleusercontent.com',
        '207858797235-2fmsp14eku50mbnuo80529sugtaks6sg.apps.googleusercontent.com'
      ].filter(Boolean);

      const tokenAud = String(payload.aud || '');
      const isAudienceValid = validAudiences.some((aud) => tokenAud === aud) ||
        (payload.aud && payload.aud.startsWith('207858797235'));

      if (isAudienceValid && payload.email) {
        return payload;
      }
    }
  } catch (idErr) {}

  // 2. Fallback: Validate as Google OAuth Access Token via userinfo endpoint
  try {
    const userInfoUrl = 'https://www.googleapis.com/oauth2/v3/userinfo';
    const userResponse = await fetch(userInfoUrl, {
      headers: { Authorization: `Bearer ${rawToken}` }
    });
    if (userResponse.ok) {
      const userInfo = await userResponse.json();
      if (userInfo && userInfo.email) {
        return {
          sub: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          email_verified: userInfo.email_verified,
        };
      }
    }
  } catch (userErr) {}

  throw new Error('Invalid or expired Google authentication credential');
};

exports.googleLogin = async (req, res) => {
  try {
    const { credential, idToken, token } = req.body;
    const rawToken = credential || idToken || token;

    if (!rawToken) {
      return res.status(400).json({
        success: false,
        message: 'Google authentication credential is required'
      });
    }

    const payload = await verifyGoogleToken(rawToken);
    const normalizedEmail = String(payload.email).toLowerCase().trim();

    // Look for existing user
    let user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (user) {
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Your account has been deactivated'
        });
      }

      let modified = false;
      if (!user.profilePicture && payload.picture) {
        user.profilePicture = payload.picture;
        modified = true;
      }
      if (!user.googleId && payload.sub) {
        user.googleId = payload.sub;
        modified = true;
      }
      if (modified) {
        await user.save();
      }
    } else {
      // Auto-register new student user
      const randomPassword = crypto.randomBytes(24).toString('hex');
      user = await User.create({
        name: payload.name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password: randomPassword,
        role: 'student',
        profilePicture: payload.picture || '',
        googleId: payload.sub
      });
    }

    const jwtToken = generateToken(user);
    await recordLoginActivity(req, user, 'google');

    let profilePicture = user.profilePicture;
    let studentDetails = null;
    let franchiseDetails = user.franchise;

    if (user.role === 'student') {
      const student = await Student.findOne({ user: user._id }).populate('franchise');
      if (student) {
        studentDetails = student;
        if (!profilePicture && student.personalInfo?.photo) {
          profilePicture = student.personalInfo.photo;
        }
      }
    } else if (isSchoolTenantUser(user) && user.franchise) {
      const populatedUser = await User.findById(user._id).populate({
        path: 'franchise',
        populate: { path: 'plan' }
      });
      franchiseDetails = populatedUser.franchise;
    }

    res.status(200).json({
      success: true,
      message: 'Google login successful',
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        franchise: franchiseDetails,
        profilePicture,
        createdAt: user.createdAt,
        studentDetails
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Google authentication failed'
    });
  }
};


// @desc    Render Google Mobile Auth Page for mobile WebView
// @route   GET /api/auth/google/mobile
// @access  Public
exports.googleMobileAuthPage = (req, res) => {
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    '207858797235-1i5rnv0kehqaf34a3cj04el6r4i5rvng.apps.googleusercontent.com';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Google Sign-In - Arion School</title>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 20px;
    }
    .auth-box {
      background: #1e293b;
      border: 1px solid #334155;
      padding: 32px 24px;
      border-radius: 20px;
      text-align: center;
      width: 100%;
      max-width: 360px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
    }
    .auth-title {
      color: #f8fafc;
      font-size: 19px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .auth-sub {
      color: #94a3b8;
      font-size: 13px;
      margin-bottom: 24px;
      line-height: 1.4;
    }
    .btn-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 48px;
    }
    .loading-notice {
      display: none;
      margin-top: 18px;
      color: #38bdf8;
      font-size: 13px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="auth-box">
    <h2 class="auth-title">Arion School Student</h2>
    <p class="auth-sub">Sign in with your Google account to access courses, live classes and digital records</p>
    
    <div id="g_id_onload"
         data-client_id="${clientId}"
         data-context="signin"
         data-ux_mode="popup"
         data-callback="handleCredentialResponse"
         data-auto_select="false"
         data-cancel_on_tap_outside="true">
    </div>

    <div class="btn-wrap">
      <div class="g_id_signin"
           data-type="standard"
           data-shape="rectangular"
           data-theme="outline"
           data-text="signin_with"
           data-size="large"
           data-logo_alignment="left"
           data-width="280">
      </div>
    </div>

    <div id="loadingNotice" class="loading-notice">
      Authenticating with Arion School...
    </div>
  </div>

  <script>
    function handleCredentialResponse(response) {
      if (response && response.credential) {
        document.getElementById('loadingNotice').style.display = 'block';
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'GOOGLE_CREDENTIAL_RECEIVED',
            credential: response.credential
          }));
        }
      }
    }
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
};

