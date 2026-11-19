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
        if (user && user.studentDetails) {
          user.studentProfile = user.studentDetails;
          delete user.studentDetails;
        }
        setUser(user);
      } catch (error) {
        localStorage.removeItem('token');
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
    localStorage.removeItem('token');
    setUser(null);
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
