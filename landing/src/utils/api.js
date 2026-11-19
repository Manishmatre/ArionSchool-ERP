export const getApiBaseUrl = () =>
  import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const getBackendOrigin = () => getApiBaseUrl().replace(/\/?api\/?$/, '');

// Resolve a stored image/file path to a fully-qualified URL.
// - Full URLs (Cloudinary https://, data URIs) are returned untouched.
// - Relative paths (/uploads/...) are prefixed with the backend origin.
export const toAbsoluteUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const origin = getBackendOrigin();
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const getCertificateImageUrl = (type, id) =>
  `${getApiBaseUrl()}/certificate/${type}/${id}/image`;
