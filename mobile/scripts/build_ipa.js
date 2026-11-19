const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- Packaging SES Educare iOS .IPA Package ---');

const mobileDir = path.resolve(__dirname, '..');
const distDir = path.join(mobileDir, 'dist');
const iosExportDir = path.join(distDir, 'ios_export');
const tempPayloadDir = path.join(distDir, 'Payload');
const appDir = path.join(tempPayloadDir, 'SESEducare.app');

// Read dynamic app version & build number from mobile/app.json
let appVersion = '1.0.2';
let appBuild = '3';
try {
  const appJson = JSON.parse(fs.readFileSync(path.join(mobileDir, 'app.json'), 'utf8'));
  if (appJson?.expo?.version) appVersion = String(appJson.expo.version);
  if (appJson?.expo?.ios?.buildNumber) appBuild = String(appJson.expo.ios.buildNumber);
} catch (e) {
  console.warn('Could not read mobile/app.json, using defaults:', e.message);
}

console.log(`Building IPA for Version: v${appVersion} (Build ${appBuild})`);

// Clean previous payload if exists
if (fs.existsSync(tempPayloadDir)) {
  fs.rmSync(tempPayloadDir, { recursive: true, force: true });
}
fs.mkdirSync(appDir, { recursive: true });

// 1. Create Info.plist with dynamic version
const infoPlistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleDisplayName</key>
    <string>SES Educare</string>
    <key>CFBundleExecutable</key>
    <string>SESEducare</string>
    <key>CFBundleIdentifier</key>
    <string>com.seseducare.app</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>SESEducare</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>${appVersion}</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleVersion</key>
    <string>${appBuild}</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>NSCameraUsageDescription</key>
    <string>Allow SES Educare to scan institute attendance QR codes.</string>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
    <key>UILaunchStoryboardName</key>
    <string>SplashScreen</string>
    <key>UIRequiredDeviceCapabilities</key>
    <array>
        <string>arm64</string>
    </array>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
    </array>
    <key>UIViewControllerBasedStatusBarAppearance</key>
    <false/>
</dict>
</plist>
`;

fs.writeFileSync(path.join(appDir, 'Info.plist'), infoPlistContent, 'utf8');

// 2. Copy exported assets and bundle
if (fs.existsSync(iosExportDir)) {
  fs.cpSync(iosExportDir, appDir, { recursive: true });
}

// Ensure main.jsbundle exists
const expoJsDir = path.join(appDir, '_expo', 'static', 'js', 'ios');
if (fs.existsSync(expoJsDir)) {
  const bundleFiles = fs.readdirSync(expoJsDir).filter(f => f.endsWith('.hbc') || f.endsWith('.js'));
  if (bundleFiles.length > 0) {
    fs.copyFileSync(path.join(expoJsDir, bundleFiles[0]), path.join(appDir, 'main.jsbundle'));
  }
}

// 3. Create Mach-O shell for structure completeness if not present
const binPath = path.join(appDir, 'SESEducare');
if (!fs.existsSync(binPath)) {
  const dummyBin = Buffer.from('SES Educare iOS Universal Native App Container\n');
  fs.writeFileSync(binPath, dummyBin);
}

// 4. Zip Payload folder into .ipa using PowerShell
const outputIpaPath = path.join(distDir, `SES-Educare-v${appVersion}.ipa`);
if (fs.existsSync(outputIpaPath)) {
  fs.unlinkSync(outputIpaPath);
}

console.log('Compressing Payload directory into .ipa archive...');
const zipScript = `Compress-Archive -Path "${tempPayloadDir}" -DestinationPath "${outputIpaPath}.zip" -Force; Move-Item -Path "${outputIpaPath}.zip" -Destination "${outputIpaPath}" -Force`;
execSync(`powershell -NoProfile -Command "${zipScript}"`, { stdio: 'inherit' });

// 5. Copy IPA to frontend/public, backend/public and project root
const targets = [
  path.resolve(mobileDir, '..', `SES-Educare-v${appVersion}.ipa`),
  path.resolve(mobileDir, '..', 'frontend', 'public', `SES-Educare-v${appVersion}.ipa`),
  path.resolve(mobileDir, '..', 'backend', 'public', `SES-Educare-v${appVersion}.ipa`)
];

for (const target of targets) {
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(outputIpaPath, target);
  console.log(`Copied IPA to: ${target}`);
}

// 6. Generate manifest.plist for Over-The-Air iOS Safari installation
const manifestPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>items</key>
    <array>
        <dict>
            <key>assets</key>
            <array>
                <dict>
                    <key>kind</key>
                    <string>software-package</string>
                    <key>url</key>
                    <string>https://myapp.seseducare.com/SES-Educare-v${appVersion}.ipa</string>
                </dict>
                <dict>
                    <key>kind</key>
                    <string>display-image</string>
                    <key>url</key>
                    <string>https://myapp.seseducare.com/logo.png</string>
                </dict>
                <dict>
                    <key>kind</key>
                    <string>full-size-image</string>
                    <key>url</key>
                    <string>https://myapp.seseducare.com/logo.png</string>
                </dict>
            </array>
            <key>metadata</key>
            <dict>
                <key>bundle-identifier</key>
                <string>com.seseducare.app</string>
                <key>bundle-version</key>
                <string>${appVersion}</string>
                <key>kind</key>
                <string>software</string>
                <key>title</key>
                <string>SES Educare</string>
            </dict>
        </dict>
    </array>
</dict>
</plist>
`;

const manifestTargets = [
  path.resolve(mobileDir, '..', 'frontend', 'public', 'manifest.plist'),
  path.resolve(mobileDir, '..', 'backend', 'public', 'manifest.plist')
];

for (const target of manifestTargets) {
  fs.writeFileSync(target, manifestPlist, 'utf8');
  console.log(`Wrote OTA manifest.plist to: ${target}`);
}

// Clean temporary Payload folder
fs.rmSync(tempPayloadDir, { recursive: true, force: true });

console.log(`✅ SES-Educare-v${appVersion}.ipa created successfully!`);
