import api from './axios';

export const academicApi = {
  // Academic Sessions
  getSessions: (params) => api.get('/academics/sessions', { params }),
  createSession: (data) => api.post('/academics/sessions', data),
  updateSession: (id, data) => api.put(`/academics/sessions/${id}`, data),
  deleteSession: (id) => api.delete(`/academics/sessions/${id}`),

  // School Classes
  getClasses: (params) => api.get('/academics/classes', { params }),
  createClass: (data) => api.post('/academics/classes', data),
  updateClass: (id, data) => api.put(`/academics/classes/${id}`, data),
  deleteClass: (id) => api.delete(`/academics/classes/${id}`),

  // Sections
  getSections: (params) => api.get('/academics/sections', { params }),
  createSection: (data) => api.post('/academics/sections', data),
  updateSection: (id, data) => api.put(`/academics/sections/${id}`, data),
  deleteSection: (id) => api.delete(`/academics/sections/${id}`),

  // Subjects
  getSubjects: (params) => api.get('/academics/subjects', { params }),
  createSubject: (data) => api.post('/academics/subjects', data),
  updateSubject: (id, data) => api.put(`/academics/subjects/${id}`, data),
  deleteSubject: (id) => api.delete(`/academics/subjects/${id}`),

  // Houses
  getHouses: (params) => api.get('/academics/houses', { params }),
  createHouse: (data) => api.post('/academics/houses', data),
  updateHouse: (id, data) => api.put(`/academics/houses/${id}`, data),
  deleteHouse: (id) => api.delete(`/academics/houses/${id}`),

  // Quick Seed School Defaults
  seedSchoolDefaults: (data) => api.post('/academics/seed-defaults', data)
};

export default academicApi;
