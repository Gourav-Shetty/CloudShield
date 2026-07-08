import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:3000/api';
};

const baseURL = getBaseURL();

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

let captchaHandler = null;

export const registerCaptchaHandler = (handler) => {
  captchaHandler = handler;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const responseData = error.response?.data;
    
    // ── 1. HARD IP BLOCK ──
    if (error.response && error.response.status === 403 && responseData?.isIpBlocked) {
      localStorage.removeItem('token');
      localStorage.removeItem('user_profile');
      localStorage.setItem('login_error', responseData.message || 'Access denied due to a security violation.');
      
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    // ── 2. CAPTCHA CHALLENGE RETRY ──
    if (error.response && error.response.status === 403 && responseData?.captchaRequired) {
      if (captchaHandler) {
        return new Promise((resolve, reject) => {
          captchaHandler(responseData.message)
            .then((token) => {
              // Re-inject token safely across all Axios header formats
              const config = error.config;
              if (config.headers && typeof config.headers.set === 'function') {
                config.headers.set('x-captcha-token', token);
              }
              config.headers = {
                ...config.headers,
                'x-captcha-token': token
              };
              resolve(api(config));
            })
            .catch((err) => reject(err));
        });
      }
    }

    // ── 3. RATE LIMITING ──
    if (error.response && error.response.status === 429 && responseData?.isRateLimited) {
      // Return a clean customized error for the UI components to hook into
      return Promise.reject({
        ...error,
        isRateLimited: true,
        message: responseData.message
      });
    }

    return Promise.reject(error);
  }
);

export default api;
