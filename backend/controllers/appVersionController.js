const AppVersion = require('../models/AppVersion');
const path = require('path');
const fs = require('fs');

// Helper to read dynamic version from mobile/app.json or mobile/src/config/version.js
const getDynamicAppInfo = () => {
  let versionName = '1.0.47';
  let versionCode = 48;
  const candidateAppJsonPaths = [
    path.join(__dirname, '..', '..', 'mobile', 'app.json'),
    path.join(process.cwd(), 'mobile', 'app.json'),
    path.join(__dirname, '..', 'mobile', 'app.json'),
    path.join('/var/www/Ses-LMS-Management', 'mobile', 'app.json')
  ];

  for (const appJsonPath of candidateAppJsonPaths) {
    try {
      if (fs.existsSync(appJsonPath)) {
        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        if (appJson?.expo?.version) {
          versionName = String(appJson.expo.version);
        }
        if (appJson?.expo?.android?.versionCode) {
          versionCode = Number(appJson.expo.android.versionCode);
        }
        break;
      }
    } catch (e) {
      // try next
    }
  }

  // Also check version.js
  const candidateVersionJsPaths = [
    path.join(__dirname, '..', '..', 'mobile', 'src', 'config', 'version.js'),
    path.join(process.cwd(), 'mobile', 'src', 'config', 'version.js'),
    path.join('/var/www/Ses-LMS-Management', 'mobile', 'src', 'config', 'version.js')
  ];
  for (const vJsPath of candidateVersionJsPaths) {
    try {
      if (fs.existsSync(vJsPath)) {
        const content = fs.readFileSync(vJsPath, 'utf8');
        const vMatch = content.match(/CURRENT_APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
        const bMatch = content.match(/CURRENT_APP_BUILD\s*=\s*(\d+)/);
        if (vMatch && vMatch[1]) versionName = vMatch[1];
        if (bMatch && bMatch[1]) versionCode = parseInt(bMatch[1], 10);
        break;
      }
    } catch (e) {}
  }

  return { versionName, versionCode };
};

// Helper to compare semver versions in filenames
const comparePackageFiles = (a, b) => {
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

// Helper to find latest package file on disk
const findLatestFile = (extension) => {
  const dirs = [
    path.join(__dirname, '..', 'public'),
    path.join(__dirname, '..', '..'),
    path.join(__dirname, '..', '..', 'frontend', 'public')
  ];
  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
        .filter((f) => f.startsWith('SES-Educare') && f.endsWith(extension))
        .sort(comparePackageFiles);
      if (files.length > 0) {
        const fullPath = path.join(dir, files[0]);
        let sizeMb = extension === '.ipa' ? '4.7 MB' : '39.5 MB';
        try {
          const stats = fs.statSync(fullPath);
          sizeMb = `${(stats.size / (1024 * 1024)).toFixed(1)} MB`;
        } catch {}
        return { filename: files[0], fullPath, sizeMb };
      }
    }
  }
  return null;
};

