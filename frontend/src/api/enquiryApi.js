import api from './axios';

// Get all enquiries
export const getAllEnquiries = async (params = {}) => {
  const response = await api.get('/enquiries', { params });
  return response.data;
};

// Get single enquiry
export const getEnquiry = async (id) => {
  const response = await api.get(`/enquiries/${id}`);
  return response.data;
};

// Create enquiry (public)
export const createEnquiry = async (data) => {
  const response = await api.post('/enquiries', data);
  return response.data;
};

// Update enquiry
export const updateEnquiry = async (id, data) => {
  const response = await api.put(`/enquiries/${id}`, data);
  return response.data;
};

// Delete enquiry
export const deleteEnquiry = async (id) => {
  const response = await api.delete(`/enquiries/${id}`);
  return response.data;
};

// Update enquiry status
export const updateEnquiryStatus = async (id, status) => {
  const response = await api.put(`/enquiries/${id}/status`, { status });
  return response.data;
};

// Assign enquiry
export const assignEnquiry = async (id, userId) => {
  const response = await api.put(`/enquiries/${id}/assign`, { userId });
  return response.data;
};

// Add follow-up
export const addFollowUp = async (id, data) => {
  const response = await api.post(`/enquiries/${id}/followup`, data);
  return response.data;
};

// Convert to student
export const convertToStudent = async (id, data) => {
  const response = await api.post(`/enquiries/${id}/convert`, data);
  return response.data;
};

// Get enquiry statistics
export const getEnquiryStats = async (params = {}) => {
  const response = await api.get('/enquiries/stats', { params });
  return response.data;
};

// Student course enrollment request
export const createStudentCourseRequest = async (data) => {
  const response = await api.post('/enquiries/student/course-request', data);
  return response.data;
};

// Get logged-in student's enquiries
export const getMyEnquiries = async () => {
  const response = await api.get('/enquiries/my');
  return response.data;
};

// Admin enroll student from enquiry
export const enrollStudentFromEnquiry = async (id, data = {}) => {
  const response = await api.post(`/enquiries/${id}/enroll-student`, data);
  return response.data;
};
