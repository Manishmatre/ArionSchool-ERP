import api from './axios';

export const requestAdvance = async (data) => {
  const response = await api.post('/advance-payment', data);
  return response.data;
};

export const getAllAdvances = async (params = {}) => {
  const response = await api.get('/advance-payment', { params });
  return response.data;
};

export const getAdvance = async (id) => {
  const response = await api.get(`/advance-payment/${id}`);
  return response.data;
};

export const approveAdvance = async (id, data) => {
  const response = await api.put(`/advance-payment/${id}/approve`, data);
  return response.data;
};

export const payAdvance = async (id, data) => {
  const response = await api.put(`/advance-payment/${id}/pay`, data);
  return response.data;
};

export const getAdvanceStats = async () => {
  const response = await api.get('/advance-payment/stats');
  return response.data;
};
