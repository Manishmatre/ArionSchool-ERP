import api from './axios';

// Modules API
export const getModules = async (params = {}) => {
  const response = await api.get('/modules', { params });
  return response.data;
};

export const getModule = async (id) => {
  const response = await api.get(`/modules/${id}`);
  return response.data;
};

export const createModule = async (data) => {
  const response = await api.post('/modules', data);
  return response.data;
};

export const updateModule = async (id, data) => {
  const response = await api.put(`/modules/${id}`, data);
  return response.data;
};

export const deleteModule = async (id) => {
  const response = await api.delete(`/modules/${id}`);
  return response.data;
};

export const reorderModules = async (orderedIds) => {
  const response = await api.put('/modules/reorder', { orderedIds });
  return response.data;
};

export const duplicateModule = async (id) => {
  const response = await api.post(`/modules/${id}/duplicate`);
  return response.data;
};

// Lessons API
export const getLessons = async (params = {}) => {
  const response = await api.get('/lessons', { params });
  return response.data;
};

export const getLesson = async (id) => {
  const response = await api.get(`/lessons/${id}`);
  return response.data;
};

export const createLesson = async (data) => {
  const response = await api.post('/lessons', data);
  return response.data;
};

export const updateLesson = async (id, data) => {
  const response = await api.put(`/lessons/${id}`, data);
  return response.data;
};

export const deleteLesson = async (id) => {
  const response = await api.delete(`/lessons/${id}`);
  return response.data;
};

export const moveLesson = async (id, targetModuleId) => {
  const response = await api.put(`/lessons/${id}/move`, { targetModuleId });
  return response.data;
};

export const duplicateLesson = async (id) => {
  const response = await api.post(`/lessons/${id}/duplicate`);
  return response.data;
};

export const reorderLessons = async (orderedIds) => {
  const response = await api.put('/lessons/reorder', { orderedIds });
  return response.data;
};

export const uploadLessonMedia = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/lessons/upload-media', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress
  });
  return response.data;
};

