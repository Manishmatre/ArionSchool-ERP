/**
 * Migrate legacy local template image paths to Cloudinary URLs.
 *
 * Usage:
 *   node scripts/migrateTemplateImagesToCloudinary.js
 *   node scripts/migrateTemplateImagesToCloudinary.js --dry-run
 *
 * Safe to re-run — skips records that already use Cloudinary/http URLs.
 */

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../config/db');
const StudentCertificateTemplate = require('../models/StudentCertificateTemplate');
const CertificateTemplate = require('../models/CertificateTemplate');
const IdCardTemplate = require('../models/IdCardTemplate');
const MarksheetTemplate = require('../models/MarksheetTemplate');
const {
  isCloudinaryUrl,
  isLocalStoredPath,
  resolveTemplateImage
} = require('../utils/cloudinary');

const DRY_RUN = process.argv.includes('--dry-run');

const TEMPLATE_MODELS = [
  { name: 'StudentCertificateTemplate', Model: StudentCertificateTemplate },
  { name: 'CertificateTemplate', Model: CertificateTemplate },
  { name: 'IdCardTemplate', Model: IdCardTemplate },
  { name: 'MarksheetTemplate', Model: MarksheetTemplate }
];

const log = (msg) => console.log(`[migrate-templates] ${msg}`);

const migrateModel = async ({ name, Model }) => {
  const templates = await Model.find({
    templateImage: { $exists: true, $nin: [null, ''] }
  }).select('_id name templateImage courseType targetType');

  let upgraded = 0;
  let skipped = 0;
  let missing = 0;

  for (const template of templates) {
    const current = template.templateImage;

    if (isCloudinaryUrl(current) || (typeof current === 'string' && current.startsWith('http'))) {
      skipped++;
      continue;
    }

    if (!isLocalStoredPath(current)) {
      log(`${name} ${template._id}: unrecognized path format — ${current}`);
      skipped++;
      continue;
    }

    const { source, persistUrl } = await resolveTemplateImage(current);
    const nextUrl = persistUrl || (source && (isCloudinaryUrl(source) || source.startsWith('http')) ? source : null);

    if (!nextUrl) {
      missing++;
      log(`${name} ${template._id}: NOT FOUND — ${current}`);
      continue;
    }

    if (DRY_RUN) {
      log(`${name} ${template._id}: would update ${current} -> ${nextUrl}`);
      upgraded++;
      continue;
    }

    await Model.findByIdAndUpdate(template._id, { templateImage: nextUrl });
    log(`${name} ${template._id}: updated -> ${nextUrl}`);
    upgraded++;
  }

  return { name, total: templates.length, upgraded, skipped, missing };
};

const main = async () => {
  await connectDB();
  log(DRY_RUN ? 'Dry run — no database writes' : 'Starting template image migration');

  const summaries = [];
  for (const entry of TEMPLATE_MODELS) {
    summaries.push(await migrateModel(entry));
  }

  log('--- Summary ---');
  for (const summary of summaries) {
    log(
      `${summary.name}: total=${summary.total}, upgraded=${summary.upgraded}, skipped=${summary.skipped}, missing=${summary.missing}`
    );
  }

  if (summaries.some((summary) => summary.missing > 0)) {
    log('Some templates were not found. Re-upload those template images in the admin panel.');
  }

  await mongoose.connection.close();
  process.exit(0);
};

main().catch(async (error) => {
  console.error('[migrate-templates] Failed:', error);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
