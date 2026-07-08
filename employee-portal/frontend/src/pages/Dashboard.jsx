import React, { useEffect, useState } from 'react';
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
  FiAlertCircle 
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    employees: 0,
    pendingLeaves: 0,
    departments: 5,
    messages: 0
  });
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
          messages: systemStats.contacts || contacts.length || 0
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
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Gathering real-time workspace analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner Greeting */}
      <div className="bg-gradient-to-r from-primary-800 to-primary-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-primary-950/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <span className="text-xs md:text-sm font-semibold tracking-wider text-primary-200 uppercase bg-primary-900/40 px-3 py-1.5 rounded-full">
            Workspace Dashboard
          </span>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">
            {getGreeting()}, {user?.username}!
          </h2>
          <p className="text-sm md:text-base text-primary-100/90 max-w-xl">
            Welcome to the CloudShield AI HR portal. Here is a quick snapshot of your organization today.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center space-x-3 text-amber-800">
          <FiAlertCircle className="shrink-0" size={20} />
          <span className="text-sm font-medium">{error} (Using default fallback displays)</span>
        </div>
      )}

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat 1: Total Employees */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Total Employees</p>
              <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{stats.employees}</h3>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50 text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-all duration-200">
              <FiUsers size={24} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-xs text-slate-500 font-medium">
            <Link to="/employees" className="text-primary-600 hover:text-primary-700 flex items-center space-x-1 hover:underline">
              <span>View details</span>
              <FiArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Stat 2: Pending Leaves */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-amber-200 transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Pending Leaves</p>
              <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{stats.pendingLeaves}</h3>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-200">
              <FiCalendar size={24} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-xs text-slate-500 font-medium">
            <Link to="/leave" className="text-amber-600 hover:text-amber-700 flex items-center space-x-1 hover:underline">
              <span>Review requests</span>
              <FiArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Stat 3: Departments */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Departments</p>
              <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{stats.departments}</h3>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200">
              <FiBriefcase size={24} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-xs text-slate-500 font-medium">
            <Link to="/employees" className="text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 hover:underline">
              <span>Manage departments</span>
              <FiArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Stat 4: Messages */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Inbox Messages</p>
              <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{stats.messages}</h3>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200">
              <FiMessageSquare size={24} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-xs text-slate-500 font-medium">
            <Link to="/contact" className="text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 hover:underline">
              <span>Open inbox</span>
              <FiArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Section: Recent Leaves & Quick Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Recent Leave Requests */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="font-bold text-slate-800 text-lg">Recent Leave Requests</h4>
              <p className="text-xs text-slate-400">Latest leave applications submitted by staff</p>
            </div>
            <Link to="/leave" className="text-xs font-semibold text-primary-600 hover:underline">
              View All
            </Link>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            {recentLeaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-2">
                <FiClock size={36} className="text-slate-300" />
                <p className="text-sm font-medium">No leave applications found.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                    <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Dates</th>
                    <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentLeaves.map((leave) => {
                    const statusLower = (leave.status || 'pending').toLowerCase();
                    return (
                      <tr key={leave._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-6">
                          <p className="text-sm font-semibold text-slate-700">
                            {leave.employeeName || (leave.employeeId?.firstName ? `${leave.employeeId.firstName} ${leave.employeeId.lastName}` : 'System User')}
                          </p>
                          <p className="text-xs text-slate-400">
                            ID: {leave.employeeId?.employeeId || leave.employeeId?._id?.substring(0, 8) || 'N/A'}
                          </p>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="text-sm text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg font-medium border border-slate-200/50">
                            {leave.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-6">
                          <p className="text-xs font-semibold text-slate-700">
                            {new Date(leave.fromDate).toLocaleDateString()}
                          </p>
                          <p className="text-[10px] text-slate-400">to {new Date(leave.toDate).toLocaleDateString()}</p>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border
                            ${statusLower === 'approved' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : statusLower === 'rejected' 
                              ? 'bg-rose-50 text-rose-700 border-rose-100' 
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                            }
                          `}>
                            {statusLower === 'approved' && <FiCheckCircle className="mr-1" size={12} />}
                            {statusLower === 'pending' && <FiClock className="mr-1" size={12} />}
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

        {/* Right Side: Quick Action & Messages Panel */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="space-y-0.5 border-b border-slate-100 pb-4">
            <h4 className="font-bold text-slate-800 text-lg">System Messages</h4>
            <p className="text-xs text-slate-400">Latest general queries from users</p>
          </div>

          <div className="space-y-4">
            {recentMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 space-y-2 text-center">
                <FiMessageSquare size={30} className="text-slate-300" />
                <p className="text-xs font-medium">No system messages yet.</p>
              </div>
            ) : (
              recentMessages.map((msg) => (
                <div key={msg._id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1 hover:border-primary-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-700">{msg.name}</h5>
                    <span className="text-[10px] text-slate-400">{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs font-semibold text-primary-600 truncate">{msg.subject || 'No Subject'}</p>
                  <p className="text-xs text-slate-500 line-clamp-2">{msg.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <Link 
              to="/contact" 
              className="w-full flex items-center justify-center py-3 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:text-primary-600 hover:border-primary-400 text-xs font-semibold transition-all duration-200"
            >
              Go to Messaging Center
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
