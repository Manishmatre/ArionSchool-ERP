import api from './axios';

export const markAttendance = async (data) => {
  const response = await api.post('/staff-attendance', data);
  return response.data;
};

export const getAttendance = async (params = {}) => {
  const response = await api.get('/staff-attendance', { params });
  return response.data;
};

export const updateAttendance = async (id, data) => {
  const response = await api.put(`/staff-attendance/${id}`, data);
  return response.data;
};

export const getAttendanceSummary = async (params) => {
  const response = await api.get('/staff-attendance/summary', { params });
  return response.data;
};
