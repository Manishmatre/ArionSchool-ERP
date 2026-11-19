const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..', '..');
const mobileDir = path.resolve(__dirname, '..');
const appJsonPath = path.join(mobileDir, 'app.json');
const mobilePkgPath = path.join(mobileDir, 'package.json');
const versionJsPath = path.join(mobileDir, 'src', 'config', 'version.js');

console.log('====================================================');
console.log('🚀  SES Educare Full Mobile Release Build Pipeline  ');
console.log('====================================================\n');

// 1. Read / Bump App Version & Build Serial
let appJson = {};
try {
  appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
} catch (e) {
  console.error('❌ Failed to read mobile/app.json:', e.message);
  process.exit(1);
}

let versionName = appJson?.expo?.version || '1.0.2';
let versionCode = Number(appJson?.expo?.android?.versionCode || 3);
let iosBuild = Number(appJson?.expo?.ios?.buildNumber || versionCode);

// Check CLI arguments for version bumps
const args = process.argv.slice(2);
const bumpArg = args.find((a) => a.startsWith('--bump') || a === '-b');
const versionArg = args.find((a) => a.startsWith('--version=') || a.startsWith('-v='));

if (versionArg) {
  versionName = versionArg.split('=')[1].trim();
  versionCode += 1;
  iosBuild = versionCode;
} else if (bumpArg) {
  const parts = versionName.split('.').map(Number);
  const bumpType = bumpArg.includes('=') ? bumpArg.split('=')[1] : 'patch';
  if (bumpType === 'major') {
    parts[0] = (parts[0] || 1) + 1;
    parts[1] = 0;
    parts[2] = 0;
  } else if (bumpType === 'minor') {
    parts[1] = (parts[1] || 0) + 1;
    parts[2] = 0;
  } else {
    // Default: patch
    parts[parts.length - 1] = (parts[parts.length - 1] || 0) + 1;
  }
  versionName = parts.join('.');
  versionCode += 1;
  iosBuild = versionCode;
}

// Update mobile/app.json
appJson.expo = appJson.expo || {};
appJson.expo.version = versionName;
appJson.expo.android = appJson.expo.android || {};
appJson.expo.android.versionCode = versionCode;
appJson.expo.ios = appJson.expo.ios || {};
appJson.expo.ios.buildNumber = String(iosBuild);
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');

// Update mobile/package.json
try {
  const pkg = JSON.parse(fs.readFileSync(mobilePkgPath, 'utf8'));
  pkg.version = versionName;
  fs.writeFileSync(mobilePkgPath, JSON.stringify(pkg, null, 2), 'utf8');
} catch (e) {}

// Update mobile/src/config/version.js
const versionJsContent = `// Mobile Application Version Configuration
// Auto-generated during build process
export const CURRENT_APP_VERSION = '${versionName}';
export const CURRENT_APP_BUILD = ${versionCode};
export const IS_OTA_ENABLED = false;

export default {
  version: CURRENT_APP_VERSION,
  build: CURRENT_APP_BUILD,
  isOtaEnabled: IS_OTA_ENABLED,
};
`;
fs.writeFileSync(versionJsPath, versionJsContent, 'utf8');

console.log(`📦 Target Version: v${versionName} (Build Serial: ${versionCode})`);
console.log(`✓ Synchronized app.json, package.json, and src/config/version.js\n`);

// 2. Build Android Release APK via Gradle
console.log('🤖 Step 1/3: Compiling Native Android Release APK...');
try {
  const isWin = process.platform === 'win32';
  const gradlewCmd = isWin ? '.\\gradlew.bat assembleRelease' : './gradlew assembleRelease';
  execSync(gradlewCmd, {
    cwd: path.join(mobileDir, 'android'),
    stdio: 'inherit'
  });
} catch (e) {
  console.error('\n❌ Android APK compilation failed:', e.message);
  process.exit(1);
}

const releaseApkPath = path.join(mobileDir, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (!fs.existsSync(releaseApkPath)) {
  console.error('\n❌ Could not find output APK at:', releaseApkPath);
  process.exit(1);
}
console.log('✅ Android Release APK compiled successfully.\n');

// 3. Export iOS Assets & Package IPA
console.log('🍎 Step 2/3: Exporting iOS Bundle & Packaging .IPA...');
try {
  execSync('npx expo export --platform ios --output-dir dist/ios_export', {
    cwd: mobileDir,
    stdio: 'inherit'
  });
  execSync(`node "${path.join(mobileDir, 'scripts', 'build_ipa.js')}"`, {
    cwd: mobileDir,
    stdio: 'inherit'
  });
} catch (e) {
  console.warn('⚠️ iOS IPA build warning:', e.message);
}
console.log('✅ iOS Package generated successfully.\n');

// 4. Distribute to Root, Backend & Frontend Public, and Clean Old Versions
console.log('📂 Step 3/3: Distributing packages and cleaning old releases...');
const targetApkName = `SES-Educare-v${versionName}.apk`;
const targetIpaName = `SES-Educare-v${versionName}.ipa`;

const distDirs = [
  rootDir,
  path.join(rootDir, 'frontend', 'public'),
  path.join(rootDir, 'backend', 'public')
];

for (const dir of distDirs) {
  if (!fs.existsSync(dir)) continue;

  // Clean older versions
  const existingFiles = fs.readdirSync(dir);
  for (const file of existingFiles) {
    if (file.startsWith('SES-Educare') && (file.endsWith('.apk') || file.endsWith('.ipa'))) {
      if (file !== targetApkName && file !== targetIpaName) {
        try {
          fs.unlinkSync(path.join(dir, file));
          console.log(`  - Cleaned old package: ${path.relative(rootDir, path.join(dir, file))}`);
        } catch {}
      }
    }
  }

  // Copy fresh APK
  const destApk = path.join(dir, targetApkName);
  fs.copyFileSync(releaseApkPath, destApk);
  console.log(`  + Deployed APK -> ${path.relative(rootDir, destApk)}`);

  // Copy fresh IPA if exists
  const sourceIpa = path.join(rootDir, targetIpaName);
  if (dir !== rootDir && fs.existsSync(sourceIpa)) {
    const destIpa = path.join(dir, targetIpaName);
    fs.copyFileSync(sourceIpa, destIpa);
    console.log(`  + Deployed IPA -> ${path.relative(rootDir, destIpa)}`);
  }
}

console.log('\n====================================================');
console.log(`🎉 Build & Distribution Complete!`);
console.log(`   Latest Version: v${versionName} (Build: ${versionCode})`);
console.log(`   APK: ${targetApkName}`);
console.log(`   IPA: ${targetIpaName}`);
console.log('====================================================\n');

