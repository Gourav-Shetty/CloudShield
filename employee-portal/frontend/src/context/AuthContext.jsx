import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      const decoded = parseJwt(storedToken);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        setToken(storedToken);
        // Look for locally modified user profile details
        const storedUser = localStorage.getItem('user_profile');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          setUser({
            id: decoded.id,
            username: decoded.username,
            role: decoded.role,
            email: decoded.email || `${decoded.username}@cloudshield.ai`,
          });
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user_profile');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      if (response.data && response.data.success) {
        const { token: receivedToken, user: receivedUser } = response.data.data;
        localStorage.setItem('token', receivedToken);
        // Save user profile details
        const userObj = {
          id: receivedUser.id,
          username: receivedUser.username,
          role: receivedUser.role,
          email: receivedUser.email,
        };
        localStorage.setItem('user_profile', JSON.stringify(userObj));
        setToken(receivedToken);
        setUser(userObj);
        return { success: true };
      }
      return { success: false, message: response.data.message || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Invalid username or password',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_profile');
    setToken(null);
    setUser(null);
  };

  const updateProfile = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    localStorage.setItem('user_profile', JSON.stringify(newUser));
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateProfile, isAuthenticated, loading }}>
      {!loading && children}
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
