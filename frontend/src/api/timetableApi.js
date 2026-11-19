import api from './axios';

export const timetableApi = {
  getTimetable: (params) => api.get('/timetable', { params }),
  saveEntry: (data) => api.post('/timetable', data),
  deleteEntry: (id) => api.delete(`/timetable/${id}`),
  autoGenerate: (data) => api.post('/timetable/auto-generate', data)
};

export default timetableApi;
