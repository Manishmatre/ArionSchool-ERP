const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  getLatestAppVersion,
  getAllAppVersions,
  createAppVersion,
  updateAppVersion,
  setActiveVersion,
  deleteAppVersion,
  trackDownload,
  downloadDirectApp
} = require('../controllers/appVersionController');
const { protect, authorize } = require('../middlewares/auth');

// Multer storage for APK uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'public');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const versionName = (req.body.versionName || 'latest').replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(file.originalname) || (req.body.platform === 'ios' ? '.ipa' : '.apk');
    cb(null, `SES-Educare-v${versionName}${ext}`);
  }
});

const apkUpload = multer({
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.apk' || ext === '.ipa' || file.mimetype === 'application/vnd.android.package-archive' || file.mimetype === 'application/octet-stream') {
      return cb(null, true);
    }
    cb(new Error('Only .apk and .ipa files are allowed'));
  }
});

// Public endpoints
router.get('/latest', getLatestAppVersion);
router.get('/download/:platform', downloadDirectApp);
router.get('/download', downloadDirectApp);
router.post('/track-download', trackDownload);

// Superadmin protected routes
router.use(protect);
router.use(authorize('super_admin'));

router.get('/', getAllAppVersions);
router.post('/', apkUpload.single('apkFile'), createAppVersion);
router.put('/:id', updateAppVersion);
router.put('/:id/set-active', setActiveVersion);
router.delete('/:id', deleteAppVersion);

module.exports = router;
