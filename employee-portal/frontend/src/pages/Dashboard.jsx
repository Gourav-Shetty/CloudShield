import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  FiUsers,
  FiCalendar,
  FiBriefcase,
  FiMessageSquare,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiPlusCircle,
  FiUserPlus,
  FiBarChart2,
  FiTrendingUp,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

/* ─── CountUp Hook ─── */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let start = null;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

/* ─── Live Clock ─── */
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const datePart = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const timePart = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return (
    <div className="text-right hidden sm:block">
      <p className="text-blue-100 text-sm font-medium">{dayName}, {datePart}</p>
      <p className="text-blue-200/70 text-xs font-mono mt-0.5">{timePart}</p>
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({ label, value, icon: Icon, iconBg, iconColor, accentColor, footerLabel, footerTo, trend }) {
  const displayed = useCountUp(value);
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group relative`}>
      {/* left accent border */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${accentColor}`} />

      <div className="p-6 pl-7">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
            <h3 className="text-4xl font-extrabold text-slate-800 tracking-tight tabular-nums">{displayed}</h3>
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                <FiTrendingUp size={11} className="text-emerald-500" />
                <span className="text-[11px] font-semibold text-emerald-600">{trend}</span>
              </div>
            )}
          </div>
          <div className={`p-3.5 rounded-2xl shrink-0 ${iconBg} group-hover:scale-110 transition-transform duration-200`}>
            <Icon size={22} className={iconColor} />
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100">
          <Link to={footerTo} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-primary-600 transition-colors group/link">
            <span>{footerLabel}</span>
            <FiArrowRight size={11} className="group-hover/link:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Dashboard ─── */
