import api from './axios';

export const getRazorpayConfig = () => api.get('/payments/razorpay/config');
export const createRazorpayOrder = (data) => api.post('/payments/razorpay/create-order', data);
export const verifyRazorpayPayment = (data) => api.post('/payments/razorpay/verify-payment', data);
export const getRazorpayTransactions = (params) => api.get('/payments/razorpay/transactions', { params });
export const getRazorpayAdminConfig = () => api.get('/payments/razorpay/admin/config');

export default {
  getRazorpayConfig,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getRazorpayTransactions,
  getAdminConfig: getRazorpayAdminConfig
};
