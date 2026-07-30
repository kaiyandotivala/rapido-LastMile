import axios from 'axios';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (import.meta.env.VITE_API_URL) return `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/v1`;
  return 'http://localhost:5000/api/v1';
};

const api = axios.create({
  baseURL: getBaseUrl(),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
