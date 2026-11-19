import api from './axios';

export const getAllBatches = async (params = {}) => {
  const response = await api.get('/batches', { params });
  return response.data;
};

export const getBatch = async (id) => {
  const response = await api.get(`/batches/${id}`);
  return response.data;
};

export const getBatchById = async (id) => {
  const response = await api.get(`/batches/${id}`);
  return response.data;
};

export const createBatch = async (data) => {
  const response = await api.post('/batches', data);
  return response.data;
};

export const updateBatch = async (id, data) => {
  const response = await api.put(`/batches/${id}`, data);
  return response.data;
};

export const deleteBatch = async (id) => {
  const response = await api.delete(`/batches/${id}`);
  return response.data;
};

export const addStudentToBatch = async (batchId, studentId) => {
  const response = await api.post(`/batches/${batchId}/students`, { studentId });
  return response.data;
};

export const removeStudentFromBatch = async (batchId, studentId) => {
  const response = await api.delete(`/batches/${batchId}/students/${studentId}`);
  return response.data;
};

export const getBatchStats = async () => {
  const response = await api.get('/batches/stats');
  return response.data;
};
