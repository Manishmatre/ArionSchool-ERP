import api from './axios';

// Get all images
export const getAllImages = async (params = {}) => {
  const response = await api.get('/gallery', { params });
  return response.data;
};

// Get single image
export const getImage = async (id) => {
  const response = await api.get(`/gallery/${id}`);
  return response.data;
};

// Upload image
export const uploadImage = async (formData) => {
  const response = await api.post('/gallery', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Upload multiple images
export const uploadMultipleImages = async (formData) => {
  const response = await api.post('/gallery/bulk', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Update image (data can be FormData when replacing the image file)
export const updateImage = async (id, data) => {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  const response = await api.put(`/gallery/${id}`, data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return response.data;
};

// Delete image
export const deleteImage = async (id) => {
  const response = await api.delete(`/gallery/${id}`);
  return response.data;
};

// Toggle image status
export const toggleImageStatus = async (id) => {
  const response = await api.put(`/gallery/${id}/toggle`);
  return response.data;
};

// Get images by category
export const getImagesByCategory = async (category) => {
  const response = await api.get(`/gallery/category/${category}`);
  return response.data;
};

// Get gallery statistics
export const getGalleryStats = async () => {
  const response = await api.get('/gallery/stats/all');
  return response.data;
};
