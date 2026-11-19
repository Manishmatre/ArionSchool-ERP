import api from './axios';

const unwrap = (response) => response.data;

export const getTransactions = async (params = {}) => {
  const response = await api.get('/transactions', { params });
  return unwrap(response);
};

export const getTransaction = async (id) => {
  const response = await api.get(`/transactions/${id}`);
  return unwrap(response);
};

export const getTransactionStats = async (params = {}) => {
  const response = await api.get('/transactions/stats', { params });
  return unwrap(response);
};

export const getUnifiedPaymentHistory = async (params = {}) => {
  const response = await api.get('/transactions/unified', { params });
  return unwrap(response);
};

export const createTransaction = async (data) => {
  const response = await api.post('/transactions', data);
  return unwrap(response);
};

export const updateTransaction = async (id, data) => {
  const response = await api.put(`/transactions/${id}`, data);
  return unwrap(response);
};

export const deleteTransaction = async (id) => {
  const response = await api.delete(`/transactions/${id}`);
  return unwrap(response);
};

export const getFeePolicies = async (params = {}) => {
  const response = await api.get('/fee-policies', { params });
  return unwrap(response);
};

export const syncAllFeePolicies = async () => {
  const response = await api.post('/fee-policies/sync-all-courses');
  return unwrap(response);
};

export const getFeeObligations = async (params = {}) => {
  const response = await api.get('/fee-obligations', { params });
  return unwrap(response);
};

export const getStudentObligations = async (studentId) => {
  const response = await api.get(`/fee-obligations/student/${studentId}`);
  return unwrap(response);
};

export const reconcileStudentObligations = async (studentId) => {
  const response = await api.post(`/fee-obligations/reconcile/${studentId}`);
  return unwrap(response);
};
