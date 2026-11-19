import api from './axios';

// Get all payments
export const getAllPayments = async (params = {}) => {
  const response = await api.get('/payments', { params });
  return response.data;
};

// Get single payment
export const getPayment = async (id) => {
  const response = await api.get(`/payments/${id}`);
  return response.data;
};

// Create offline payment
export const createOfflinePayment = async (data) => {
  const response = await api.post('/payments/offline', data);
  return response.data;
};

// Create payment order (online)
export const createPaymentOrder = async (data) => {
  const response = await api.post('/payments/create-order', data);
  return response.data;
};

// Verify payment
export const verifyPayment = async (data) => {
  const response = await api.post('/payments/verify', data);
  return response.data;
};

// Get student payments
export const getStudentPayments = async (studentId) => {
  const response = await api.get(`/payments/student/${studentId}`);
  return response.data;
};

// Download receipt
export const downloadReceipt = async (id) => {
  const response = await api.get(`/payments/${id}/receipt`, {
    responseType: 'blob'
  });
  return response.data;
};

// Get payment statistics
export const getPaymentStats = async (params = {}) => {
  const response = await api.get('/payments/stats', { params });
  return response.data;
};

// Update payment
export const updatePayment = async (id, data) => {
  const response = await api.put(`/payments/${id}`, data);
  return response.data;
};

// Delete payment
export const deletePayment = async (id) => {
  const response = await api.delete(`/payments/${id}`);
  return response.data;
};
