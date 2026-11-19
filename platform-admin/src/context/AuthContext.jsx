import React, { createContext, useContext, useState, useEffect } from 'react';
import { platformApi } from '../api/platformApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('arion_platform_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('arion_platform_token');
    if (!token) {
      setLoading(false);
      return;
    }
    platformApi.getMe()
      .then((res) => {
        const u = res.data?.user || res.data?.data;
        if (u && u.role === 'super_admin') {
          setUser(u);
          localStorage.setItem('arion_platform_user', JSON.stringify(u));
        } else {
          logout();
        }
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await platformApi.login({ identifier: email, email, password });
    const token = res.data?.token || res.data?.data?.token;
    const u = res.data?.user || res.data?.data?.user || res.data?.data;

    if (!u || u.role !== 'super_admin') {
      throw new Error('Access denied. Only SES Educare Platform Super Admins can sign in to this console.');
    }

    localStorage.setItem('arion_platform_token', token);
    localStorage.setItem('arion_platform_user', JSON.stringify(u));
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('arion_platform_token');
    localStorage.removeItem('arion_platform_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
