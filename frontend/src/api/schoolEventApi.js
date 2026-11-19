import api from './axios';

export const schoolEventApi = {
  getEvents: (params) => api.get('/school-events', { params }),
  createEvent: (data) => api.post('/school-events', data),
  deleteEvent: (id) => api.delete(`/school-events/${id}`)
};

export default schoolEventApi;
