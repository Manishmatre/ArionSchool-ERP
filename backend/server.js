const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const connectDB = require('./config/db');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middlewares/errorHandler');
const { applyProductionDefaults, isProduction, isSocketEnabled } = require('./utils/productionSafety');
const validateEnv = require('./utils/validateEnv');
const { getMaxUploadLimitString } = require('./utils/uploadLimits');
const { version: BACKEND_VERSION } = require('./package.json');
require('./utils/fontLoader');

// Load env vars first, then apply safe production defaults
dotenv.config({ path: path.resolve(__dirname, './.env') });
applyProductionDefaults();
validateEnv();

const app = express();

// Security and performance middleware
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());
app.use(compression());

if (isProduction()) {
  app.use(morgan('tiny'));
} else {
  app.use(morgan('dev'));
}

const isLoopbackAddress = (address) => {
  const value = String(address || '').trim().toLowerCase();
  return value === '127.0.0.1' || value === '::1' || value === '[::1]' || value === '::ffff:127.0.0.1';
};

const isLoopbackHost = (host) => {
  const value = String(host || '').trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
  const bracketedHost = value.match(/^\[([^\]]+)\](?::\d+)?$/);
  const hostname = bracketedHost ? bracketedHost[1] : value === '::1' ? value : value.replace(/:\d+$/, '');
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
};

// Keep production limits unchanged. In non-production, skip counters only for
// requests that are genuinely addressed to or coming from this machine.
const skipLocalDevelopmentRateLimit = (req) => {
  if (isProduction()) return false;
  return isLoopbackHost(req.hostname) || isLoopbackHost(req.get('host')) ||
    isLoopbackAddress(req.ip) || isLoopbackAddress(req.socket?.remoteAddress);
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction() ? 200 : 500,
  skip: skipLocalDevelopmentRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  skip: skipLocalDevelopmentRateLimit,
  message: { success: false, message: 'Too many requests, slow down.' }
});

const bodyLimit = getMaxUploadLimitString();
app.use(express.json({
  limit: bodyLimit,
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
app.use('/api/', apiLimiter);
app.use('/api/auth/login', strictLimiter);
app.use('/api/auth/register', strictLimiter);

const corsOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
  'https://arionschool.com',
  'https://www.arionschool.com',
  'https://app.arionschool.com',
  'https://admin.arionschool.com',
  'http://myapp.seseducare.com',
  'https://myapp.seseducare.com',
  'http://seseducare.com',
  'https://seseducare.com',
  'http://www.seseducare.com',
  'https://www.seseducare.com'
];

if (process.env.FRONTEND_URL) {
  corsOrigins.push(process.env.FRONTEND_URL);
}
if (process.env.PLATFORM_ADMIN_URL) {
  corsOrigins.push(process.env.PLATFORM_ADMIN_URL);
}
if (process.env.LANDING_URL) {
  corsOrigins.push(process.env.LANDING_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, React Native, curl, Postman)
    if (!origin) return callback(null, true);
    if (
      corsOrigins.includes(origin) ||
      process.env.NODE_ENV !== 'production' ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.startsWith('http://10.') ||
      origin.startsWith('http://192.168.') ||
      origin.startsWith('exp://')
    ) {
      return callback(null, true);
    }
    callback(null, true);
  },
  optionsSuccessStatus: 200,
  credentials: true
}));

// Helper functions to locate latest mobile package files dynamically
const getActiveAppVersion = () => {
  try {
    const appJsonPath = path.join(__dirname, '..', 'mobile', 'app.json');
    if (fs.existsSync(appJsonPath)) {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      if (appJson?.expo?.version) {
        return appJson.expo.version;
      }
    }
  } catch (e) {}
  return '1.0.2';
};

const comparePackageFileNames = (a, b) => {
  const vA = a.match(/\d+(\.\d+)*/);
  const vB = b.match(/\d+(\.\d+)*/);
  if (!vA || !vB) return b.localeCompare(a);
  const partsA = vA[0].split('.').map(Number);
  const partsB = vB[0].split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) return numB - numA;
  }
  return b.localeCompare(a);
};

