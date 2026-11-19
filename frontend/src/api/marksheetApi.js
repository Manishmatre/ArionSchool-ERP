import api from './axios';

export const getMarksheetTemplates = () => api.get('/marksheets/templates');
export const createMarksheetTemplate = (templateData) => api.post('/marksheets/templates', templateData);
export const updateMarksheetTemplate = (id, templateData) => api.put(`/marksheets/templates/${id}`, templateData);
export const deleteMarksheetTemplate = (id) => api.delete(`/marksheets/templates/${id}`);
export const generateMarksheet = (studentId, marksheetData) => api.post(`/marksheets/generate/${studentId}`, marksheetData);
export const renderMarksheetPreview = (previewData) => api.post('/marksheets/render-preview', previewData, { responseType: 'blob' });

export const getGeneratedMarksheets = (params = {}) => api.get('/marksheets/generated', { params });
export const downloadMarksheet = (id) => api.get(`/marksheets/download/${id}`, { responseType: 'blob' });
export const deleteMarksheet = (id) => api.delete(`/marksheets/${id}`);
export const getMarksheetBlobUrl = (id) => api.get(`/marksheets/preview/${id}`, { responseType: 'blob' });
export const getMyMarksheets = () => api.get('/marksheets/my');

// Fetch student exam results by course for marksheet generation
export const getStudentExamResultsByCourse = (studentId, courseId) => api.get(`/exams/student/${studentId}/course/${courseId}/results`);
