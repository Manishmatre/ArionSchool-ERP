import api from './axios';

export const getLatestAppVersion = async (platform = 'android') => {
  const response = await api.get(`/app-version/latest?platform=${platform}`);
  return response.data;
};

export const getAllAppVersions = async () => {
  const response = await api.get('/app-version');
  return response.data;
};

export const createAppVersion = async (formData) => {
  const isMultipart = formData instanceof FormData;
  const response = await api.post('/app-version', formData, {
    headers: isMultipart ? { 'Content-Type': 'multipart/form-data' } : {}
  });
  return response.data;
};

export const updateAppVersion = async (id, data) => {
  const response = await api.put(`/app-version/${id}`, data);
  return response.data;
};

export const setActiveAppVersion = async (id) => {
  const response = await api.put(`/app-version/${id}/set-active`);
  return response.data;
};

export const deleteAppVersion = async (id) => {
  const response = await api.delete(`/app-version/${id}`);
  return response.data;
};

export const trackAppDownload = async (platform = 'android') => {
  try {
    await api.post(`/app-version/track-download?platform=${platform}`);
  } catch (e) {
    // silently fail
  }
};
