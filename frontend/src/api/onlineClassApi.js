import api from './axios';

// Get all online classes
export const getAllOnlineClasses = async (params = {}) => {
  const response = await api.get('/online-classes', { params });
  return response.data;
};

// Get single online class
export const getOnlineClass = async (id) => {
  const response = await api.get(`/online-classes/${id}`);
  return response.data;
};

// Create online class
export const createOnlineClass = async (data) => {
  const response = await api.post('/online-classes', data);
  return response.data;
};

// Update online class
export const updateOnlineClass = async (id, data) => {
  const response = await api.put(`/online-classes/${id}`, data);
  return response.data;
};

// Delete online class
export const deleteOnlineClass = async (id) => {
  const response = await api.delete(`/online-classes/${id}`);
  return response.data;
};

// Join online class
export const joinOnlineClass = async (id) => {
  const response = await api.post(`/online-classes/${id}/join`);
  return response.data;
};

// Leave online class
export const leaveOnlineClass = async (id) => {
  const response = await api.post(`/online-classes/${id}/leave`);
  return response.data;
};

// Start online class
export const startOnlineClass = async (id) => {
  const response = await api.put(`/online-classes/${id}/start`);
  return response.data;
};

// End online class
export const endOnlineClass = async (id) => {
  const response = await api.put(`/online-classes/${id}/end`);
  return response.data;
};

// Get my online classes (for students)
export const getMyOnlineClasses = async () => {
  const response = await api.get('/online-classes/my');
  return response.data;
};

// Add material to an online class
export const addClassMaterial = async (classId, formData) => {
  const response = await api.post(`/online-classes/${classId}/materials`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};
