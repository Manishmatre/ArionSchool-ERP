import api from './axios';

export const schoolFeeApi = {
  getStructures: (params) => api.get('/school-fees/structures', { params }),
  saveStructure: (data) => api.post('/school-fees/structures', data),
  getStudentFees: (studentId) => api.get(`/school-fees/student/${studentId}`),
  collectFee: (data) => api.post('/school-fees/collect', data),
  getDefaulters: (params) => api.get('/school-fees/defaulters', { params }),
  createConcession: (data) => api.post('/school-fees/concessions', data),
  getDailyReport: (params) => api.get('/school-fees/reports/daily-collection', { params })
};

export default schoolFeeApi;