const findLatestPackageFile = (extension) => {
  const dirs = [
    path.join(__dirname, 'public'),
    path.join(__dirname, '..'),
    path.join(__dirname, '..', 'frontend', 'public')
  ];
  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
        .filter((f) => f.startsWith('SES-Educare') && f.endsWith(extension))
        .sort(comparePackageFileNames);
      if (files.length > 0) {
        return path.join(dir, files[0]);
      }
    }
  }
  return null;
};

// Smart APK/IPA Handler: If an old or renamed package is requested (e.g. SES-Educare-LMS-v1.0.0.apk or /SES-Educare-v1.0.0.apk),
// fallback seamlessly to the latest available active release so downloads never fail with 404!
app.use((req, res, next) => {
  if (req.path.endsWith('.apk')) {
    const filename = path.basename(req.path);
    const exactPath = path.join(__dirname, 'public', filename);
    if (fs.existsSync(exactPath)) {
      return res.download(exactPath, filename);
    }
    const latestApk = findLatestPackageFile('.apk');
    if (latestApk && fs.existsSync(latestApk)) {
      return res.download(latestApk, path.basename(latestApk));
    }
  } else if (req.path.endsWith('.ipa')) {
    const filename = path.basename(req.path);
    const exactPath = path.join(__dirname, 'public', filename);
    if (fs.existsSync(exactPath)) {
      return res.download(exactPath, filename);
    }
    const latestIpa = findLatestPackageFile('.ipa');
    if (latestIpa && fs.existsSync(latestIpa)) {
      return res.download(latestIpa, path.basename(latestIpa));
    }
  }
  next();
});

app.use(express.static('public'));

const serveUploadedFile = (req, res) => {
  const cleanPath = req.path.replace(/^\/(api\/)?uploads\/uploads\//, '').replace(/^\/(api\/)?uploads\//, '');
  const filePath = path.join(__dirname, 'uploads', cleanPath);

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
};

app.get('/uploads/*', serveUploadedFile);
app.get('/api/uploads/*', serveUploadedFile);

// Mobile App Download Endpoints (Always serves latest dynamic version)
app.get(['/api/download/android', '/download/android', '/api/download/apk', '/download/apk'], (req, res) => {
  let dynamicVersion = '1.0.4';
  try {
    const appJsonPath = path.join(__dirname, '..', 'mobile', 'app.json');
    if (fs.existsSync(appJsonPath)) {
      const aj = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      if (aj?.expo?.version) dynamicVersion = aj.expo.version;
    }
  } catch (e) {}

  const targetFilename = `SES-Educare-v${dynamicVersion}.apk`;
  const pubPath = path.join(__dirname, 'public', targetFilename);
  if (fs.existsSync(pubPath)) {
    return res.download(pubPath, targetFilename);
  }

  const latestApk = findLatestPackageFile('.apk');
  if (latestApk && fs.existsSync(latestApk)) {
    return res.download(latestApk, targetFilename, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ success: false, message: 'Error downloading APK file' });
      }
    });
  }
  return res.status(404).json({ success: false, message: 'APK file not found on server' });
});

// iOS IPA File Download Endpoint (Always serves latest dynamic version)
app.get(['/api/download/ios-ipa', '/download/ios-ipa', '/api/download/ipa', '/download/ipa'], (req, res) => {
  let dynamicVersion = '1.0.4';
  try {
    const appJsonPath = path.join(__dirname, '..', 'mobile', 'app.json');
    if (fs.existsSync(appJsonPath)) {
      const aj = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      if (aj?.expo?.version) dynamicVersion = aj.expo.version;
    }
  } catch (e) {}

  const targetFilename = `SES-Educare-v${dynamicVersion}.ipa`;
  const pubPath = path.join(__dirname, 'public', targetFilename);
  if (fs.existsSync(pubPath)) {
    return res.download(pubPath, targetFilename);
  }

  const latestIpa = findLatestPackageFile('.ipa');
  if (latestIpa && fs.existsSync(latestIpa)) {
    return res.download(latestIpa, targetFilename, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ success: false, message: 'Error downloading IPA file' });
      }
    });
  }
  return res.status(404).json({ success: false, message: 'IPA file not found on server' });
});

