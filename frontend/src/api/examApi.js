import api from './axios';

export const getExams = async (params = {}) => {
  const response = await api.get('/exams', { params });
  return response.data;
};

export const getExam = async (id) => {
  const response = await api.get(`/exams/${id}`);
  return response.data;
};

export const createExam = async (data) => {
  const response = await api.post('/exams', data);
  return response.data;
};

export const updateExam = async (id, data) => {
  const response = await api.put(`/exams/${id}`, data);
  return response.data;
};

export const deleteExam = async (id) => {
  const response = await api.delete(`/exams/${id}`);
  return response.data;
};

export const copyExam = async (id) => {
  const response = await api.post(`/exams/${id}/copy`);
  return response.data;
};

export const validateGeneration = async (data) => {
  const response = await api.post('/exams/validate-generation', data);
  return response.data;
};

export const generateExamDraft = async (data) => {
  const response = await api.post('/exams/generate-draft', data);
  return response.data;
};

export const replaceQuestion = async (data) => {
  const response = await api.post('/exams/replace-question', data);
  return response.data;
};

export const saveExamProgress = async (examId, data) => {
  const response = await api.post(`/exams/student/${examId}/save-progress`, data);
  return response.data;
};

