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
import BlockedIPs from './pages/BlockedIPs';
import Reports from './pages/Reports';

// Auth Guard component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#060910] select-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,212,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,212,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="relative flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-cyber-blue/30 border-t-cyber-blue animate-spin" />
          <span className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.3em] animate-pulse">
            DECRYPTING_SECURITY_LEASE_HANDSHAKE...
          </span>
        </div>
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