// Automatically syncs MongoDB AppVersion with current mobile app codebase & package files
const autoSyncAppVersions = async () => {
  try {
    const { versionName, versionCode } = getDynamicAppInfo();
    const targetApkFilename = `SES-Educare-v${versionName}.apk`;
    const targetIpaFilename = `SES-Educare-v${versionName}.ipa`;

    // Ensure physical files exist in public directories
    const pubDir = path.join(__dirname, '..', 'public');
    const targetApkPath = path.join(pubDir, targetApkFilename);
    const targetIpaPath = path.join(pubDir, targetIpaFilename);

    const latestApk = findLatestFile('.apk');
    const latestIpa = findLatestFile('.ipa');

    if (!fs.existsSync(targetApkPath) && latestApk?.fullPath) {
      try {
        fs.copyFileSync(latestApk.fullPath, targetApkPath);
      } catch (e) {}
    }

    if (!fs.existsSync(targetIpaPath) && latestIpa?.fullPath) {
      try {
        fs.copyFileSync(latestIpa.fullPath, targetIpaPath);
      } catch (e) {}
    }

    const apkSize = latestApk ? latestApk.sizeMb : '39.5 MB';
    const ipaSize = latestIpa ? latestIpa.sizeMb : '4.7 MB';

    // 1. Android Sync
    let androidDoc = await AppVersion.findOne({ platform: 'android', versionCode });
    if (!androidDoc) {
      androidDoc = await AppVersion.findOne({ platform: 'android', versionName });
    }

    if (androidDoc) {
      androidDoc.versionName = versionName;
      androidDoc.versionCode = versionCode;
      androidDoc.apkUrl = `/${targetApkFilename}`;
      androidDoc.fileSize = apkSize;
      androidDoc.isMandatory = true;
      androidDoc.isActive = true;
      await androidDoc.save();
    } else {
      androidDoc = await AppVersion.create({
        platform: 'android',
        versionName,
        versionCode,
        apkUrl: `/${targetApkFilename}`,
        fileSize: apkSize,
        releaseNotes: `Official Release v${versionName}: Mandatory update with exam enhancements, attendance QR sync, and performance updates.`,
        isMandatory: true,
        isActive: true,
        downloadCount: 0
      });
    }

    // Automatically deactivate ALL older/other Android releases so ONLY the latest is Live
    await AppVersion.updateMany(
      { platform: 'android', _id: { $ne: androidDoc._id } },
      { $set: { isActive: false } }
    );

    // 2. iOS Sync
    let iosDoc = await AppVersion.findOne({ platform: 'ios', versionCode });
    if (!iosDoc) {
      iosDoc = await AppVersion.findOne({ platform: 'ios', versionName });
    }

    if (iosDoc) {
      iosDoc.versionName = versionName;
      iosDoc.versionCode = versionCode;
      iosDoc.apkUrl = `/${targetIpaFilename}`;
      iosDoc.fileSize = ipaSize;
      iosDoc.isMandatory = true;
      iosDoc.isActive = true;
      await iosDoc.save();
    } else {
      iosDoc = await AppVersion.create({
        platform: 'ios',
        versionName,
        versionCode,
        apkUrl: `/${targetIpaFilename}`,
        iosUrl: process.env.IOS_TESTFLIGHT_URL || '',
        fileSize: ipaSize,
        releaseNotes: `Official iOS Release v${versionName}: Mandatory update with direct IPA package, OTA install, and exam updates.`,
        isMandatory: true,
        isActive: true,
        downloadCount: 0
      });
    }

    // Automatically deactivate ALL other iOS releases
    await AppVersion.updateMany(
      { platform: 'ios', _id: { $ne: iosDoc._id } },
      { $set: { isActive: false } }
    );

    // 3. Fix any legacy/broken URLs in old records so clicking download on any row never 404s
    await AppVersion.updateMany(
      { platform: 'android', apkUrl: { $regex: 'LMS|v1.0.0|v1.0.1|v1.0.2|v1.0.3' } },
      { $set: { apkUrl: `/${targetApkFilename}` } }
    );
    await AppVersion.updateMany(
      { platform: 'ios', apkUrl: { $regex: 'LMS|v1.0.0|v1.0.1|v1.0.2|v1.0.3' } },
      { $set: { apkUrl: `/${targetIpaFilename}` } }
    );
  } catch (err) {
    console.warn('App version auto-sync warning:', err.message);
  }
};

// Default fallback versions if none created in DB yet
const DEFAULT_ANDROID_VERSION = {
  platform: 'android',
  versionName: '1.0.13',
  versionCode: 14,
  apkUrl: '/SES-Educare-v1.0.13.apk',
  fileSize: '39.5 MB',
  releaseNotes: 'Official Release v1.0.13: Mandatory update with real-time in-app forced updates, exam enhancements, and attendance sync.',
  isMandatory: true,
  isActive: true,
  downloadCount: 0
};

const DEFAULT_IOS_VERSION = {
  platform: 'ios',
  versionName: '1.0.13',
  versionCode: 14,
  apkUrl: '/SES-Educare-v1.0.13.ipa',
  iosUrl: process.env.IOS_TESTFLIGHT_URL || '',
  fileSize: '4.7 MB',
  releaseNotes: 'Official iOS Release v1.0.13: Mandatory update with direct IPA package, OTA install, and exam updates.',
  isMandatory: true,
  isActive: true,
  downloadCount: 0
};

