import api from './axios';

export const getWebsiteSettings = () => api.get('/website/settings');

export const updateWebsiteSettings = (settings) => api.put('/website/settings', settings);

export const uploadLogo = (formData) => api.post('/website/settings/logo', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});

export const uploadFavicon = (formData) => api.post('/website/settings/favicon', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});
