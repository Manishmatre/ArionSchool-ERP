import api from './axios';

// Get all admissions
export const getAllAdmissions = async (params = {}) => {
  const response = await api.get('/admissions', { params });
  return response.data;
};

// Get single admission
export const getAdmission = async (id) => {
  const response = await api.get(`/admissions/${id}`);
  return response.data;
};

// Create admission (public - for website form)
export const createAdmission = async (data) => {
  const response = await api.post('/admissions', data);
  return response.data;
};

// Update admission
export const updateAdmission = async (id, data) => {
  const response = await api.put(`/admissions/${id}`, data);
  return response.data;
};

// Delete admission
export const deleteAdmission = async (id) => {
  const response = await api.delete(`/admissions/${id}`);
  return response.data;
};

// Add note to admission
export const addNote = async (id, data) => {
  const response = await api.post(`/admissions/${id}/notes`, data);
  return response.data;
};

// Convert admission to student
export const convertToStudent = async (id, data) => {
  const response = await api.post(`/admissions/${id}/convert`, data);
  return response.data;
};

// Get admission statistics
export const getAdmissionStats = async (params = {}) => {
  const response = await api.get('/admissions/stats', { params });
  return response.data;
};
