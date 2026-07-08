import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiHome,
  FiUsers,
  FiCalendar,
  FiMail,
  FiUser,
  FiLogOut,
  FiMenu,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiBell,
  FiShield,
} from 'react-icons/fi';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: FiHome },
    { name: 'Employees', path: '/employees', icon: FiUsers },
    { name: 'Leave Management', path: '/leave', icon: FiCalendar },
    { name: 'Contact', path: '/contact', icon: FiMail },
    { name: 'Profile', path: '/profile', icon: FiUser },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentPage = menuItems.find(item => item.path === location.pathname)?.name || 'Employee Portal';
  const userInitials = user?.username?.substring(0, 2)?.toUpperCase() || 'US';

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out lg:static
          ${sidebarOpen ? 'w-64' : 'w-[72px]'}
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ background: 'linear-gradient(180deg, #0f172a 0%, #0f2361 60%, #1e3a8a 100%)' }}
      >
        {/* Sidebar Header / Logo */}
        <div className="flex items-center justify-between h-16 px-4 shrink-0 border-b border-white/5">
          <div className="flex items-center space-x-3 overflow-hidden min-w-0">
            {/* Shield icon */}
            <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-900/40">
              <FiShield size={18} className="text-white" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col min-w-0">
                <span className="text-white font-bold text-sm tracking-wide leading-tight whitespace-nowrap">
                  CLOUDSHIELD CORP
                </span>
                <span className="text-primary-300/70 text-[10px] font-medium tracking-widest uppercase">
                  HR Portal
                </span>
              </div>
            )}
          </div>
          {/* Mobile close */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1.5 rounded-lg text-primary-300 hover:text-white hover:bg-white/10 lg:hidden transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {!sidebarOpen && (
            <div className="mb-4 flex items-center justify-center">
              <div className="h-px w-8 bg-white/10" />
            </div>
          )}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`flex items-center rounded-xl transition-all duration-200 group relative overflow-hidden
                  ${sidebarOpen ? 'px-3.5 py-3' : 'px-0 py-3 justify-center'}
                  ${isActive
                    ? 'bg-primary-500/20 text-white'
                    : 'text-primary-200/70 hover:text-white hover:bg-white/[0.07]'
                  }
                `}
              >
                {/* Active left accent bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-blue-400 rounded-r-full shadow-[0_0_8px_2px_rgba(96,165,250,0.5)]" />
                )}

                <Icon
                  size={18}
                  className={`shrink-0 transition-colors duration-200
                    ${isActive ? 'text-blue-300' : 'text-primary-300/60 group-hover:text-primary-100'}
                    ${sidebarOpen ? '' : ''}
                  `}
                />

                {sidebarOpen ? (
                  <span className={`ml-3 text-sm font-medium transition-opacity duration-200 ${isActive ? 'text-white font-semibold' : ''}`}>
                    {item.name}
                  </span>
                ) : (
                  /* Tooltip when collapsed */
                  <span className="absolute left-[72px] opacity-0 pointer-events-none scale-95 group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto rounded-lg bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-white font-medium transition-all z-50 shadow-xl whitespace-nowrap">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* System Status */}
        {sidebarOpen && (
          <div className="px-4 py-3 mx-3 mb-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-emerald-400 leading-tight">System Online</p>
                <p className="text-[10px] text-primary-300/50 leading-tight">All services operational</p>
              </div>
            </div>
          </div>
        )}

        {/* User info strip in sidebar */}
        {sidebarOpen && user && (
          <div className="border-t border-white/[0.07] px-4 py-4 bg-black/20">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold uppercase shadow-inner border border-white/20 shrink-0">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.username}</p>
                <p className="text-xs text-primary-300/60 capitalize truncate">{user.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Collapse toggle (desktop) */}
        <div className="hidden lg:block border-t border-white/[0.07] p-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`flex items-center justify-center w-full py-2.5 rounded-lg text-primary-300/60 hover:text-white hover:bg-white/10 transition-all duration-200 text-xs font-medium gap-2 ${!sidebarOpen ? 'px-0' : 'px-3'}`}
          >
            {sidebarOpen ? (
              <>
                <FiChevronLeft size={15} />
                <span>Collapse</span>
              </>
            ) : (
              <FiChevronRight size={15} />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="flex items-center justify-between h-16 px-5 bg-white border-b border-slate-100 shrink-0 z-30">
          <div className="flex items-center gap-3">
            {/* Hamburger mobile */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden transition-colors focus:outline-none"
            >
              <FiMenu size={20} />
            </button>

            {/* Breadcrumb / Page title */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">CloudShield Corp</span>
              <span className="text-slate-200">/</span>
              <span className="text-sm font-semibold text-slate-800">{currentPage}</span>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <button className="relative p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150 focus:outline-none">
              <FiBell size={18} />
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                3
              </span>
            </button>

            <div className="h-6 w-px bg-slate-100 mx-1" />

            {/* User avatar + info */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-semibold text-slate-700 leading-tight">{user.username}</p>
                  <p className="text-xs text-slate-400 capitalize leading-tight">{user.role}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-bold uppercase shadow-sm shadow-primary-500/30 border-2 border-primary-100 cursor-pointer hover:shadow-md transition-shadow">
                  {userInitials}
                </div>
              </div>
            )}

            <div className="h-6 w-px bg-slate-100 mx-1" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Logout"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-150"
            >
              <FiLogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
