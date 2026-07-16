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
  FiRadio,
  FiActivity,
  FiDatabase,
} from 'react-icons/fi';

/* ─── Nav structure with grouping ─────────────────────────────── */
const navGroups = [
  {
    label: 'MONITORING',
    items: [
      { name: 'Overview',   path: '/',          icon: FiGrid     },
      { name: 'Alerts',     path: '/alerts',    icon: FiBell     },
      { name: 'Live Logs',  path: '/live-logs', icon: FiTerminal },
    ],
  },
  {
    label: 'DEFENSE',
    items: [
      { name: 'Blocked IPs', path: '/blocked-ips', icon: FiLock         },
      { name: 'Incidents',   path: '/incidents',   icon: FiAlertTriangle },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { name: 'Reports',      path: '/reports',      icon: FiFileText },
    ],
  },
];

const Layout = () => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#060910] text-gray-100 overflow-hidden font-sans">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-64 bg-[#060910] border-r border-white/[0.06] flex flex-col z-30 relative">

        {/* Connection status strip */}
        <div className={`h-[2px] w-full ${connected ? 'bg-cyber-green shadow-[0_0_8px_rgba(0,255,136,0.5)]' : 'bg-cyber-red shadow-[0_0_8px_rgba(255,51,102,0.5)]'} transition-colors duration-500`} />

        {/* Logo */}
        <div className="h-[68px] flex items-center px-5 border-b border-white/[0.05] gap-3 shrink-0">
          <div className="relative shrink-0">
            {/* Outer glow ring */}
            <div className="absolute inset-[-4px] rounded-full border border-cyber-blue/30 animate-pulse-slow" />
            <div className="absolute inset-[-8px] rounded-full border border-cyber-blue/10" />
            <div className="w-9 h-9 rounded-full bg-cyber-blue/10 border border-cyber-blue/40 flex items-center justify-center shadow-[0_0_12px_rgba(0,212,255,0.25)]">
              <FiShield className="w-5 h-5 text-cyber-blue drop-shadow-[0_0_4px_rgba(0,212,255,0.7)]" />
            </div>
          </div>
          <div>
            <h1 className="font-mono font-bold text-sm tracking-[0.15em] text-white uppercase leading-tight">
              CloudShield <span className="text-cyber-blue">AI</span>
            </h1>
            <p className="text-[9px] text-gray-500 font-mono uppercase tracking-[0.2em] mt-0.5">SOC Platform v1.0</p>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto scrollbar-dark py-4 px-3 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[9px] font-mono font-semibold text-gray-600 uppercase tracking-[0.25em] px-3 mb-2">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.path === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(item.path);

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 group relative overflow-hidden ${
                        isActive
                          ? 'text-cyber-blue bg-cyber-blue/[0.08] border-l-2 border-cyber-blue pl-[10px]'
                          : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.04] border-l-2 border-transparent pl-[10px]'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-all duration-150 ${
                          isActive
                            ? 'text-cyber-blue drop-shadow-[0_0_4px_rgba(0,212,255,0.6)]'
                            : 'text-gray-500 group-hover:text-gray-300'
                        }`}
                      />
                      <span className="font-mono tracking-wide">{item.name}</span>
                      {isActive && (
                        <span className="ml-auto w-1 h-1 rounded-full bg-cyber-blue shadow-[0_0_4px_rgba(0,212,255,0.8)]" />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="shrink-0 border-t border-white/[0.05] p-4 space-y-3">
          {/* System status */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] rounded-lg border border-white/[0.05]">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-green shadow-[0_0_6px_rgba(0,255,136,0.8)]" />
            </span>
            <span className="font-mono text-[10px] text-cyber-green tracking-widest font-semibold">SYSTEM ONLINE</span>
          </div>

          {/* User card */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white/[0.02] rounded-lg border border-white/[0.04] group/user">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-cyber-blue/10 border border-cyber-blue/30 flex items-center justify-center text-cyber-blue font-mono text-[10px] font-bold shrink-0">
                {user?.username?.substring(0, 2).toUpperCase() || 'AN'}
              </div>
              <div className="truncate">
                <p className="text-[11px] font-semibold text-white truncate font-mono">{user?.username || 'Analyst'}</p>
                <p className="text-[9px] text-gray-500 truncate font-mono">{user?.role || 'SOC Analyst'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-cyber-red p-1.5 rounded hover:bg-cyber-red/10 transition-all duration-150 shrink-0"
              title="Logout"
            >
              <FiLogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content area ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden relative">

        {/* Topbar */}
        <header className="h-[52px] shrink-0 border-b border-white/[0.05] bg-[#060910]/80 backdrop-blur-md px-8 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            {/* Socket status pill */}
            <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.03] rounded-full border border-white/[0.06] text-[10px] font-mono">
              <span className="relative flex h-1.5 w-1.5">
                {connected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-green opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${connected ? 'bg-cyber-green' : 'bg-cyber-red animate-pulse'}`} />
              </span>
              <span className={connected ? 'text-cyber-green' : 'text-cyber-red'}>
                {connected ? 'LIVE FEED ACTIVE' : 'FEED DISCONNECTED'}
              </span>
            </div>

            <div className="h-3.5 w-px bg-white/10" />

            {/* Gateway status */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
              <FiActivity className="w-3 h-3 text-cyber-blue" />
              <span>SECURE GATEWAY: ONLINE</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
            <span className="text-cyber-blue uppercase">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
            <div className="h-3.5 w-px bg-white/10" />
            <span className="text-gray-600 tabular-nums">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-dark relative bg-[#060910]">
          {/* Subtle CSS grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,212,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,212,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
          {/* Radial fade overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,212,255,0.04)_0%,transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.03)_0%,transparent_50%)] pointer-events-none" />

          <div className="relative p-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
