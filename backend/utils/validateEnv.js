const { isProduction, isServerPdfDisabled, isFranchiseSchedulerEnabled } = require('./productionSafety');

const validateEnv = () => {
  const warnings = [];
  const errors = [];

  if (!process.env.MONGODB_URI) {
    errors.push('MONGODB_URI is missing');
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    warnings.push('JWT_SECRET is missing or too short');
  }

  if (isProduction()) {
    if (!isServerPdfDisabled()) {
      warnings.push('ENABLE_SERVER_PDF is on in production — html-pdf uses heavy CPU');
    }

    if (isFranchiseSchedulerEnabled()) {
      warnings.push('ENABLE_FRANCHISE_SCHEDULER=true — cron jobs add background load');
    }

    if (process.env.PM2_INSTANCES && Number(process.env.PM2_INSTANCES) > 1) {
      warnings.push(`PM2_INSTANCES=${process.env.PM2_INSTANCES} — use 1 instance on single-core VPS`);
    }
  }

  errors.forEach((msg) => console.error(`[env] ERROR: ${msg}`));
  warnings.forEach((msg) => console.warn(`[env] WARNING: ${msg}`));

  if (errors.length > 0 && isProduction()) {
    console.error('[env] Fix environment errors before running in production');
    process.exit(1);
  }

  return { errors, warnings };
};

module.exports = validateEnv;
