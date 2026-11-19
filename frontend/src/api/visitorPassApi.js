import api from './axios';

export const visitorPassApi = {
  getPasses: (params) => api.get('/visitor-pass', { params }),
  createPass: (data) => api.post('/visitor-pass', data),
  checkoutPass: (id) => api.put(`/visitor-pass/${id}/checkout`)
};

export default visitorPassApi;
