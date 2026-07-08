import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import SlideCaptcha from './components/SlideCaptcha';
import { registerCaptchaHandler } from './api/axios';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import LeaveManagement from './pages/LeaveManagement';
import Contact from './pages/Contact';
import Profile from './pages/Profile';

function App() {
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaMessage, setCaptchaMessage] = useState('');
  const captchaResolverRef = useRef(null);

  useEffect(() => {
    registerCaptchaHandler((message) => {
      setCaptchaMessage(message);
      setCaptchaOpen(true);
      return new Promise((resolve, reject) => {
        captchaResolverRef.current = { resolve, reject };
      });
    });
  }, []);

  const handleCaptchaSuccess = (token) => {
    setCaptchaOpen(false);
    if (captchaResolverRef.current) {
      captchaResolverRef.current.resolve(token);
    }
  };

  const handleCaptchaCancel = () => {
    setCaptchaOpen(false);
    if (captchaResolverRef.current) {
      captchaResolverRef.current.reject(new Error('Verification cancelled by operator'));
    }
  };

  return (
    <AuthProvider>
      <SlideCaptcha
        isOpen={captchaOpen}
        message={captchaMessage}
        onSuccess={handleCaptchaSuccess}
        onCancel={handleCaptchaCancel}
      />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute>
                <Layout>
                  <Employees />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave"
            element={
              <ProtectedRoute>
                <Layout>
                  <LeaveManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contact"
            element={
              <ProtectedRoute>
                <Layout>
                  <Contact />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
