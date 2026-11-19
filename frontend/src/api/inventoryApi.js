import api from './axios';

export const inventoryApi = {
  getItems: (params) => api.get('/inventory/items', { params }),
  createItem: (data) => api.post('/inventory/items', data),
  updateItem: (id, data) => api.put(`/inventory/items/${id}`, data),
  recordStockMovement: (data) => api.post('/inventory/stock-movement', data),
  getAssets: (params) => api.get('/inventory/assets', { params }),
  createAsset: (data) => api.post('/inventory/assets', data)
};

export default inventoryApi;
