import api from './axios';

export const accountingApi = {
  getCashbook: (params) => api.get('/accounting/cashbook', { params }),
  getBankbook: (params) => api.get('/accounting/bankbook', { params }),
  getTrialBalance: (params) => api.get('/accounting/trial-balance', { params }),
  getIncomeExpenditure: (params) => api.get('/accounting/income-expenditure', { params }),
  getVendors: (params) => api.get('/accounting/vendors', { params }),
  createVendor: (data) => api.post('/accounting/vendors', data),
  getVouchers: (params) => api.get('/accounting/vouchers', { params }),
  createVoucher: (data) => api.post('/accounting/vouchers', data)
};

export default accountingApi;
