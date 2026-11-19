import api from './axios';

export const schoolCertificateApi = {
  getCertificates: (params) => api.get('/school-certificates', { params }),
  issueCertificate: (data) => api.post('/school-certificates/issue', data),
  getCertificateById: (id) => api.get(`/school-certificates/${id}`)
};

export default schoolCertificateApi;
