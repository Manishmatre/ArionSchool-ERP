import api from './axios';

// Get all attendance
export const getAllAttendance = async (params = {}) => {
  const response = await api.get('/attendance', { params });
  return response.data;
};

// Get student attendance
export const getStudentAttendance = async (studentId, params = {}) => {
  const response = await api.get(`/attendance/student/${studentId}`, { params });
  return response.data;
};

// Mark attendance
export const markAttendance = async (data) => {
  const response = await api.post('/attendance', data);
  return response.data;
};

// Bulk mark attendance
export const bulkMarkAttendance = async (data) => {
  const response = await api.post('/attendance/bulk', data);
  return response.data;
};

// Update attendance
export const updateAttendance = async (id, data) => {
  const response = await api.put(`/attendance/${id}`, data);
  return response.data;
};

// Delete attendance
export const deleteAttendance = async (id) => {
  const response = await api.delete(`/attendance/${id}`);
  return response.data;
};

// Get attendance statistics
export const getAttendanceStats = async (params = {}) => {
  const response = await api.get('/attendance/stats', { params });
  return response.data;
};

// Generate attendance QR for institute
export const generateAttendanceQR = async (params = {}) => {
  const response = await api.get('/attendance/qr/generate', { params });
  return response.data;
};

