import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export const extractApiError = (error) => {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const message = data?.message || error?.message || 'Request failed. Please try again.';
  const fieldErrors = data?.errors || data?.fieldErrors || null;

  return { status, message, fieldErrors };
};

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      config.__sessionToken = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = String(error.config?.url || '');
      const isSignInRequest = /(?:^|\/)auth\/(?:login|google|register|forgot-password|reset-password)(?:\/|$)/i.test(requestUrl);
      const requestToken = error.config?.__sessionToken;
      const currentToken = localStorage.getItem('token');

      // Ignore stale responses from a previous session. In particular, a
      // pending /auth/me request must not erase a token created by a new login.
      if (!isSignInRequest && requestToken && requestToken === currentToken) {
        localStorage.removeItem('token');
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }
    }
    
    // Handle school inactive errors globally
    if (error.response?.status === 403 && error.response?.data?.requiresRenewal) {
      // Store the error data for modal display
      localStorage.setItem('franchiseInactiveData', JSON.stringify(error.response.data));
      
      // Dispatch custom event to show modal
      window.dispatchEvent(new CustomEvent('franchiseInactive', {
        detail: error.response.data
      }));
    } else if (error.response?.status === 403) {
      // Handle other 403 errors (authorization issues)
      console.error('Authorization error:', error.response?.data?.message || 'Access denied');
      // Don't redirect, let the component handle the error
    }
    
    return Promise.reject(error);
  }
);

export default api;
