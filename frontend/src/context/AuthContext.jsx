import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { extractApiError } from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await api.get('/auth/me');
        const user = response.data.user;
        // A login may replace this token while the initial session check is
        // still in flight. Never let an older response overwrite that session.
        if (localStorage.getItem('token') === token) {
          if (user && user.studentDetails) {
            user.studentProfile = user.studentDetails;
            delete user.studentDetails;
          }
          setUser(user);
        }
      } catch (error) {
        // Only clear the token this request actually checked. A newer login
        // may already have stored a different token.
        if (localStorage.getItem('token') === token) {
          localStorage.removeItem('token');
          setUser(null);
        }
      }
    }
    setLoading(false);
  };

  const login = async (identifier, password) => {
    try {
      const response = await api.post('/auth/login', { identifier, password });
      localStorage.setItem('token', response.data.token);
      const user = response.data.user;
      if (user && user.studentDetails) {
        user.studentProfile = user.studentDetails;
        delete user.studentDetails;
      }
      setUser(user);
      return response.data;
    } catch (error) {
      const { message, fieldErrors, status } = extractApiError(error);
      const nextError = new Error(message || 'Login failed');
      nextError.status = status;
      nextError.fieldErrors = fieldErrors;
      throw nextError;
    }
  };

  const googleLogin = async (credential) => {
    try {
      const response = await api.post('/auth/google', { credential });
      localStorage.setItem('token', response.data.token);
      const user = response.data.user;
      if (user && user.studentDetails) {
        user.studentProfile = user.studentDetails;
        delete user.studentDetails;
      }
      setUser(user);
      return response.data;
    } catch (error) {
      const { message, fieldErrors, status } = extractApiError(error);
      const nextError = new Error(message || 'Google Sign-In failed');
      nextError.status = status;
      nextError.fieldErrors = fieldErrors;
      throw nextError;
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      localStorage.setItem('token', response.data.token);
      const user = response.data.user;
      if (user && user.studentDetails) {
        user.studentProfile = user.studentDetails;
        delete user.studentDetails;
      }
      setUser(user);
      return response.data;
    } catch (error) {
      const { message, fieldErrors, status } = extractApiError(error);
      const nextError = new Error(message || 'Registration failed');
      nextError.status = status;
      nextError.fieldErrors = fieldErrors;
      throw nextError;
    }
  };

  const logout = () => {
    const token = localStorage.getItem('token');
    localStorage.removeItem('token');
    setUser(null);
    if (token) {
      api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
  };

  const updateUser = (updatedUserData) => {
    setUser(prevUser => ({ ...prevUser, ...updatedUserData }));
  };

  const value = {
    user,
    loading,
    login,
    googleLogin,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
