import api from './axios';

export const leaveApi = {
  getLeaves: (params) => api.get('/leaves', { params }),
  applyLeave: (data) => api.post('/leaves/apply', data),
  reviewLeave: (id, data) => api.put(`/leaves/${id}/review`, data)
};

export default leaveApi;
