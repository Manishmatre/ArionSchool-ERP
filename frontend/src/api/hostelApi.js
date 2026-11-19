import api from './axios';

export const hostelApi = {
  getBuildings: (params) => api.get('/hostel/buildings', { params }),
  createBuilding: (data) => api.post('/hostel/buildings', data),
  getRooms: (params) => api.get('/hostel/rooms', { params }),
  createRoom: (data) => api.post('/hostel/rooms', data),
  getAllocations: (params) => api.get('/hostel/allocations', { params }),
  allocateBed: (data) => api.post('/hostel/allocations', data),
  vacateBed: (id) => api.post(`/hostel/allocations/${id}/vacate`)
};

export default hostelApi;
