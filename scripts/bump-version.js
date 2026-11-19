/**
 * SES Educare Unified Version Management Tool
 * Usage:
 *   node scripts/bump-version.js [web|mobile|all] [patch|minor|major]
 *   node scripts/bump-version.js --set-web=2.0.6 --set-mobile=1.0.5
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const paths = {
  feVersion: path.join(rootDir, 'frontend', 'src', 'config', 'version.js'),
  fePkg: path.join(rootDir, 'frontend', 'package.json'),
  bePkg: path.join(rootDir, 'backend', 'package.json'),
  mobVersion: path.join(rootDir, 'mobile', 'src', 'config', 'version.js'),
  mobAppJson: path.join(rootDir, 'mobile', 'app.json'),
  mobPkg: path.join(rootDir, 'mobile', 'package.json'),
  beAppVerCtrl: path.join(rootDir, 'backend', 'controllers', 'appVersionController.js'),
  dlModal: path.join(rootDir, 'frontend', 'src', 'components', 'DownloadAppModal.jsx'),
};

function bumpSemver(versionStr, type = 'patch') {
  const parts = versionStr.split('.').map(Number);
  while (parts.length < 3) parts.push(0);
  if (type === 'major') {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  } else if (type === 'minor') {
    parts[1] += 1;
    parts[2] = 0;
  } else {
    parts[2] += 1;
  }
  return parts.join('.');
}

// 1. Read Current Web Version
let currentWebVersion = '2.0.5';
if (fs.existsSync(paths.fePkg)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(paths.fePkg, 'utf8'));
    if (pkg.version) currentWebVersion = pkg.version;
  } catch (e) {}
}

// 2. Read Current Mobile Version
let currentMobVersion = '1.0.4';
let currentMobBuild = 5;
if (fs.existsSync(paths.mobAppJson)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(paths.mobAppJson, 'utf8'));
    if (appJson?.expo?.version) currentMobVersion = appJson.expo.version;
    if (appJson?.expo?.android?.versionCode) currentMobBuild = Number(appJson.expo.android.versionCode);
  } catch (e) {}
}

const args = process.argv.slice(2);
const target = args[0] || 'all'; // 'web', 'mobile', or 'all'
const bumpType = args[1] || 'patch';

let newWebVersion = currentWebVersion;
let newMobVersion = currentMobVersion;
let newMobBuild = currentMobBuild;

const setWebArg = args.find((a) => a.startsWith('--set-web='));
const setMobArg = args.find((a) => a.startsWith('--set-mobile='));

if (setWebArg) {
  newWebVersion = setWebArg.split('=')[1].trim();
} else if (target === 'web' || target === 'all') {
  newWebVersion = bumpSemver(currentWebVersion, bumpType);
}

if (setMobArg) {
  newMobVersion = setMobArg.split('=')[1].trim();
  newMobBuild += 1;
} else if (target === 'mobile' || target === 'all') {
  newMobVersion = bumpSemver(currentMobVersion, bumpType);
  newMobBuild += 1;
}

// Apply Web Updates
if (newWebVersion !== currentWebVersion || setWebArg || target === 'web' || target === 'all') {
  // Update frontend/src/config/version.js
  const feVerContent = `// SES Educare Web Platform Version
// Auto-synced across all panels and navigation bars
export const APP_VERSION = '${newWebVersion}';
export const APP_NAME = 'SES Educare';
export const APP_FULL_TITLE = 'SES Educare';
export const APP_RELEASE_DATE = '${new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' })}';

export default {
  version: APP_VERSION,
  name: APP_NAME,
  title: APP_FULL_TITLE,
  releaseDate: APP_RELEASE_DATE,
};
`;
  fs.writeFileSync(paths.feVersion, feVerContent);

  // Update frontend/package.json
  if (fs.existsSync(paths.fePkg)) {
    const fePkg = JSON.parse(fs.readFileSync(paths.fePkg, 'utf8'));
    fePkg.version = newWebVersion;
    fs.writeFileSync(paths.fePkg, JSON.stringify(fePkg, null, 2) + '\n');
  }

  // Update backend/package.json
  if (fs.existsSync(paths.bePkg)) {
    const bePkg = JSON.parse(fs.readFileSync(paths.bePkg, 'utf8'));
    bePkg.version = newWebVersion;
    fs.writeFileSync(paths.bePkg, JSON.stringify(bePkg, null, 2) + '\n');
  }

  console.log(`✅ Web Platform Version synced to: v${newWebVersion}`);
}

// Apply Mobile Updates
if (newMobVersion !== currentMobVersion || setMobArg || target === 'mobile' || target === 'all') {
  // Update mobile/package.json
  if (fs.existsSync(paths.mobPkg)) {
    const mobPkg = JSON.parse(fs.readFileSync(paths.mobPkg, 'utf8'));
    mobPkg.version = newMobVersion;
    fs.writeFileSync(paths.mobPkg, JSON.stringify(mobPkg, null, 2) + '\n');
  }

  // Update mobile/app.json
  if (fs.existsSync(paths.mobAppJson)) {
    const appJson = JSON.parse(fs.readFileSync(paths.mobAppJson, 'utf8'));
    appJson.expo.version = newMobVersion;
    if (appJson.expo.android) appJson.expo.android.versionCode = newMobBuild;
    if (appJson.expo.ios) appJson.expo.ios.buildNumber = String(newMobBuild);
    fs.writeFileSync(paths.mobAppJson, JSON.stringify(appJson, null, 2) + '\n');
  }

  // Update mobile/src/config/version.js
  const mobVerContent = `// Mobile Application Version Configuration
// Auto-generated during build process
export const CURRENT_APP_VERSION = '${newMobVersion}';
export const CURRENT_APP_BUILD = ${newMobBuild};
export const IS_OTA_ENABLED = false;

export default {
  version: CURRENT_APP_VERSION,
  build: CURRENT_APP_BUILD,
  isOtaEnabled: IS_OTA_ENABLED,
};
`;
  fs.writeFileSync(paths.mobVersion, mobVerContent);

  // Update backend fallback in appVersionController.js
  if (fs.existsSync(paths.beAppVerCtrl)) {
    let ctrl = fs.readFileSync(paths.beAppVerCtrl, 'utf8');
    ctrl = ctrl.replace(/let versionName = '[\d\.]+';/, `let versionName = '${newMobVersion}';`);
    ctrl = ctrl.replace(/let versionCode = \d+;/, `let versionCode = ${newMobBuild};`);
    fs.writeFileSync(paths.beAppVerCtrl, ctrl);
  }

  // Update fallback in DownloadAppModal.jsx
  if (fs.existsSync(paths.dlModal)) {
    let dl = fs.readFileSync(paths.dlModal, 'utf8');
    dl = dl.replace(/versionName:\s*'[\d\.]+'/, `versionName: '${newMobVersion}'`);
    dl = dl.replace(/versionCode:\s*\d+/, `versionCode: ${newMobBuild}`);
    fs.writeFileSync(paths.dlModal, dl);
  }

  // Automatically sync physical APK and IPA package files for the new version
  const targetApkName = `SES-Educare-v${newMobVersion}.apk`;
  const targetIpaName = `SES-Educare-v${newMobVersion}.ipa`;
  const syncDirs = [
    path.join(rootDir, 'backend', 'public'),
    path.join(rootDir, 'frontend', 'public'),
    path.join(rootDir, 'frontend', 'dist'),
    path.join(rootDir, 'mobile', 'dist'),
    rootDir
  ];

  const nativeReleaseApk = path.join(rootDir, 'mobile', 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
  let masterApk = fs.existsSync(nativeReleaseApk) ? nativeReleaseApk : null;
  let masterIpa = null;

  const comparePackagesDesc = (a, b) => {
    const vA = a.match(/\d+(\.\d+)*/);
    const vB = b.match(/\d+(\.\d+)*/);
    if (!vA || !vB) return b.localeCompare(a);
    const pA = vA[0].split('.').map(Number);
    const pB = vB[0].split('.').map(Number);
    for (let i = 0; i < Math.max(pA.length, pB.length); i++) {
      const nA = pA[i] || 0;
      const nB = pB[i] || 0;
      if (nA !== nB) return nB - nA;
    }
    return b.localeCompare(a);
  };

  for (const dir of syncDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).sort(comparePackagesDesc);
      for (const f of files) {
        if (!masterApk && f.startsWith('SES-Educare') && f.endsWith('.apk')) masterApk = path.join(dir, f);
        if (!masterIpa && f.startsWith('SES-Educare') && f.endsWith('.ipa')) masterIpa = path.join(dir, f);
      }
    }
  }

  syncDirs.forEach((dir) => {
    if (fs.existsSync(dir)) {
      const dApk = path.join(dir, targetApkName);
      if (masterApk && !fs.existsSync(dApk)) {
        try { fs.copyFileSync(masterApk, dApk); } catch (e) {}
      }
      const dIpa = path.join(dir, targetIpaName);
      if (masterIpa && !fs.existsSync(dIpa)) {
        try { fs.copyFileSync(masterIpa, dIpa); } catch (e) {}
      }
    }
  });

  const plistFiles = [
    path.join(rootDir, 'backend', 'public', 'manifest.plist'),
    path.join(rootDir, 'frontend', 'public', 'manifest.plist'),
    path.join(rootDir, 'frontend', 'dist', 'manifest.plist')
  ];
  plistFiles.forEach((p) => {
    if (fs.existsSync(p)) {
      let content = fs.readFileSync(p, 'utf8');
      content = content.replace(/SES-Educare-v[\d\.]+\.ipa/g, targetIpaName);
      content = content.replace(/<key>bundle-version<\/key>\s*<string>[\d\.]+<\/string>/g, `<key>bundle-version</key>\n                <string>${newMobVersion}</string>`);
      fs.writeFileSync(p, content);
    }
  });

  console.log(`✅ Mobile Application Version synced to: v${newMobVersion} (build ${newMobBuild})`);
}
