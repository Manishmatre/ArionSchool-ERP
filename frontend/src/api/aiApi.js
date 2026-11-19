import api from './axios';

export const aiAssistantChat = (data) => api.post('/ai/assistant/chat', data);
export const getAiConversations = () => api.get('/ai/assistant/conversations');
export const getAiConversationById = (id) => api.get(`/ai/assistant/conversations/${id}`);
export const deleteAiConversation = (id) => api.delete(`/ai/assistant/conversations/${id}`);
export const clearAiConversation = (id) => api.post(`/ai/assistant/conversations/${id}/clear`);

export const getDashboardAiInsights = (params) => api.get('/ai/insights/dashboard', { params });
export const getStudentAiSummary = (studentId) => api.get(`/ai/student/summary/${studentId}`);

export const generateLessonPlan = (data) => api.post('/ai/teacher/lesson-plan', data);
export const generateQuestions = (data) => api.post('/ai/teacher/questions', data);
export const generateCommunicationDraft = (data) => api.post('/ai/communication/draft', data);

export const getAiUsageStats = () => api.get('/ai/usage/stats');
export const getAiConfig = () => api.get('/ai/config');

export default {
  aiAssistantChat,
  getAiConversations,
  getAiConversationById,
  deleteAiConversation,
  clearAiConversation,
  getDashboardAiInsights,
  getStudentAiSummary,
  generateLessonPlan,
  generateQuestions,
  generateCommunicationDraft,
  getAiUsageStats,
  getAiConfig
};
