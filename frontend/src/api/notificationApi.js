import api from './axios';

// Get all notifications
export const getAllNotifications = async (params = {}) => {
  const response = await api.get('/notifications', { params });
  return response.data;
};

// Get my notifications
export const getMyNotifications = async () => {
  const response = await api.get('/notifications/my');
  return response.data;
};

// Get single notification
export const getNotification = async (id) => {
  const response = await api.get(`/notifications/${id}`);
  return response.data;
};

// Create notification
export const createNotification = async (data) => {
  const response = await api.post('/notifications', data);
  return response.data;
};

// Send notification
export const sendNotification = async (id) => {
  const response = await api.post(`/notifications/${id}/send`);
  return response.data;
};

// Update notification
export const updateNotification = async (id, data) => {
  const response = await api.put(`/notifications/${id}`, data);
  return response.data;
};

// Mark as read
export const markAsRead = async (id) => {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
};

// Mark all as read
export const markAllAsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data;
};

// Delete notification
export const deleteNotification = async (id) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};

// Get unread count
export const getUnreadCount = async () => {
  const response = await api.get('/notifications/unread/count');
  return response.data;
};

// Get notification statistics
export const getNotificationStats = async () => {
  const response = await api.get('/notifications/stats');
  return response.data;
};
