import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { 
  FiShield, 
  FiGrid, 
  FiTerminal, 
  FiBell, 
  FiAlertTriangle, 
  FiCpu, 
  FiLock, 
  FiFileText,
  FiLogOut,
  FiUser
} from 'react-icons/fi';

const Layout = () => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Overview', path: '/', icon: FiGrid },
    { name: 'Live Logs', path: '/live-logs', icon: FiTerminal },
    { name: 'Alerts', path: '/alerts', icon: FiBell },
    { name: 'Incidents', path: '/incidents', icon: FiAlertTriangle },
    { name: 'AI Detection', path: '/ai-detection', icon: FiCpu },
    { name: 'Blocked IPs', path: '/blocked-ips', icon: FiLock },
    { name: 'Reports', path: '/reports', icon: FiFileText },
  ];

  return (
    <div className="flex h-screen bg-dark-900 text-gray-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-800 border-r border-gray-800/80 flex flex-col justify-between z-30 relative shadow-2xl shadow-dark-900/50">
        <div>
          {/* Logo / Header */}
          <div className="h-20 flex items-center px-6 border-b border-gray-800/50 gap-3">
            <div className="relative">
              <FiShield className="w-8 h-8 text-cyber-blue animate-pulse-slow filter drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]" />
              <div className="absolute inset-0 bg-cyber-blue/20 blur-sm rounded-full -z-10"></div>
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wider text-white">CLOUDSHIELD <span className="text-cyber-blue font-mono text-xs">AI</span></h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">SOC Platform v1.0</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 px-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                      isActive 
                        ? 'text-cyber-blue bg-cyber-blue/10 border-l-2 border-cyber-blue/80' 
                        : 'text-gray-400 hover:text-white hover:bg-dark-700/50'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                  <span>{item.name}</span>
                  
                  {/* Subtle active background glow */}
                  {location.pathname === item.path && (
                    <div className="absolute inset-0 bg-cyber-blue/5 blur-md rounded-lg -z-10"></div>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer (User Info & Logout) */}
        <div className="p-4 border-t border-gray-800/50 bg-dark-900/20">
          <div className="flex items-center justify-between gap-3 p-2 bg-dark-700/30 rounded-lg border border-gray-800/30">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center border border-cyber-blue/30 text-cyber-blue font-mono text-sm shrink-0">
                {user?.username?.substring(0, 2).toUpperCase() || 'AN'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user?.username || 'Analyst'}</p>
                <p className="text-[10px] text-gray-500 truncate">{user?.role || 'SOC Analyst'}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="text-gray-400 hover:text-cyber-red p-1.5 rounded-lg hover:bg-cyber-red/10 transition-colors"
              title="Logout"
            >
              <FiLogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Topbar */}
        <header className="h-16 border-b border-gray-800/50 bg-dark-800/40 backdrop-blur-md px-8 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            {/* Connection Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 bg-dark-700/50 rounded-full border border-gray-800/40 text-xs">
              <span className={`relative flex h-2 w-2`}>
                {connected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-green opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-cyber-green' : 'bg-cyber-red animate-pulse'}`}></span>
              </span>
              <span className="font-mono text-gray-400">
                {connected ? 'SOCKET: CONNECTED' : 'SOCKET: DISCONNECTED'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
            <span>SECURE GATEWAY: ONLINE</span>
            <span className="text-gray-700">|</span>
            <span className="text-cyber-blue uppercase">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-dark-800/40 via-dark-900 to-dark-900 relative">
          {/* Cyberpunk Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
          
          <div className="relative animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
