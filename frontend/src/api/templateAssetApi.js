import api from './axios';

export const getTemplateAssets = () => api.get('/template-assets');

export const uploadTemplateAsset = (formData) =>
  api.post('/template-assets/upload', formData);

export const deleteTemplateAsset = (assetKey) =>
  api.delete(`/template-assets/${assetKey}`);

export const updateCompanyDetails = (details) =>
  api.put('/template-assets/company-details', details);
