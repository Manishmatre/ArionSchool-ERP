import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('arion_platform_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('arion_platform_token');
      localStorage.removeItem('arion_platform_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const platformApi = {
  // Auth
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),

  // Overview
  getOverview: () => api.get('/platform-admin/overview'),

  // Schools CRUD & Lifecycle
  getSchools: (params) => api.get('/platform-admin/schools', { params }),
  getSchoolById: (id) => api.get(`/platform-admin/schools/${id}`),
  provisionSchool: (data) => api.post('/platform-admin/schools', data),
  updateSchool: (id, data) => api.put(`/platform-admin/schools/${id}`, data),
  updateSchoolStatus: (id, data) => api.patch(`/platform-admin/schools/${id}/status`, data),
  updateSchoolFeatures: (id, enabledModules) => api.patch(`/platform-admin/schools/${id}/features`, { enabledModules }),
  resetSchoolPassword: (id, newPassword) => api.post(`/platform-admin/schools/${id}/reset-password`, { newPassword }),
  impersonateSchool: (id) => api.post(`/platform-admin/schools/${id}/impersonate`),
  deleteSchool: (id) => api.delete(`/platform-admin/schools/${id}`),

  // Subscription Plans CRUD
  getPlans: () => api.get('/platform-admin/plans'),
  createPlan: (data) => api.post('/platform-admin/plans', data),
  updatePlan: (id, data) => api.put(`/platform-admin/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/platform-admin/plans/${id}`),

  // Subscriptions & Invoices
  getSubscriptions: () => api.get('/platform-admin/subscriptions'),
  updateSubscription: (schoolId, data) => api.put(`/platform-admin/subscriptions/${schoolId}`, data),
  recordInvoice: (schoolId, data) => api.post(`/platform-admin/subscriptions/${schoolId}/invoices`, data),
  getInvoices: () => api.get('/platform-admin/invoices'),

  // Domains
  getDomains: () => api.get('/platform-admin/domains'),
  updateDomain: (schoolId, data) => api.put(`/platform-admin/domains/${schoolId}`, data),

  // Leads CRM
  getLeads: (params) => api.get('/platform-admin/leads', { params }),
  createLead: (data) => api.post('/platform-admin/leads', data),
  updateLead: (id, data) => api.put(`/platform-admin/leads/${id}`, data),
  deleteLead: (id) => api.delete(`/platform-admin/leads/${id}`),
  convertLead: (id, data = {}) => api.post(`/platform-admin/leads/${id}/convert`, data),

  // Global Users & Company Team CRUD
  getUsers: (params) => api.get('/platform-admin/users', { params }),
  createUser: (data) => api.post('/platform-admin/users', data),
  updateUser: (id, data) => api.put(`/platform-admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/platform-admin/users/${id}`),

  // Broadcasts & Global System Config
  getBroadcasts: () => api.get('/platform-admin/broadcasts'),
  createBroadcast: (data) => api.post('/platform-admin/broadcast', data),
  deleteBroadcast: (id) => api.delete(`/platform-admin/broadcasts/${id}`),
  getConfig: () => api.get('/platform-admin/config'),
  updateConfig: (data) => api.put('/platform-admin/config', data),

  // Audit & AI Telemetry
  getAuditLogs: () => api.get('/platform-admin/audit-logs'),
  getAiTelemetry: () => api.get('/platform-admin/ai-usage')
};

export default api;