const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ employees: 0, pendingLeaves: 0, departments: 5, messages: 0 });
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');
      try {
        // 1. Fetch system stats
        const statsRes = await api.get('/admin/stats');
        const systemStats = statsRes.data?.data || {};

        // 2. Fetch leaves to calculate pending leaves & get recent list
        const leavesRes = await api.get('/leaves');
        const leaves = leavesRes.data?.data || [];
        const pendingCount = leaves.filter(l => l.status === 'pending' || l.status === 'Pending').length;

        // 3. Fetch employees to extract department list
        const employeesRes = await api.get('/employees?limit=100');
        const employees = employeesRes.data?.data || [];
        const uniqueDepts = new Set(employees.map(emp => emp.department).filter(Boolean));
        const departmentCount = uniqueDepts.size > 0 ? uniqueDepts.size : 5;

        // 4. Fetch contact messages
        const contactRes = await api.get('/contact');
        const contacts = contactRes.data?.data || [];

        setStats({
          employees: systemStats.employees || employees.length || 0,
          pendingLeaves: pendingCount,
          departments: departmentCount,
          messages: systemStats.contacts || contacts.length || 0,
        });

        setRecentLeaves(leaves.slice(0, 5));
        setRecentMessages(contacts.slice(0, 3));
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Failed to load system statistics. Please verify backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium text-sm">Gathering real-time workspace analytics...</p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Employees',
      value: stats.employees,
      icon: FiUsers,
      iconBg: 'bg-blue-50',
      iconColor: 'text-primary-600',
      accentColor: 'bg-primary-500',
      footerLabel: 'View all employees',
      footerTo: '/employees',
      trend: '+2% this month',
    },
    {
      label: 'Pending Leaves',
      value: stats.pendingLeaves,
      icon: FiCalendar,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      accentColor: 'bg-amber-400',
      footerLabel: 'Review requests',
      footerTo: '/leave',
      trend: null,
    },
    {
      label: 'Departments',
      value: stats.departments,
      icon: FiBriefcase,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      accentColor: 'bg-indigo-500',
      footerLabel: 'Manage departments',
      footerTo: '/employees',
      trend: null,
    },
    {
      label: 'Inbox Messages',
      value: stats.messages,
      icon: FiMessageSquare,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      accentColor: 'bg-emerald-500',
      footerLabel: 'Open inbox',
      footerTo: '/contact',
      trend: '+5 today',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ── Hero Banner ── */}
      <div
        className="rounded-3xl overflow-hidden relative shadow-xl shadow-primary-950/20"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)' }}
      >
        {/* Mesh pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Glow blob */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-blue-400/20 blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 p-7 md:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.2em] text-blue-200 uppercase bg-white/10 border border-white/10 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse" />
              Workspace Dashboard
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
              {getGreeting()}, <span className="text-blue-200">{user?.username}</span>!
            </h2>
            <p className="text-sm md:text-base text-blue-100/80 max-w-lg leading-relaxed">
              Welcome to the CloudShield AI HR portal. Here's a quick snapshot of your organization today.
            </p>
          </div>
          <LiveClock />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800">
          <FiAlertCircle className="shrink-0" size={20} />
          <span className="text-sm font-medium">{error} (Using default fallback displays)</span>
        </div>
      )}

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div className="flex flex-wrap gap-3">
        <Link to="/leave" className="btn-primary gap-2 text-sm">
          <FiPlusCircle size={16} />
          New Leave Request
        </Link>
        <Link to="/employees" className="btn-secondary gap-2 text-sm">
          <FiUserPlus size={16} />
          Add Employee
        </Link>
        <Link to="/contact" className="btn-secondary gap-2 text-sm">
          <FiBarChart2 size={16} />
          View Reports
        </Link>
      </div>

      {/* ── Bottom Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Leave Requests table */}
        <div className="lg:col-span-2 card overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-base">Recent Leave Requests</h4>
              <p className="text-xs text-slate-400 mt-0.5">Latest applications submitted by staff</p>
            </div>
            <Link
              to="/leave"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
            >
              View All <FiArrowRight size={12} />
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {recentLeaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-14 text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <FiClock size={22} className="text-slate-300" />
                </div>
                <p className="text-sm font-medium">No leave applications found.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="py-3 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Employee</th>
                    <th className="py-3 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                    <th className="py-3 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Dates</th>
                    <th className="py-3 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeaves.map((leave, idx) => {
                    const statusLower = (leave.status || 'pending').toLowerCase();
                    return (
                      <tr
                        key={leave._id}
                        className={`border-b border-slate-50 hover:bg-primary-50/30 transition-colors duration-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                      >
                        <td className="py-4 px-6">
                          <p className="text-sm font-semibold text-slate-700">
                            {leave.employeeName || (leave.employeeId?.firstName ? `${leave.employeeId.firstName} ${leave.employeeId.lastName}` : 'System User')}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            ID: {leave.employeeId?.employeeId || leave.employeeId?._id?.substring(0, 8) || 'N/A'}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-block text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg font-semibold border border-slate-200/50">
                            {leave.type}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-xs font-semibold text-slate-700">{new Date(leave.fromDate).toLocaleDateString()}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">to {new Date(leave.toDate).toLocaleDateString()}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border
                              ${statusLower === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : statusLower === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border-rose-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                              }
                            `}
                          >
                            {statusLower === 'approved' && <FiCheckCircle size={11} />}
                            {statusLower === 'pending' && <FiClock size={11} />}
                            {leave.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* System Messages panel */}
        <div className="card p-6 flex flex-col gap-5">
          <div className="border-b border-slate-100 pb-4">
            <h4 className="font-bold text-slate-800 text-base">System Messages</h4>
            <p className="text-xs text-slate-400 mt-0.5">Latest queries from users</p>
          </div>

          <div className="flex-1 space-y-3">
            {recentMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 space-y-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <FiMessageSquare size={22} className="text-slate-300" />
                </div>
                <p className="text-xs font-medium">No system messages yet.</p>
              </div>
            ) : (
              recentMessages.map((msg) => (
                <div
                  key={msg._id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 hover:border-primary-200 hover:bg-primary-50/20 transition-all duration-150"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-xs font-bold text-slate-700 truncate">{msg.name}</h5>
                    <span className="text-[10px] text-slate-400 shrink-0">{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs font-semibold text-primary-600 truncate">{msg.subject || 'No Subject'}</p>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{msg.message}</p>
                </div>
              ))
            )}
          </div>

          <Link
            to="/contact"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:text-primary-600 hover:border-primary-300 hover:bg-primary-50/30 text-xs font-bold transition-all duration-200"
          >
            <FiMessageSquare size={13} />
            Go to Messaging Center
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
