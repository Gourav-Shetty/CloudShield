import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// Import Pages
import Login from './pages/Login';
import Overview from './pages/Overview';
import LiveLogs from './pages/LiveLogs';
import Alerts from './pages/Alerts';
import Incidents from './pages/Incidents';
import AIDetection from './pages/AIDetection';
import BlockedIPs from './pages/BlockedIPs';
import Reports from './pages/Reports';

// Auth Guard component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 text-gray-500 font-mono text-xs select-none">
        <span className="animate-pulse">DECRYPTING_SECURITY_LEASE_HANDSHAKE...</span>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public login page */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected dashboard shell */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard routes */}
            <Route index element={<Overview />} />
            <Route path="live-logs" element={<LiveLogs />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="ai-detection" element={<AIDetection />} />
            <Route path="blocked-ips" element={<BlockedIPs />} />
            <Route path="reports" element={<Reports />} />
          </Route>

          {/* Catch-all redirect to index */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
