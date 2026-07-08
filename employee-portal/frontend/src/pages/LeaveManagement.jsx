import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { 
  FiCalendar, 
  FiFileText, 
  FiUser, 
  FiCheck, 
  FiX, 
  FiClock, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiRefreshCw
} from 'react-icons/fi';

const LeaveManagement = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('list'); // 'apply' or 'list'
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Apply Form Fields
  const [formFields, setFormFields] = useState({
    employeeId: '',
    type: 'sick',
    fromDate: '',
    toDate: '',
    reason: ''
  });

  // Fetch employees and leave requests
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [leavesRes, empsRes] = await Promise.all([
        api.get('/leaves'),
        api.get('/employees?limit=100')
      ]);

      if (leavesRes.data?.success) {
        setLeaves(leavesRes.data.data || []);
      }
      
      if (empsRes.data?.success) {
        const empList = empsRes.data.data || [];
        setEmployees(empList);
        if (empList.length > 0) {
          setFormFields(prev => {
            if (!prev.employeeId) {
              return { ...prev, employeeId: empList[0]._id };
            }
            return prev;
          });
        }
      }
    } catch (err) {
      console.error('Error fetching leave management data:', err);
      setError('Could not retrieve leave applications. Ensure server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormFields(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg('');
    }, 4500);
  };

  // Submit new leave request
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setError('');

    const { employeeId, type, fromDate, toDate, reason } = formFields;
    if (!employeeId || !type || !fromDate || !toDate) {
      setError('Please fill in all required fields (Employee, Type, Dates).');
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      setError('The "From Date" cannot be after the "To Date".');
      return;
    }

    setSubmitLoading(true);
    try {
      // Find employee details to pass name alongside
      const selectedEmp = employees.find(emp => emp._id === employeeId);
      const employeeName = selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName}` : 'Unknown';

      const response = await api.post('/leaves', {
        employeeId,
        employeeName,
        type,
        fromDate,
        toDate,
        reason
      });

      if (response.data?.success) {
        showToast('Your leave request has been submitted successfully.');
        setFormFields({
          employeeId: employees[0]?._id || '',
          type: 'sick',
          fromDate: '',
          toDate: '',
          reason: ''
        });
        setActiveTab('list');
        fetchData();
      }
    } catch (err) {
      console.error('Apply leave error:', err);
      setError(err.response?.data?.message || 'Error submitting leave request.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Approve or Reject leave request
  const handleUpdateStatus = async (leaveId, newStatus) => {
    setError('');
    try {
      const response = await api.put(`/leaves/${leaveId}`, {
        status: newStatus,
        approvedBy: user?.username || 'Admin'
      });

      if (response.data?.success) {
        showToast(`Leave request status has been updated to ${newStatus}.`);
        fetchData();
      }
    } catch (err) {
      console.error('Update status error:', err);
      setError('Could not update the leave request status.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Dynamic Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center space-x-3 text-emerald-800 shadow-sm animate-slideDown">
          <FiCheckCircle className="shrink-0" size={20} />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center space-x-3 text-red-700 shadow-sm">
          <FiAlertCircle className="shrink-0" size={20} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex bg-slate-200/60 p-1.5 rounded-2xl max-w-md border border-slate-300/30">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center space-x-2
            ${activeTab === 'list' 
              ? 'bg-white text-slate-800 shadow-sm border border-slate-200/30' 
              : 'text-slate-500 hover:text-slate-800'
            }
          `}
        >
          <FiFileText size={16} />
          <span>Leave Request Register</span>
        </button>
        <button
          onClick={() => setActiveTab('apply')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center space-x-2
            ${activeTab === 'apply' 
              ? 'bg-white text-slate-800 shadow-sm border border-slate-200/30' 
              : 'text-slate-500 hover:text-slate-800'
            }
          `}
        >
          <FiCalendar size={16} />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* TAB CONTENTS */}
      {activeTab === 'apply' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm max-w-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-lg">Leave Application Form</h3>
            <p className="text-xs text-slate-400">Request formal leave from active projects</p>
          </div>

          <form onSubmit={handleApplyLeave} className="p-6 space-y-5">
            {/* Employee Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Applying Employee <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiUser size={18} />
                </div>
                <select
                  name="employeeId"
                  required
                  value={formFields.employeeId}
                  onChange={handleInputChange}
                  className="block w-full pl-11 pr-3 py-3 border border-slate-200 rounded-xl text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm cursor-pointer"
                >
                  {employees.length === 0 ? (
                    <option value="" disabled>No active employees found to link</option>
                  ) : (
                    employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeId || 'No ID'})
                      </option>
                    ))
                  )}
                </select>
              </div>
              {employees.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600 font-medium">
                  Note: You must add an employee in the "Employees" tab first to apply for leaves.
                </p>
              )}
            </div>

            {/* Leave Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Leave Category <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                required
                value={formFields.type}
                onChange={handleInputChange}
                className="block w-full px-3.5 py-3 border border-slate-200 rounded-xl text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm cursor-pointer"
              >
                <option value="sick">Sick Leave</option>
                <option value="casual">Casual Leave</option>
                <option value="annual">Annual Leave</option>
                <option value="maternity">Maternity Leave</option>
              </select>
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  From Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="fromDate"
                  required
                  value={formFields.fromDate}
                  onChange={handleInputChange}
                  className="block w-full px-3.5 py-3 border border-slate-200 rounded-xl text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  To Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="toDate"
                  required
                  value={formFields.toDate}
                  onChange={handleInputChange}
                  className="block w-full px-3.5 py-3 border border-slate-200 rounded-xl text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm"
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Detailed Reason / Notes
              </label>
              <textarea
                name="reason"
                rows={4}
                value={formFields.reason}
                onChange={handleInputChange}
                className="block w-full px-3.5 py-3 border border-slate-200 rounded-xl text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm resize-none"
                placeholder="Brief description of the reason for leave..."
              ></textarea>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={submitLoading || employees.length === 0}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-500/10 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {submitLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Submit Leave Application'
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Leave Request Register</h3>
              <p className="text-xs text-slate-400">Log of active leave applications across the organization</p>
            </div>
            <button
              onClick={fetchData}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors"
              title="Reload register log"
            >
              <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 text-sm font-medium">Syncing leave database...</p>
            </div>
          ) : leaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <FiCalendar size={48} className="text-slate-300" />
              <p className="text-base font-semibold text-slate-500">No Leave Requests Logged</p>
              <p className="text-xs text-slate-400 text-center max-w-sm">
                No leave requests have been logged in the portal yet. Use the application tab to file your first request.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Requested Period</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason Details</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    {isAdmin && <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaves.map((leave) => {
                    const statusLower = (leave.status || 'pending').toLowerCase();
                    // Resolve name
                    let empName = leave.employeeName;
                    let empIdCode = 'N/A';
                    if (leave.employeeId && typeof leave.employeeId === 'object') {
                      empName = `${leave.employeeId.firstName || ''} ${leave.employeeId.lastName || ''}`.trim() || empName;
                      empIdCode = leave.employeeId.employeeId || empIdCode;
                    }

                    return (
                      <tr key={leave._id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-4 px-6">
                          <p className="text-sm font-bold text-slate-700">{empName || 'System User'}</p>
                          <p className="text-xs text-slate-400">ID: {empIdCode}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg uppercase">
                            {leave.type}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-sm font-semibold text-slate-700">
                            {new Date(leave.fromDate).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-slate-400">to {new Date(leave.toDate).toLocaleDateString()}</p>
                        </td>
                        <td className="py-4 px-6 max-w-xs">
                          <p className="text-xs text-slate-600 line-clamp-2" title={leave.reason}>
                            {leave.reason || <span className="text-slate-400 italic">No notes provided</span>}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border
                            ${statusLower === 'approved' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : statusLower === 'rejected' 
                              ? 'bg-rose-50 text-rose-700 border-rose-100' 
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                            }
                          `}>
                            {statusLower === 'approved' && <FiCheck className="mr-1" />}
                            {statusLower === 'rejected' && <FiX className="mr-1" />}
                            {statusLower === 'pending' && <FiClock className="mr-1" />}
                            <span className="capitalize">{leave.status}</span>
                          </span>
                          {leave.approvedBy && (
                            <p className="text-[10px] text-slate-400 mt-1">By: {leave.approvedBy}</p>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="py-4 px-6 text-right">
                            {statusLower === 'pending' ? (
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  onClick={() => handleUpdateStatus(leave._id, 'approved')}
                                  title="Approve request"
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 border border-emerald-200/50 hover:border-emerald-300 rounded-lg transition-all duration-150"
                                >
                                  <FiCheck size={16} />
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(leave._id, 'rejected')}
                                  title="Reject request"
                                  className="p-1.5 text-red-600 hover:bg-red-50 border border-red-200/50 hover:border-red-300 rounded-lg transition-all duration-150"
                                >
                                  <FiX size={16} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Resolved</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
