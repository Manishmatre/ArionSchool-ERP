const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Read current mobile app version from app.json
const appJsonPath = path.join(rootDir, 'mobile', 'app.json');
let targetVersion = '1.0.4';
if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    if (appJson?.expo?.version) targetVersion = appJson.expo.version;
  } catch (e) { }
}

const targetApkName = `SES-Educare-v${targetVersion}.apk`;
const targetIpaName = `SES-Educare-v${targetVersion}.ipa`;

const dirs = [
  path.join(rootDir, 'backend', 'public'),
  path.join(rootDir, 'frontend', 'public'),
  path.join(rootDir, 'frontend', 'dist'),
  path.join(rootDir, 'mobile', 'dist'),
  rootDir
];

// Helper to find any existing apk / ipa as master
let masterApk = null;
let masterIpa = null;

for (const dir of dirs) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (!masterApk && f.startsWith('SES-Educare') && f.endsWith('.apk')) {
        masterApk = path.join(dir, f);
      }
      if (!masterIpa && f.startsWith('SES-Educare') && f.endsWith('.ipa')) {
        masterIpa = path.join(dir, f);
      }
    }
  }
}

console.log('Master APK source:', masterApk);
console.log('Master IPA source:', masterIpa);

dirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    const destApk = path.join(dir, targetApkName);
    if (masterApk && !fs.existsSync(destApk)) {
      fs.copyFileSync(masterApk, destApk);
      console.log('Created:', destApk);
    }
    const destIpa = path.join(dir, targetIpaName);
    if (masterIpa && !fs.existsSync(destIpa)) {
      fs.copyFileSync(masterIpa, destIpa);
      console.log('Created:', destIpa);
    }
  }
});

// Update manifest.plist in backend/public and frontend/public
const plistDirs = [
  path.join(rootDir, 'backend', 'public', 'manifest.plist'),
  path.join(rootDir, 'frontend', 'public', 'manifest.plist'),
  path.join(rootDir, 'frontend', 'dist', 'manifest.plist')
];

plistDirs.forEach((plistPath) => {
  if (fs.existsSync(plistPath)) {
    let content = fs.readFileSync(plistPath, 'utf8');
    content = content.replace(/SES-Educare-v[\d\.]+\.ipa/g, targetIpaName);
    content = content.replace(/<key>bundle-version<\/key>\s*<string>[\d\.]+<\/string>/g, `<key>bundle-version</key>\n                <string>${targetVersion}</string>`);
    fs.writeFileSync(plistPath, content);
    console.log('Updated manifest.plist at:', plistPath);
  }
});

console.log('Sync packages completed successfully.');

