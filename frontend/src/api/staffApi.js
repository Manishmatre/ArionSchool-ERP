import api from './axios';

export const getAllStaff = async (params = {}) => {
  const response = await api.get('/staff', { params });
  return response.data;
};

export const getStaff = async (id) => {
  const response = await api.get(`/staff/${id}`);
  return response.data;
};

export const createStaff = async (data) => {
  const response = await api.post('/staff', data);
  return response.data;
};

export const updateStaff = async (id, data) => {
  const response = await api.put(`/staff/${id}`, data);
  return response.data;
};

export const deleteStaff = async (id) => {
  const response = await api.delete(`/staff/${id}`);
  return response.data;
};

export const updateStaffStatus = async (id, status) => {
  const response = await api.put(`/staff/${id}/status`, { status });
  return response.data;
};

export const markAttendance = async (id, data) => {
  const response = await api.post(`/staff/${id}/attendance`, data);
  return response.data;
};

export const applyLeave = async (id, data) => {
  const response = await api.post(`/staff/${id}/leave`, data);
  return response.data;
};

export const getStaffStats = async () => {
  const response = await api.get('/staff/stats');
  return response.data;
};

const staffApi = {
  getAllStaff,
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  updateStaffStatus,
  markAttendance,
  applyLeave,
  getStaffStats
};

export default staffApi;
