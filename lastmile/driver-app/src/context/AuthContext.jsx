import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
            const { data } = await api.get('/driver/profile');
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

  const sendOtp = async (phone) => {
    return api.post('/auth/send-otp', { phone, role: 'Driver' });
  };

  const verifyOtp = async (phone, otp, name, vehicle_number) => {
    const { data } = await api.post('/auth/verify-otp', { phone, otp, role: 'Driver', name, vehicle_number });
    if (data.success && data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        setUser(data.user);
    }
    return data;
  };

  const uploadDocuments = async (driving_license, fitness_certificate, aadhar_card) => {
    const { data } = await api.post('/driver/documents', {
      driving_license,
      fitness_certificate,
      aadhar_card
    });
    if (data.success) {
      // Update user's document status locally
      setUser(prev => ({ ...prev, document_status: 'PENDING', driving_license: 'uploaded', fitness_certificate: 'uploaded', aadhar_card: 'uploaded' }));
    }
    return data;
  };

  const checkDocumentStatus = async () => {
    const { data } = await api.get('/driver/documents/status');
    if (data.success) {
      setUser(prev => ({
        ...prev,
        document_status: data.data.document_status,
        is_verified: data.data.is_verified,
        rejection_reason: data.data.rejection_reason
      }));
    }
    return data;
  };

  const logout = () => {
      localStorage.removeItem('accessToken');
      setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, sendOtp, verifyOtp, uploadDocuments, checkDocumentStatus, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
