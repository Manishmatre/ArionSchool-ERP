import api from './axios';

// Get all courses
export const getCourses = async (params = {}) => {
  const response = await api.get('/courses', { params });
  return response.data;
};

// Get single course
export const getCourse = async (id) => {
  const response = await api.get(`/courses/${id}`);
  return response.data;
};

// Create course
export const createCourse = async (data) => {
  const response = await api.post('/courses', data);
  return response.data;
};

// Update course
export const updateCourse = async (id, data) => {
  const response = await api.put(`/courses/${id}`, data);
  return response.data;
};

export const checkCourseDependencies = async (id) => {
  const response = await api.get(`/courses/${id}/check-dependencies`);
  return response.data;
};

// Delete course
export const deleteCourse = async (id, deleteAssociated = false) => {
  const response = await api.delete(`/courses/${id}`, {
    data: { deleteAssociated }
  });
  return response.data;
};
