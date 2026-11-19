import api from './axios';

export const homeworkApi = {
  getHomework: (params) => api.get('/homework', { params }),
  createHomework: (data) => api.post('/homework', data),
  deleteHomework: (id) => api.delete(`/homework/${id}`),
  getSubmissions: (homeworkId) => api.get(`/homework/${homeworkId}/submissions`),
  submitHomework: (data) => api.post('/homework/submit', data),
  evaluateSubmission: (id, data) => api.put(`/homework/submissions/${id}/evaluate`, data)
};

export default homeworkApi;
