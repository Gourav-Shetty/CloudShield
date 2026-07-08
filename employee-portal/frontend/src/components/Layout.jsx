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
  FiBell
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

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-primary-900 text-white transition-all duration-300 ease-in-out lg:static
          ${sidebarOpen ? 'w-64' : 'w-20'} 
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-primary-800 bg-primary-950">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-500 text-white font-bold shrink-0 shadow-md">
              CS
            </div>
            {sidebarOpen && (
              <span className="font-semibold text-lg tracking-wider whitespace-nowrap bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">
                CloudShield AI
              </span>
            )}
          </div>
          {/* Close mobile menu */}
          <button 
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1 rounded-md text-primary-300 hover:text-white hover:bg-primary-800 lg:hidden"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`flex items-center px-3.5 py-3 rounded-xl transition-all duration-200 group relative
                  ${isActive 
                    ? 'bg-primary-600 text-white font-medium shadow-lg shadow-primary-900/40' 
                    : 'text-primary-200 hover:bg-primary-800/60 hover:text-white'
                  }
                `}
              >
                <Icon size={20} className={`shrink-0 ${isActive ? 'text-white' : 'text-primary-300 group-hover:text-white'}`} />
                {sidebarOpen ? (
                  <span className="ml-3 text-sm transition-opacity duration-200">{item.name}</span>
                ) : (
                  <span className="absolute left-16 scale-0 rounded bg-slate-900 px-2 py-1 text-xs text-white group-hover:scale-100 transition-all z-50 shadow-md whitespace-nowrap">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Collapse Toggle Button (Desktop Only) */}
        <div className="hidden lg:block border-t border-primary-800 p-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center justify-center w-full py-2.5 rounded-lg border border-primary-800 text-primary-300 hover:text-white hover:bg-primary-800/50 transition-all duration-200"
          >
            {sidebarOpen ? (
              <div className="flex items-center space-x-2 text-xs">
                <FiChevronLeft size={16} />
                <span>Collapse Menu</span>
              </div>
            ) : (
              <FiChevronRight size={16} />
            )}
          </button>
        </div>

        {/* Sidebar Footer / User Info when open */}
        {sidebarOpen && user && (
          <div className="border-t border-primary-800 p-4 bg-primary-950/40 lg:block hidden">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary-700 flex items-center justify-center font-semibold text-white uppercase shadow-inner border border-primary-600">
                {user.username.substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white">{user.username}</p>
                <p className="text-xs text-primary-400 capitalize truncate">{user.role}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200/80 shadow-sm shrink-0">
          <div className="flex items-center space-x-3">
            {/* Hamburger for mobile */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden focus:outline-none"
            >
              <FiMenu size={22} />
            </button>
            <h1 className="text-lg font-semibold text-slate-800 hidden sm:block">
              {menuItems.find(item => item.path === location.pathname)?.name || 'Employee Portal'}
            </h1>
          </div>

          {/* User profile dropdown and Logout */}
          <div className="flex items-center space-x-4">
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors relative">
              <FiBell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <div className="h-6 w-[1px] bg-slate-200"></div>

            {user && (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-semibold text-slate-700">{user.username}</p>
                  <p className="text-xs text-slate-400 capitalize">{user.role}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-semibold flex items-center justify-center uppercase border border-primary-200">
                  {user.username.substring(0, 2)}
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              title="Logout"
              className="flex items-center space-x-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            >
              <FiLogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
