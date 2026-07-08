import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:3000/api');

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
