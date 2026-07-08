import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiShield, FiLock, FiUser, FiAlertCircle } from 'react-icons/fi';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setLocalError('Please fill in all fields.');
      return;
    }
    
    setLocalError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setLocalError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 relative overflow-hidden font-sans">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29371a_1px,transparent_1px),linear-gradient(to_bottom,#1f29371a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      
      {/* Glowing backdrop ambient circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyber-blue/10 rounded-full filter blur-[100px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyber-purple/10 rounded-full filter blur-[100px] pointer-events-none animate-pulse-slow"></div>

      {/* Main Glass Card container */}
      <div className="relative w-full max-w-md p-8 glass-card border-gray-700/60 shadow-2xl relative z-10 group overflow-hidden">
        {/* Animated Neon glow border */}
        <div className="absolute -inset-[2px] bg-gradient-to-r from-cyber-blue via-cyber-purple to-cyber-red rounded-xl opacity-30 blur-[2px] -z-10 group-hover:opacity-75 transition-opacity duration-700"></div>
        <div className="absolute -inset-[2px] bg-gradient-to-r from-cyber-blue via-cyber-purple to-cyber-red rounded-xl opacity-20 -z-10"></div>
        
        {/* Shield logo Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-3">
            <div className="absolute inset-0 bg-cyber-blue/20 blur-md rounded-full -z-10 animate-ping"></div>
            <div className="w-16 h-16 rounded-full bg-dark-800 border border-cyber-blue/40 flex items-center justify-center text-cyber-blue shadow-[0_0_15px_rgba(0,212,255,0.2)]">
              <FiShield className="w-8 h-8 filter drop-shadow-[0_0_3px_rgba(0,212,255,0.4)]" />
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-widest text-white text-center font-sans">
            CLOUDSHIELD <span className="text-cyber-blue">AI</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-mono">SOC Secure Gateway</p>
        </div>

        {/* Error Alert */}
        {localError && (
          <div className="mb-6 p-4 rounded-lg bg-cyber-red/10 border border-cyber-red/30 text-cyber-red text-xs flex items-start gap-2.5">
            <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{localError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-mono font-medium text-gray-400 uppercase tracking-wider block">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <FiUser className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="analyst_code_name"
                disabled={submitting}
                className="w-full bg-dark-800/80 border border-gray-700/60 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue focus:ring-1 focus:ring-cyber-blue/30 transition-all font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-medium text-gray-400 uppercase tracking-wider block">Access Key</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <FiLock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={submitting}
                className="w-full bg-dark-800/80 border border-gray-700/60 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue focus:ring-1 focus:ring-cyber-blue/30 transition-all font-mono"
              />
            </div>
          </div>

          {/* Cyan Gradient Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full relative group/btn overflow-hidden rounded-lg py-3 font-semibold text-sm tracking-wider uppercase text-black font-sans shadow-lg shadow-cyber-blue/20 hover:shadow-cyber-blue/40 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyber-blue to-cyber-green transition-transform duration-300 group-hover/btn:scale-105"></div>
            <span className="relative z-10 flex items-center justify-center gap-2">
              {submitting ? 'Decrypting Credentials...' : 'Establish Secure Connection'}
            </span>
          </button>
        </form>

        {/* Credentials hints for easy testing */}
        <div className="mt-8 pt-6 border-t border-gray-800/60 text-center">
          <p className="text-[11px] text-gray-500 font-mono">
            SECURE ACCESS BYPASS: Use <span className="text-cyber-yellow">admin</span> / <span className="text-cyber-yellow">admin</span> for UI evaluation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
