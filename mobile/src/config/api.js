import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

// Official Live Production Backend Server URL (SES Educare VPS)
export const LIVE_API_HOST = 'https://myapp.seseducare.com';
export const DEFAULT_API_HOST = LIVE_API_HOST;

export const STORAGE_KEY_API_HOST = '@ses_api_host';
export const STORAGE_KEY_TOKEN = '@ses_auth_token';
export const STORAGE_KEY_USER = '@ses_auth_user';

// Automatically detect local packager in development mode only
export const getAutoDetectedHost = () => {
  if (__DEV__) {
    try {
      const scriptURL = NativeModules?.SourceCode?.scriptURL;
      if (scriptURL) {
        const match = scriptURL.match(/https?:\/\/([^/:]+)/);
        if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
          // If debugging against local machine, you can use local backend, or default to live
          return DEFAULT_API_HOST;
        }
      }
    } catch (e) {
      // fallback
    }
  }
  return DEFAULT_API_HOST;
};

let currentBaseUrl = `${DEFAULT_API_HOST}/api`;

const api = axios.create({
  baseURL: currentBaseUrl,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Initialize Base URL from AsyncStorage
export const initApiUrl = async () => {
  try {
    const savedHost = await AsyncStorage.getItem(STORAGE_KEY_API_HOST);

    // If savedHost is an obsolete local WiFi IP (10.x, 192.168.x) or invalid, discard and switch to live VPS
    if (savedHost && (savedHost.includes('10.') || savedHost.includes('192.168.') || !savedHost.startsWith('http'))) {
      await AsyncStorage.removeItem(STORAGE_KEY_API_HOST);
      currentBaseUrl = `${DEFAULT_API_HOST}/api`;
    } else if (savedHost) {
      currentBaseUrl = `${savedHost.replace(/\/$/, '')}/api`;
    } else {
      currentBaseUrl = `${DEFAULT_API_HOST}/api`;
    }

    api.defaults.baseURL = currentBaseUrl;
  } catch (e) {
    console.warn('Could not load custom API host, using live default:', e);
  }
  return currentBaseUrl;
};

export const setCustomApiHost = async (hostUrl) => {
  try {
    const clean = hostUrl.trim().replace(/\/api\/?$/, '').replace(/\/$/, '');
    await AsyncStorage.setItem(STORAGE_KEY_API_HOST, clean);
    currentBaseUrl = `${clean}/api`;
    api.defaults.baseURL = currentBaseUrl;
    return currentBaseUrl;
  } catch (e) {
    console.error('Error saving API host:', e);
    throw e;
  }
};

export const getBaseUrl = () => currentBaseUrl;
export const getHostUrl = () => currentBaseUrl.replace(/\/api\/?$/, '');

// Interceptor to attach Bearer token automatically
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Error reading token from storage:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle unauthenticated 401 gracefully
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized request - session might be expired');
    }
    return Promise.reject(error);
  }
);

export default api;
