import api from './axios';

// Get all student certificate templates
export const getStudentCertificateTemplates = async () => {
  const response = await api.get('/student-certificates/templates');
  return response.data;
};

// Create student certificate template
export const createStudentCertificateTemplate = async (templateData) => {
  const response = await api.post('/student-certificates/templates', templateData);
  return response.data;
};

// Update student certificate template
export const updateStudentCertificateTemplate = async (id, templateData) => {
  const response = await api.put(`/student-certificates/templates/${id}`, templateData);
  return response.data;
};

// Delete student certificate template
export const deleteStudentCertificateTemplate = async (id) => {
  const response = await api.delete(`/student-certificates/templates/${id}`);
  return response.data;
};

// Generate student certificate
export const generateStudentCertificate = async (studentId, data) => {
  const response = await api.post(`/student-certificates/generate/${studentId}`, data);
  return response.data;
};

// Batch generate student certificates
export const batchGenerateStudentCertificates = async (studentIds, courseId, options = {}) => {
  const response = await api.post('/student-certificates/batch-generate', {
    studentIds,
    courseId,
    ...options
  });
  return response.data;
};

// Download student certificate
export const downloadStudentCertificate = async (studentId, templateId, filename) => {
  const response = await api.post(`/student-certificates/generate/${studentId}`, {
    templateId
  }, {
    responseType: 'blob'
  });
  
  // Create download link
  const blob = new Blob([response.data], { type: 'image/png' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `Certificate_${studentId}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  
  return response;
};

// Get all generated student certificates
export const getGeneratedStudentCertificates = async (params = {}) => {
  const response = await api.get('/student-certificates/generated', { params });
  return response.data;
};

// Download generated student certificate by ID
export const downloadGeneratedStudentCertificate = async (certificateId, filename) => {
  const response = await api.get(`/student-certificates/download/${certificateId}`, {
    responseType: 'blob'
  });
  
  const blob = new Blob([response.data], { type: 'image/png' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `Certificate.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Get student certificate blob URL for preview
export const getStudentCertificateBlobUrl = async (certificateId) => {
  const response = await api.get(`/student-certificates/preview/${certificateId}`, {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  return url;
};

// Delete student certificate
export const deleteStudentCertificate = async (certificateId) => {
  const response = await api.delete(`/student-certificates/${certificateId}`);
  return response.data;
};
