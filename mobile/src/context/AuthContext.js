import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, {
  STORAGE_KEY_TOKEN,
  STORAGE_KEY_USER,
  initApiUrl,
  getHostUrl,
  setCustomApiHost
} from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentHost, setCurrentHost] = useState('');

  // Initial authentication check on app mount
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        await initApiUrl();
        setCurrentHost(getHostUrl());

        const savedToken = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
        const savedUserStr = await AsyncStorage.getItem(STORAGE_KEY_USER);

        if (savedToken && savedUserStr) {
          const parsedUser = JSON.parse(savedUserStr);
          setToken(savedToken);
          setUser(parsedUser);
          setStudent(parsedUser.studentDetails || null);

          // Verify with backend silently
          try {
            const res = await api.get('/auth/me');
            if (res.data && res.data.success) {
              const freshUser = res.data.user;
              setUser(freshUser);
              setStudent(freshUser.studentDetails || null);
              await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(freshUser));
            }
          } catch (verifyErr) {
            console.warn('Could not re-verify token, using cached session:', verifyErr?.message);
          }
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (identifier, password) => {
    try {
      const res = await api.post('/auth/login', { identifier, password });
      if (res.data && res.data.success) {
        const { token: receivedToken, user: receivedUser } = res.data;

        // Verify that the user has student permissions or role
        if (receivedUser.role !== 'student' && !receivedUser.studentDetails) {
          throw new Error('This app is currently configured for Student accounts. Please log in with your Student credentials.');
        }

        await AsyncStorage.setItem(STORAGE_KEY_TOKEN, receivedToken);
        await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(receivedUser));

        setToken(receivedToken);
        setUser(receivedUser);
        setStudent(receivedUser.studentDetails || null);

        return { success: true, user: receivedUser };
      } else {
        return {
          success: false,
          message: res.data?.message || 'Login failed. Please check credentials.',
        };
      }
    } catch (err) {
      console.error('Login error:', err);
      const message =
        err.response?.data?.message ||
        err.message ||
        'Unable to connect to server. Check your network or server URL.';
      return { success: false, message };
    }
  };

  const googleLogin = async (credentialOrToken) => {
    try {
      const res = await api.post('/auth/google', {
        credential: credentialOrToken,
        idToken: credentialOrToken,
      });

      if (res.data && res.data.success) {
        const { token: receivedToken, user: receivedUser } = res.data;

        // Verify student permissions or role
        if (receivedUser.role !== 'student' && !receivedUser.studentDetails) {
          throw new Error('This mobile app is configured for Student accounts. Please sign in with your student Google account.');
        }

        await AsyncStorage.setItem(STORAGE_KEY_TOKEN, receivedToken);
        await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(receivedUser));

        setToken(receivedToken);
        setUser(receivedUser);
        setStudent(receivedUser.studentDetails || null);

        return { success: true, user: receivedUser };
      } else {
        return {
          success: false,
          message: res.data?.message || 'Google Sign-In failed',
        };
      }
    } catch (err) {
      console.error('Google Sign-In error:', err);
      const message =
        err.response?.data?.message ||
        err.message ||
        'Google authentication failed. Please try again.';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEY_USER);
    } catch (e) {
      console.warn('Error clearing credentials:', e);
    }
    setToken(null);
    setUser(null);
    setStudent(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data && res.data.success) {
        const freshUser = res.data.user;
        setUser(freshUser);
        setStudent(freshUser.studentDetails || null);
        await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(freshUser));
        return freshUser;
      }
    } catch (err) {
      console.warn('Could not refresh profile:', err);
    }
    return null;
  };

  const updateApiHost = async (newHost) => {
    await setCustomApiHost(newHost);
    setCurrentHost(getHostUrl());
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        student,
        token,
        loading,
        currentHost,
        login,
        googleLogin,
        logout,
        refreshProfile,
        updateApiHost,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
