import api from './axios';

// Generate ID card for a single student
export const generateIdCard = async (studentId, templateId = null, customFieldValues = {}) => {
  const response = await api.post(`/id-cards/generate/${studentId}`, { templateId, customFieldValues });
  return response.data;
};

// Generate ID cards for multiple students (batch)
export const batchGenerateIdCards = async (studentIds, templateId = null) => {
  const response = await api.post('/id-cards/batch-generate', { studentIds, templateId });
  return response.data;
};

// Get all ID card templates
export const getIdCardTemplates = async () => {
  const response = await api.get('/id-cards/templates');
  return response.data;
};

// Get single ID card template
export const getIdCardTemplate = async (templateId) => {
  const response = await api.get(`/id-cards/templates/${templateId}`);
  return response.data;
};

// Create new ID card template
export const createIdCardTemplate = async (templateData) => {
  const response = await api.post('/id-cards/templates', templateData);
  return response.data;
};

// Update ID card template
export const updateIdCardTemplate = async (templateId, templateData) => {
  const response = await api.put(`/id-cards/templates/${templateId}`, templateData);
  return response.data;
};

// Delete ID card template
export const deleteIdCardTemplate = async (templateId) => {
  const response = await api.delete(`/id-cards/templates/${templateId}`);
  return response.data;
};

// Get all generated ID cards
export const getGeneratedIdCards = async (page = 1, limit = 20, search = '') => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (search) {
    params.append('search', search);
  }
  
  const response = await api.get(`/id-cards/generated?${params}`);
  return response.data;
};

// Download a generated ID card
export const downloadIdCard = async (cardId, filename) => {
  const response = await api.get(`/id-cards/download/${cardId}`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
};

// Get ID card image as a blob URL for preview
export const getIdCardBlobUrl = async (cardId) => {
  const response = await api.get(`/id-cards/download/${cardId}`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  return url;
};

// Delete a generated ID card
export const deleteIdCard = async (cardId) => {
  const response = await api.delete(`/id-cards/${cardId}`);
  return response.data;
};
