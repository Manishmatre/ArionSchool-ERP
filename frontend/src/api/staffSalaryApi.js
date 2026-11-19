import api from './axios';

export const generateSalary = async (data) => {
  const response = await api.post('/staff-salary/generate', data);
  return response.data;
};

export const getAllSalaries = async (params = {}) => {
  const response = await api.get('/staff-salary', { params });
  return response.data;
};

export const getSalary = async (id) => {
  const response = await api.get(`/staff-salary/${id}`);
  return response.data;
};

export const paySalary = async (id, data) => {
  const response = await api.put(`/staff-salary/${id}/pay`, data);
  return response.data;
};

export const getSalaryStats = async () => {
  const response = await api.get('/staff-salary/stats');
  return response.data;
};
