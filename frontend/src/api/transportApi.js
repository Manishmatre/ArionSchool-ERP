import api from './axios';

export const transportApi = {
  getVehicles: (params) => api.get('/transport/vehicles', { params }),
  createVehicle: (data) => api.post('/transport/vehicles', data),
  updateVehicle: (id, data) => api.put(`/transport/vehicles/${id}`, data),
  getRoutes: (params) => api.get('/transport/routes', { params }),
  createRoute: (data) => api.post('/transport/routes', data),
  getLiveFleet: () => api.get('/transport/live-fleet'),
  sendTelemetry: (data) => api.post('/transport/telemetry', data)
};

export default transportApi;
