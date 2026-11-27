import api from './axios';

export const brandingApi = {
  // Public tenant branding lookup
  getPublicBranding: (params) => api.get('/branding/public', { params }),

  // Authenticated tenant branding
  getCurrentBranding: () => api.get('/branding/current'),

  // Save/Update branding
  updateBranding: (data) => api.put('/branding', data),

  // Reset to default Arion School branding
  resetBranding: () => api.post('/branding/reset'),

  // Upload logo or favicon asset
  uploadAsset: (formData) => api.post('/branding/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

export default brandingApi;

