import api from './axios';

// Get all certificates
export const getAllCertificates = async (params = {}) => {
  const response = await api.get('/certificates', { params });
  return response.data;
};

// Get single certificate
export const getCertificate = async (id) => {
  const response = await api.get(`/certificates/${id}`);
  return response.data;
};

// Generate certificate
export const generateCertificate = async (data) => {
  const response = await api.post('/certificates/generate', data);
  return response.data;
};

// Bulk generate certificates
export const bulkGenerateCertificates = async (data) => {
  const response = await api.post('/certificates/bulk-generate', data);
  return response.data;
};

// Verify certificate
export const verifyCertificate = async (code) => {
  const response = await api.get(`/certificates/verify/${code}`);
  return response.data;
};

// Download certificate
export const downloadCertificate = async (id) => {
  const response = await api.get(`/certificates/${id}/download`, {
    responseType: 'blob'
  });
  return response.data;
};

// Get student certificates
export const getStudentCertificates = async (studentId) => {
  const response = await api.get(`/certificates/student/${studentId}`);
  return response.data;
};

// Get current logged-in user's certificates
export const getMyCertificates = async () => {
  const response = await api.get('/certificates/mine');
  return response.data;
};

// Revoke certificate
export const revokeCertificate = async (id) => {
  const response = await api.put(`/certificates/${id}/revoke`);
  return response.data;
};

// Delete certificate
export const deleteCertificate = async (id) => {
  const response = await api.delete(`/certificates/${id}`);
  return response.data;
};

