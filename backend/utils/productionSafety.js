/**
 * Central production safety flags for low-resource VPS deployments.
 * Defaults favor stability over features when NODE_ENV=production.
 */

const isProduction = () => process.env.NODE_ENV === 'production';

const envFlag = (name) => String(process.env[name] || '').toLowerCase() === 'true';

/**
 * Server-side PDF (html-pdf / PhantomJS) is OFF in production unless explicitly enabled.
 */
const isServerPdfDisabled = () => {
  if (envFlag('DISABLE_SERVER_PDF')) return true;
  if (isProduction() && !envFlag('ENABLE_SERVER_PDF')) return true;
  return false;
};

/**
 * Franchise cron scheduler is OFF unless ENABLE_FRANCHISE_SCHEDULER=true
 */
const isFranchiseSchedulerEnabled = () => envFlag('ENABLE_FRANCHISE_SCHEDULER');

/**
 * Socket.io real-time — can disable entirely on tiny VPS with DISABLE_SOCKET=true
 */
const isSocketEnabled = () => {
  if (envFlag('DISABLE_SOCKET')) return false;
  return true;
};

const applyProductionDefaults = () => {
  if (!isProduction()) return;

  if (!process.env.DISABLE_SERVER_PDF && !process.env.ENABLE_SERVER_PDF) {
    process.env.DISABLE_SERVER_PDF = 'true';
  }

  if (!process.env.ENABLE_FRANCHISE_SCHEDULER) {
    process.env.ENABLE_FRANCHISE_SCHEDULER = 'false';
  }
};

module.exports = {
  isProduction,
  isServerPdfDisabled,
  isFranchiseSchedulerEnabled,
  isSocketEnabled,
  applyProductionDefaults
};
