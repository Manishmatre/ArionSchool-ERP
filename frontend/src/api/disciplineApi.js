import api from './axios';

export const disciplineApi = {
  getRecords: (params) => api.get('/discipline', { params }),
  createRecord: (data) => api.post('/discipline', data),
  acknowledge: (id) => api.put(`/discipline/${id}/acknowledge`)
};

export default disciplineApi;
