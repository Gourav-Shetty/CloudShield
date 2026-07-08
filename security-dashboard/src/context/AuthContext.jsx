import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        } catch (e) {
          logout();
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (username, password) => {
    setError(null);
    try {
      // First try standard /auth/login.
      // If that returns 404 or fails, we can fall back or handle appropriately.
      const response = await api.post('/auth/login', { username, password });
      const { token, user: responseUser } = response.data;
      
      const userData = responseUser || { username, role: 'SOC Analyst' };
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setToken(token);
      setUser(userData);
      return true;
    } catch (err) {
      console.error('Login error details:', err);
      let errMsg = 'Connection failed. Ensure server is running at port 5000.';
      
      if (err.response) {
        errMsg = err.response.data?.message || err.response.data?.error || 'Authentication failed. Please check credentials.';
      } else if (err.request) {
        // Backend didn't respond. Provide a demo bypass mode fallback if they enter specific test credentials, 
        // or just let them login in local-demo mode so the UI can be tested without a backend.
        if (username === 'admin' && password === 'admin') {
          const mockToken = 'mock-jwt-token-for-demo-purposes-only';
          const mockUser = { username: 'admin', role: 'Super Analyst (Demo)' };
          localStorage.setItem('token', mockToken);
          localStorage.setItem('user', JSON.stringify(mockUser));
          setToken(mockToken);
          setUser(mockUser);
          return true;
        }
        errMsg = 'No response from auth server. Use admin/admin to bypass for UI testing, or check if backend is running.';
      }
      
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout, loading, error, setError }}>
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
