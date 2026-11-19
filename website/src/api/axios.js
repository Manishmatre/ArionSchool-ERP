import axios from 'axios';
import { getApiBaseUrl } from '../utils/api';

// Create axios instance with base configuration
const resolvedBaseUrl = getApiBaseUrl();

const api = axios.create({
  baseURL: resolvedBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // 5 seconds timeout - fail fast to use static content
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // You can add auth tokens here if needed in future
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle errors silently - let components use fallback content
    if (error.code === 'ECONNABORTED') {
      console.warn('⚠️ API request timeout - using static content');
    } else if (error.response) {
      // Server responded with error
      console.warn('⚠️ API Error:', error.response.status);
    } else if (error.request) {
      // Request made but no response (server down)
      console.warn('⚠️ Server unavailable - using static content');
    }
    return Promise.reject(error);
  }
);

export default api;
