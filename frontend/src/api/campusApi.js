import api from './axios';

// Get all campuses (with optional filtering)
export const getAllCampuses = async (params = {}) => {
  const response = await api.get('/campuses', { params });
  return response.data;
};

// Backwards compatibility alias
export const getAllFranchises = getAllCampuses;

// Get campus by ID
export const getCampus = async (id) => {
  const response = await api.get(`/campuses/${id}`);
  return response.data;
};

export const getFranchise = getCampus;

// Create new school campus
export const createCampus = async (campusData) => {
  const response = await api.post('/campuses', campusData);
  return response.data;
};

export const createFranchise = createCampus;

// Update campus
export const updateCampus = async (id, campusData) => {
  const response = await api.put(`/campuses/${id}`, campusData);
  return response.data;
};

export const updateFranchise = updateCampus;

// Delete campus
export const deleteCampus = async (id) => {
  const response = await api.delete(`/campuses/${id}`);
  return response.data;
};

export const deleteFranchise = deleteCampus;

// Update campus status
export const updateCampusStatus = async (id, status) => {
  const response = await api.put(`/campuses/${id}/status`, { status });
  return response.data;
};

export const updateFranchiseStatus = updateCampusStatus;
