/**
 * Central upload / request body size limits (bytes).
 * Override with MAX_UPLOAD_MB in .env (e.g. 50 or 100).
 */
const DEFAULT_MAX_MB = 50;

const parseMaxMb = () => {
  const raw = process.env.MAX_UPLOAD_MB;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_MAX_MB;
  return Math.min(parsed, 200);
};

const getMaxUploadBytes = () => parseMaxMb() * 1024 * 1024;

const getMaxUploadLimitString = () => `${parseMaxMb()}mb`;

module.exports = {
  getMaxUploadBytes,
  getMaxUploadLimitString,
  parseMaxMb
};
