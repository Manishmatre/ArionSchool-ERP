const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');

async function syncDb() {
  try {
    const appJsonPath = path.join(__dirname, '..', '..', 'mobile', 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    const versionName = appJson.expo?.version || '1.0.7';
    const versionCode = appJson.expo?.android?.versionCode || 8;
    const apkFileName = `SES-Educare-v${versionName}.apk`;
    const ipaFileName = `SES-Educare-v${versionName}.ipa`;

    console.log(`Synchronizing DB AppVersion to v${versionName} (Build #${versionCode})...`);

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    const AppVersion = require('../models/AppVersion');

    // 1. Android
    let androidDoc = await AppVersion.findOne({ platform: 'android', versionCode });
    if (!androidDoc) {
      androidDoc = await AppVersion.findOne({ platform: 'android', versionName });
    }

    if (androidDoc) {
      androidDoc.versionName = versionName;
      androidDoc.versionCode = versionCode;
      androidDoc.apkUrl = `/${apkFileName}`;
      androidDoc.fileSize = '39.8 MB';
      androidDoc.isActive = true;
      androidDoc.releaseNotes = `Official Release v${versionName}: Direct Google Sign-In with account selector, centered QR attendance scanner, and instant phone alert notifications.`;
      await androidDoc.save();
    } else {
      androidDoc = await AppVersion.create({
        platform: 'android',
        versionName,
        versionCode,
        apkUrl: `/${apkFileName}`,
        fileSize: '39.8 MB',
        releaseNotes: `Official Release v${versionName}: Direct Google Sign-In with account selector, centered QR attendance scanner, and instant phone alert notifications.`,
        isMandatory: false,
        isActive: true,
        downloadCount: 0
      });
    }

    // Deactivate all older Android versions and update their download URLs
    await AppVersion.updateMany(
      { platform: 'android', _id: { $ne: androidDoc._id } },
      { $set: { isActive: false, apkUrl: `/${apkFileName}` } }
    );
    console.log(`✅ Android AppVersion synchronized to v${versionName} (Build #${versionCode})`);

    // 2. iOS
    let iosDoc = await AppVersion.findOne({ platform: 'ios', versionCode });
    if (!iosDoc) {
      iosDoc = await AppVersion.findOne({ platform: 'ios', versionName });
    }

    if (iosDoc) {
      iosDoc.versionName = versionName;
      iosDoc.versionCode = versionCode;
      iosDoc.apkUrl = `/${ipaFileName}`;
      iosDoc.fileSize = '4.7 MB';
      iosDoc.isActive = true;
      iosDoc.releaseNotes = `Official iOS Release v${versionName}`;
      await iosDoc.save();
    } else {
      iosDoc = await AppVersion.create({
        platform: 'ios',
        versionName,
        versionCode,
        apkUrl: `/${ipaFileName}`,
        fileSize: '4.7 MB',
        releaseNotes: `Official iOS Release v${versionName}`,
        isMandatory: false,
        isActive: true,
        downloadCount: 0
      });
    }

    await AppVersion.updateMany(
      { platform: 'ios', _id: { $ne: iosDoc._id } },
      { $set: { isActive: false, apkUrl: `/${ipaFileName}` } }
    );
    console.log(`✅ iOS AppVersion synchronized to v${versionName} (Build #${versionCode})`);

    const allDocs = await AppVersion.find({});
    console.log('Current DB state:');
    allDocs.forEach(d => {
      console.log(`- ${d.platform} v${d.versionName} (${d.versionCode}) active=${d.isActive} url=${d.apkUrl}`);
    });

  } catch (err) {
    console.error('Error during DB sync:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

syncDb();
