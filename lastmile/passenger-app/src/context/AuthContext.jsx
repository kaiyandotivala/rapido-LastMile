import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user on mount if token exists
  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
            const { data } = await api.get('/passenger/profile');
            setUser(data.data);
        } catch (error) {
            console.error("Failed to load profile", error);
            localStorage.removeItem('accessToken');
        }
      }
      setLoading(false);
    }
    checkUser();
  }, []);

  const register = async (email, password, name) => {
    const { data } = await api.post('/auth/passenger/register', { email, password, name });
    if (data.success && data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      setUser(data.user);
    }
    return data;
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/passenger/login', { email, password });
    if (data.success && data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
      localStorage.removeItem('accessToken');
      setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