// iOS Over-The-Air (OTA) Manifest Route for Safari 1-tap install
app.get(['/manifest.plist', '/api/manifest.plist'], (req, res) => {
  const manifestPath = path.join(__dirname, 'public', 'manifest.plist');
  if (fs.existsSync(manifestPath)) {
    res.setHeader('Content-Type', 'text/xml');
    return res.sendFile(manifestPath);
  }
  return res.status(404).json({ success: false, message: 'Manifest not found' });
});

app.get(['/api/download/ios', '/download/ios'], (req, res) => {
  const iosUrl = process.env.IOS_APP_URL || '';
  const ver = getActiveAppVersion();
  const latestIpa = findLatestPackageFile('.ipa');
  const ipaName = latestIpa ? path.basename(latestIpa) : `SES-Educare-v${ver}.ipa`;
  return res.json({
    success: true,
    platform: 'iOS',
    version: ver,
    status: 'Direct IPA / Safari Wireless Install',
    url: iosUrl,
    ipaUrl: `/${ipaName}`,
    otaUrl: 'itms-services://?action=download-manifest&url=https://myapp.seseducare.com/manifest.plist',
    instructions: 'Install via Direct IPA package (Sideloadly) or Safari OTA wireless install.'
  });
});

app.get(['/api/download/info', '/download/info'], (req, res) => {
  const ver = getActiveAppVersion();
  const latestApk = findLatestPackageFile('.apk');
  const latestIpa = findLatestPackageFile('.ipa');
  const apkName = latestApk ? path.basename(latestApk) : `SES-Educare-v${ver}.apk`;
  const ipaName = latestIpa ? path.basename(latestIpa) : `SES-Educare-v${ver}.ipa`;
  return res.json({
    success: true,
    appName: 'Arion School',
    version: ver,
    android: {
      available: Boolean(latestApk),
      filename: apkName,
      downloadUrl: '/api/download/android',
      size: '39.5 MB'
    },
    ios: {
      available: Boolean(latestIpa),
      filename: ipaName,
      downloadUrl: '/api/download/ios-ipa',
      otaUrl: 'itms-services://?action=download-manifest&url=https://myapp.seseducare.com/manifest.plist',
      status: 'Direct IPA / Safari Wireless Install',
      size: '4.7 MB',
      url: process.env.IOS_APP_URL || ''
    }
  });
});

