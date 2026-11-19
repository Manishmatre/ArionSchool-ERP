import api from './axios';

export const academicExamApi = {
  getExams: (params) => api.get('/school-exams', { params }),
  createExam: (data) => api.post('/school-exams', data),
  getMarks: (params) => api.get('/school-exams/marks', { params }),
  saveBulkMarks: (data) => api.post('/school-exams/marks/bulk', data),
  getReportCard: (studentId, examId) => api.get(`/school-exams/report-card/${studentId}/${examId}`),
  generateSeatingPlan: (data) => api.post('/school-exams/seating-plan', data)
};

export default academicExamApi;
