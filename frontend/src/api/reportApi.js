import api from './axios';

// Dashboard statistics
export const getDashboardStats = async () => {
  const response = await api.get('/reports/dashboard-stats');
  return response.data;
};

// Student Reports
export const getStudentPerformanceReport = async (params = {}) => {
  const response = await api.get('/reports/student-performance', { params });
  return response.data;
};

export const getStudentAttendanceReport = async (params = {}) => {
  const response = await api.get('/reports/student-attendance', { params });
  return response.data;
};

export const getStudentEnrollmentReport = async (params = {}) => {
  const response = await api.get('/reports/student-enrollment', { params });
  return response.data;
};

export const getStudentCertificateReport = async (params = {}) => {
  const response = await api.get('/reports/student-certificates', { params });
  return response.data;
};

// Course Reports
export const getCourseCompletionReport = async (params = {}) => {
  const response = await api.get('/reports/course-completion', { params });
  return response.data;
};

export const getCourseRevenueReport = async (params = {}) => {
  const response = await api.get('/reports/course-revenue', { params });
  return response.data;
};
export const getCoursePopularityReport = async (params = {}) => {
  const response = await api.get('/reports/course-popularity', { params });
  return response.data;
};

// Financial Reports
export const getRevenueReport = async (params = {}) => {
  const response = await api.get('/reports/revenue', { params });
  return response.data;
};

export const getPaymentReport = async (params = {}) => {
  const txParams = { direction: 'inflow', ...params };
  if (params.franchiseId) {
    txParams.franchise = params.franchiseId;
    delete txParams.franchiseId;
  }
  if (params.paymentStatus) {
    txParams.status = params.paymentStatus;
    delete txParams.paymentStatus;
  }
  const response = await api.get('/transactions', { params: txParams });
  return response.data;
};

export const getOutstandingPaymentsReport = async (params = {}) => {
  const obParams = {};
  if (params.franchiseId) obParams.franchise = params.franchiseId;
  const response = await api.get('/fee-obligations', { params: obParams });
  return response.data;
};

// School Reports
export const getFranchisePerformanceReport = async (params = {}) => {
  const response = await api.get('/reports/campus-performance', { params });
  return response.data;
};

export const getFranchiseComplianceReport = async (params = {}) => {
  const response = await api.get('/reports/campus-compliance', { params });
  return response.data;
};

// Staff Reports
export const getStaffPerformanceReport = async (params = {}) => {
  const response = await api.get('/reports/staff-performance', { params });
  return response.data;
};

export const getStaffAttendanceReport = async (params = {}) => {
  const response = await api.get('/reports/staff-attendance', { params });
  return response.data;
};

export const getPayrollReport = async (params = {}) => {
  const response = await api.get('/reports/payroll', { params });
  return response.data;
};