// Root API health status endpoint
app.get(['/api', '/api/', '/api/health', '/api/status'], (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Arion School School Management ERP API is live and operational',
    status: 'online',
    version: BACKEND_VERSION,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/activity', require('./routes/activityRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/modules', require('./routes/moduleRoutes'));
app.use('/api/lessons', require('./routes/lessonRoutes'));
app.use('/api/chapters', require('./routes/chapterRoutes'));
app.use('/api/topics', require('./routes/topicRoutes'));
app.use('/api/mcqs', require('./routes/mcqRoutes'));
app.use('/api/progress', require('./routes/progressRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/exams', require('./routes/examRoutes'));
app.use('/api/programs', require('./routes/programRoutes'));
app.use('/api/batches', require('./routes/batchRoutes'));
app.use('/api/academics', require('./routes/academicMasterRoutes'));
app.use('/api/campuses', require('./routes/campusRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/platform-admin', require('./routes/platformAdminRoutes'));
app.use('/api/branding', require('./routes/brandingRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/promotions', require('./routes/promotionRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/staff-salary', require('./routes/staffSalaryRoutes'));
app.use('/api/advance-payment', require('./routes/advancePaymentRoutes'));
app.use('/api/staff-attendance', require('./routes/staffAttendanceRoutes'));
app.use('/api/payments/razorpay', require('./routes/razorpayRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/fee-policies', require('./routes/feePolicyRoutes'));
app.use('/api/fee-obligations', require('./routes/feeObligationRoutes'));
app.use('/api/school-fees', require('./routes/schoolFeeRoutes'));
app.use('/api/accounting', require('./routes/accountingRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/hostel', require('./routes/hostelRoutes'));
app.use('/api/school-exams', require('./routes/schoolExamRoutes'));
app.use('/api/timetable', require('./routes/timetableRoutes'));
app.use('/api/library', require('./routes/libraryRoutes'));
app.use('/api/homework', require('./routes/homeworkRoutes'));
app.use('/api/staff-shifts', require('./routes/staffShiftRoutes'));
app.use('/api/leaves', require('./routes/leaveRoutes'));
app.use('/api/discipline', require('./routes/disciplineRoutes'));
app.use('/api/visitor-pass', require('./routes/visitorPassRoutes'));
app.use('/api/transport', require('./routes/transportRoutes'));
app.use('/api/communications', require('./routes/communicationRoutes'));
app.use('/api/onboarding', require('./routes/onboardingRoutes'));
app.use('/api/automation', require('./routes/automationRoutes'));
app.use('/api/school-certificates', require('./routes/schoolCertificateRoutes'));
app.use('/api/school-events', require('./routes/schoolEventRoutes'));
app.use('/api/school-surveys', require('./routes/schoolSurveyRoutes'));
app.use('/api/online-classes', require('./routes/onlineClassRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/enquiries', require('./routes/enquiryRoutes'));
app.use('/api/admissions', require('./routes/admissionRoutes'));
app.use('/api/gallery', require('./routes/galleryRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/fees', require('./routes/feeRoutes'));
app.use('/api/reports', require('./routes/reportsRoutes'));
app.use('/api/id-cards', require('./routes/idCardRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));
app.use('/api/student-certificates', require('./routes/studentCertificateRoutes'));
app.use('/api/marksheets', require('./routes/marksheetRoutes'));
app.use('/api/app-version', require('./routes/appVersionRoutes'));
app.get('/api/download/android', (req, res) => res.redirect('/api/app-version/download/android'));
app.get('/api/download/ios-ipa', (req, res) => res.redirect('/api/app-version/download/ios'));
app.get('/api/download/latest', (req, res) => res.redirect('/api/app-version/download/android'));
app.use('/api', require('./routes/certificateVerificationRoutes'));
app.use('/api/utility', require('./routes/utilityRoutes'));
app.use('/api/website', require('./routes/websiteRoutes'));
app.use('/api/testimonials', require('./routes/testimonialRoutes'));
app.use('/api/footer', require('./routes/footerRoutes'));
app.use('/api/seat-requests', require('./routes/seatRequestRoutes'));
app.use('/api/company-information', require('./routes/companyInformationRoutes'));
app.use('/api/company-information/documents', require('./routes/companyDocumentRoutes'));
app.use('/api/template-assets', require('./routes/templateAssetRoutes'));
app.use('/api/search', require('./routes/searchRoutes'));
app.use('/api/temp', require('./routes/tempRoutes'));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EduTest Pro API is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const http = require('http');
const { initSocket } = require('./utils/socket');

const server = http.createServer(app);

if (isSocketEnabled()) {
  initSocket(server);
  console.log('Socket.io enabled');
} else {
  console.log('Socket.io disabled (DISABLE_SOCKET=true)');
}

const startServer = async () => {
  try {
    await connectDB();

    const { autoSyncAppVersions } = require('./controllers/appVersionController');
    autoSyncAppVersions().catch(err => console.log('App version auto-sync non-blocking:', err.message));

    server.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      if (isProduction()) {
        console.log('Production safety: PDF=off, scheduler=off (unless explicitly enabled in .env)');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err?.message || err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err?.message || err);
});

const gracefulShutdown = (signal) => {
  console.log(`${signal} received — closing server`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

