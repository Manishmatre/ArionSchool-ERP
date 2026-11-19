import api from './axios';

export const schoolSurveyApi = {
  getSurveys: (params) => api.get('/school-surveys', { params }),
  createSurvey: (data) => api.post('/school-surveys', data),
  respond: (id, data) => api.post(`/school-surveys/${id}/respond`, data)
};

export default schoolSurveyApi;