// @desc    Get latest active app version (Public)
// @route   GET /api/app-version/latest
// @access  Public
exports.getLatestAppVersion = async (req, res) => {
  try {
    // Run auto-sync to ensure database always reflects latest app version from codebase
    await autoSyncAppVersions();

    const platform = (req.query.platform || 'android').toLowerCase();
    const defaultData = platform === 'ios' ? DEFAULT_IOS_VERSION : DEFAULT_ANDROID_VERSION;

    let latest = await AppVersion.findOne({ platform, isActive: true })
      .sort({ versionCode: -1 })
      .lean();

    if (!latest) {
      latest = defaultData;
    }

    const directDownloadUrl = `/api/app-version/download/${platform}`;

    return res.status(200).json({
      success: true,
      data: {
        ...latest,
        isMandatory: true, // Always enforce mandatory update for older mobile builds
        directDownloadUrl
      }
    });
  } catch (error) {
    console.error('Error fetching latest app version:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch latest app version',
      data: {
        ...DEFAULT_ANDROID_VERSION,
        isMandatory: true,
        directDownloadUrl: '/api/app-version/download/android'
      }
    });
  }
};

// @desc    Direct download of latest mobile app package (APK/IPA)
// @route   GET /api/app-version/download/:platform (or /download/android)
// @access  Public
exports.downloadDirectApp = async (req, res) => {
  try {
    await autoSyncAppVersions();
    const platform = (req.params.platform || req.query.platform || 'android').toLowerCase();
    const ext = platform === 'ios' ? '.ipa' : '.apk';

    const latest = await AppVersion.findOne({ platform, isActive: true })
      .sort({ versionCode: -1 })
      .lean();

    const latestFile = findLatestFile(ext);

    if (latestFile && fs.existsSync(latestFile.fullPath)) {
      const downloadName = `SES-Educare-v${latest?.versionName || 'latest'}${ext}`;
      const contentType = platform === 'ios' ? 'application/octet-stream' : 'application/vnd.android.package-archive';

      // Increment download counter
      if (latest?._id) {
        AppVersion.findByIdAndUpdate(latest._id, { $inc: { downloadCount: 1 } }).catch(() => {});
      }

      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      res.setHeader('Content-Type', contentType);
      return res.sendFile(latestFile.fullPath);
    }

    return res.status(404).json({
      success: false,
      message: `No ${ext.toUpperCase()} installation package available on server yet.`
    });
  } catch (err) {
    console.error('Download app error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process app download' });
  }
};

// @desc    Get all app releases
// @route   GET /api/app-version
// @access  Private (Super Admin)
exports.getAllAppVersions = async (req, res) => {
  try {
    // Always auto-sync before loading management page
    await autoSyncAppVersions();

    const versions = await AppVersion.find()
      .sort({ versionCode: -1, createdAt: -1 })
      .populate('uploadedBy', 'name email')
      .lean();

    return res.status(200).json({
      success: true,
      count: versions.length,
      data: versions
    });
  } catch (error) {
    console.error('Error fetching app versions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch app versions'
    });
  }
};

