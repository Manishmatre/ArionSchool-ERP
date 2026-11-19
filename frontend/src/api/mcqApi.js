import api from './axios';

export const getMCQs = async (params = {}) => {
  const response = await api.get('/mcqs', { params });
  return response.data;
};

export const getMCQStats = async (courseId) => {
  const response = await api.get('/mcqs/stats', { params: { course: courseId } });
  return response.data;
};

export const getMCQ = async (id) => {
  const response = await api.get(`/mcqs/${id}`);
  return response.data;
};

export const createMCQ = async (data) => {
  const response = await api.post('/mcqs', data);
  return response.data;
};

export const updateMCQ = async (id, data) => {
  const response = await api.put(`/mcqs/${id}`, data);
  return response.data;
};

export const deleteMCQ = async (id) => {
  const response = await api.delete(`/mcqs/${id}`);
  return response.data;
};

export const duplicateMCQ = async (id) => {
  const response = await api.post(`/mcqs/${id}/duplicate`);
  return response.data;
};

export const bulkCreateMCQs = async (data) => {
  const response = await api.post('/mcqs/bulk', data);
  return response.data;
};