// @desc    Create/Publish new app version
// @route   POST /api/app-version
// @access  Private (Super Admin)
exports.createAppVersion = async (req, res) => {
  try {
    const {
      platform = 'android',
      versionName,
      versionCode,
      apkUrl,
      iosUrl,
      fileSize,
      releaseNotes,
      isMandatory,
      isActive = true
    } = req.body;

    if (!versionName || versionCode === undefined) {
      return res.status(400).json({
        success: false,
        message: 'versionName and versionCode are required'
      });
    }

    const numericVersionCode = parseInt(versionCode, 10);
    if (isNaN(numericVersionCode)) {
      return res.status(400).json({
        success: false,
        message: 'versionCode must be a number'
      });
    }

    const latestPkg = findLatestFile(platform === 'ios' ? '.ipa' : '.apk');
    let finalApkUrl = apkUrl || (latestPkg ? `/${latestPkg.filename}` : (platform === 'ios' ? `/SES-Educare-v${versionName}.ipa` : `/SES-Educare-v${versionName}.apk`));
    let finalFileSize = fileSize || (latestPkg ? latestPkg.sizeMb : (platform === 'ios' ? '4.7 MB' : '39.5 MB'));

    // Handle uploaded file if present
    if (req.file) {
      finalApkUrl = `/uploads/${req.file.filename}`;
      const bytes = req.file.size;
      finalFileSize = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

      // Also copy to public folder for direct high-speed serving
      try {
        const publicDest = path.join(__dirname, '..', 'public', req.file.filename);
        fs.copyFileSync(req.file.path, publicDest);
      } catch (copyErr) {
        console.warn('Could not mirror APK to public folder:', copyErr.message);
      }
    }

    const shouldBeActive = isActive === true || isActive === 'true';

    // If active, deactivate other versions of this platform
    if (shouldBeActive) {
      await AppVersion.updateMany({ platform }, { $set: { isActive: false } });
    }

    const newVersion = await AppVersion.create({
      platform,
      versionName: versionName.trim(),
      versionCode: numericVersionCode,
      apkUrl: finalApkUrl,
      iosUrl: iosUrl || 'https://testflight.apple.com/join/seseducare',
      fileSize: finalFileSize,
      releaseNotes: releaseNotes || 'Bug fixes and performance improvements.',
      isMandatory: isMandatory === true || isMandatory === 'true',
      isActive: shouldBeActive,
      uploadedBy: req.user?._id
    });

    return res.status(201).json({
      success: true,
      message: `App version ${versionName} published successfully!`,
      data: newVersion
    });
  } catch (error) {
    console.error('Error creating app version:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to publish app version'
    });
  }
};

// @desc    Set an app version as active/live
// @route   PUT /api/app-version/:id/set-active
// @access  Private (Super Admin)
exports.setActiveVersion = async (req, res) => {
  try {
    const version = await AppVersion.findById(req.params.id);
    if (!version) {
      return res.status(404).json({ success: false, message: 'App version not found' });
    }

    // Deactivate others for same platform
    await AppVersion.updateMany({ platform: version.platform }, { $set: { isActive: false } });

    version.isActive = true;
    await version.save();

    return res.status(200).json({
      success: true,
      message: `Version ${version.versionName} is now the LIVE active release!`,
      data: version
    });
  } catch (error) {
    console.error('Error activating app version:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to activate app version'
    });
  }
};

// @desc    Update app version details
// @route   PUT /api/app-version/:id
// @access  Private (Super Admin)
exports.updateAppVersion = async (req, res) => {
  try {
    const version = await AppVersion.findById(req.params.id);
    if (!version) {
      return res.status(404).json({ success: false, message: 'App version not found' });
    }

    const updates = { ...req.body };
    if (updates.versionCode) updates.versionCode = parseInt(updates.versionCode, 10);
    if (updates.isMandatory !== undefined) updates.isMandatory = updates.isMandatory === true || updates.isMandatory === 'true';
    if (updates.isActive !== undefined) updates.isActive = updates.isActive === true || updates.isActive === 'true';

    if (updates.isActive) {
      await AppVersion.updateMany({ platform: version.platform, _id: { $ne: version._id } }, { $set: { isActive: false } });
    }

    const updated = await AppVersion.findByIdAndUpdate(req.params.id, updates, { new: true });

    return res.status(200).json({
      success: true,
      message: 'App version updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error updating app version:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update app version'
    });
  }
};

// @desc    Delete an app version record
// @route   DELETE /api/app-version/:id
// @access  Private (Super Admin)
exports.deleteAppVersion = async (req, res) => {
  try {
    const version = await AppVersion.findById(req.params.id);
    if (!version) {
      return res.status(404).json({ success: false, message: 'App version not found' });
    }

    if (version.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the currently active live release. Activate another version first.'
      });
    }

    await AppVersion.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'App version record deleted'
    });
  } catch (error) {
    console.error('Error deleting app version:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete app version'
    });
  }
};

// @desc    Increment download count
// @route   POST /api/app-version/track-download
// @access  Public
exports.trackDownload = async (req, res) => {
  try {
    const platform = req.query.platform || 'android';
    await AppVersion.findOneAndUpdate(
      { platform, isActive: true },
      { $inc: { downloadCount: 1 } }
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(200).json({ success: true });
  }
};

exports.autoSyncAppVersions = autoSyncAppVersions;
