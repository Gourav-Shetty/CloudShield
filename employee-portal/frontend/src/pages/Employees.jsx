import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { 
  FiPlus, 
  FiSearch, 
  FiEdit, 
  FiTrash2, 
  FiChevronLeft, 
  FiChevronRight, 
  FiX, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiBriefcase,
  FiMapPin,
  FiMail,
  FiPhone,
  FiDollarSign,
  FiCalendar
} from 'react-icons/fi';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 8;

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEmpId, setCurrentEmpId] = useState(null);

  // Form Fields
  const [formFields, setFormFields] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: 'Engineering',
    position: '',
    salary: '',
    dateOfJoining: '',
    address: '',
    status: 'active',
  });

  // Delete confirmation modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [empToDelete, setEmpToDelete] = useState(null);

  const departmentsList = [
    'Engineering',
    'Human Resources',
    'Sales',
    'Marketing',
    'Finance',
    'Legal',
    'Product Management',
    'Security'
  ];

  // Fetch employees
  const fetchEmployees = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      if (searchQuery.trim()) {
        // Search API does not paginate in backend, so fetch all filtered
        const response = await api.get(`/employees/search?search=${encodeURIComponent(searchQuery)}`);
        if (response.data?.success) {
          const data = response.data.data || [];
          setEmployees(data);
          setTotalItems(data.length);
          setTotalPages(1);
        }
      } else {
        // Paginated standard API
        const response = await api.get(`/employees?page=${page}&limit=${itemsPerPage}`);
        if (response.data?.success) {
          setEmployees(response.data.data || []);
          const pag = response.data.pagination || {};
          setTotalItems(pag.total || 0);
          setTotalPages(pag.pages || 1);
          setCurrentPage(pag.page || 1);
        }
      }
    } catch (err) {
      console.error('Fetch Employees error:', err);
      setError('Could not retrieve employees. Make sure backend service is active.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, itemsPerPage]);

  // Trigger fetch when query or page changes
  useEffect(() => {
    fetchEmployees(currentPage);
  }, [currentPage, fetchEmployees]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchEmployees(1);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
    // Slight delay to allow state update or direct fetch
    setTimeout(() => {
      fetchEmployees(1);
    }, 50);
  };

  // Open Add modal
  const openAddModal = () => {
    setIsEditMode(false);
    setCurrentEmpId(null);
    setFormFields({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: 'Engineering',
      position: '',
      salary: '',
      dateOfJoining: new Date().toISOString().split('T')[0],
      address: '',
      status: 'active',
    });
    setError('');
    setModalOpen(true);
  };

  // Open Edit modal
  const openEditModal = (emp) => {
    setIsEditMode(true);
    setCurrentEmpId(emp._id);
    setFormFields({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      email: emp.email || '',
      phone: emp.phone || '',
      department: emp.department || 'Engineering',
      position: emp.position || '',
      salary: emp.salary || '',
      dateOfJoining: emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().split('T')[0] : '',
      address: emp.address || '',
      status: emp.status || 'active',
    });
    setError('');
    setModalOpen(true);
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormFields(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Submit employee form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Quick validation
    if (!formFields.firstName || !formFields.lastName || !formFields.email || !formFields.department || !formFields.position) {
      setError('Please fill in all required fields (First/Last Name, Email, Department, and Position)');
      return;
    }

    try {
      const payload = {
        ...formFields,
        salary: formFields.salary ? Number(formFields.salary) : undefined,
      };

      if (isEditMode) {
        const response = await api.put(`/employees/${currentEmpId}`, payload);
        if (response.data?.success) {
          showToast('Employee profile updated successfully.');
          setModalOpen(false);
          fetchEmployees(currentPage);
        }
      } else {
        const response = await api.post('/employees', payload);
        if (response.data?.success) {
          showToast('Employee created successfully.');
          setModalOpen(false);
          fetchEmployees(1);
        }
      }
    } catch (err) {
      console.error('Submit Employee error:', err);
      setError(err.response?.data?.message || 'Error occurred while saving employee records.');
    }
  };

  // Open delete confirm dialog
  const promptDelete = (emp) => {
    setEmpToDelete(emp);
    setDeleteConfirmOpen(true);
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!empToDelete) return;
    try {
      const response = await api.delete(`/employees/${empToDelete._id}`);
      if (response.data?.success) {
        showToast(`Employee record for ${empToDelete.firstName} ${empToDelete.lastName} has been deleted.`);
        setDeleteConfirmOpen(false);
        setEmpToDelete(null);
        fetchEmployees(currentPage);
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete the employee record.');
      setDeleteConfirmOpen(false);
    }
  };

  // Helper for displaying brief banner alert
  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <FiSearch size={18} />
          </div>
          <input
            type="text"
            placeholder="Search by first name, last name, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-11 pr-10 py-2.5 border border-slate-200 rounded-xl text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              <FiX size={18} />
            </button>
          )}
        </form>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-all duration-150 shadow-md shadow-primary-500/10 active:scale-[0.98]"
        >
          <FiPlus size={18} />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Dynamic Action Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center space-x-3 text-emerald-800 shadow-sm animate-slideDown">
          <FiCheckCircle className="shrink-0" size={20} />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm font-medium">Syncing employee catalog...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <FiBriefcase size={48} className="text-slate-300" />
            <p className="text-base font-semibold text-slate-500">No Employee Records Found</p>
            <p className="text-xs text-slate-400 text-center max-w-sm">
              We couldn't find any employees matching your search or filters. Try checking the search criteria or creating a new entry.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee ID</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Info</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Department & Position</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">
                        {emp.employeeId || 'Pending'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center uppercase text-sm">
                          {emp.firstName.substring(0, 1)}{emp.lastName.substring(0, 1)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-slate-400">Hired: {emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 space-y-0.5">
                      <div className="flex items-center text-xs text-slate-600">
                        <FiMail size={12} className="mr-1.5 shrink-0 text-slate-400" />
                        <span className="truncate max-w-[180px]">{emp.email}</span>
                      </div>
                      {emp.phone && (
                        <div className="flex items-center text-xs text-slate-500">
                          <FiPhone size={12} className="mr-1.5 shrink-0 text-slate-400" />
                          <span>{emp.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm font-semibold text-slate-700">{emp.position}</p>
                      <p className="text-xs text-slate-500">{emp.department}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border
                        ${emp.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                        }
                      `}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${emp.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {emp.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => openEditModal(emp)}
                          title="Edit employee records"
                          className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-150"
                        >
                          <FiEdit size={16} />
                        </button>
                        <button
                          onClick={() => promptDelete(emp)}
                          title="Delete employee profile"
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {!searchQuery && !loading && totalItems > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(currentPage * itemsPerPage, totalItems)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{totalItems}</span> employees
            </span>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                <FiChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-100 overflow-hidden my-8 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg">
                {isEditMode ? 'Modify Employee Profile' : 'Add New Employee'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center space-x-2.5 text-red-700 text-sm font-medium">
                  <FiAlertCircle className="shrink-0" size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    value={formFields.firstName}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm"
                    placeholder="Jane"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    value={formFields.lastName}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm"
                    placeholder="Doe"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <FiMail size={16} />
                    </div>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formFields.email}
                      onChange={handleInputChange}
                      className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm"
                      placeholder="jane.doe@cloudshield.ai"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <FiPhone size={16} />
                    </div>
                    <input
                      type="text"
                      name="phone"
                      value={formFields.phone}
                      onChange={handleInputChange}
                      className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm"
                      placeholder="+1 (555) 019-2834"
                    />
                  </div>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <FiBriefcase size={16} />
                    </div>
                    <select
                      name="department"
                      value={formFields.department}
                      onChange={handleInputChange}
                      className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm cursor-pointer"
                    >
                      {departmentsList.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Position */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Job Title / Position <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="position"
                    required
                    value={formFields.position}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm"
                    placeholder="Senior Security Engineer"
                  />
                </div>

                {/* Salary */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Annual Salary
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <FiDollarSign size={16} />
                    </div>
                    <input
                      type="number"
                      name="salary"
                      value={formFields.salary}
                      onChange={handleInputChange}
                      className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm"
                      placeholder="120000"
                    />
                  </div>
                </div>

                {/* Date of Joining */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Date of Joining
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <FiCalendar size={16} />
                    </div>
                    <input
                      type="date"
                      name="dateOfJoining"
                      value={formFields.dateOfJoining}
                      onChange={handleInputChange}
                      className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formFields.status}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Office / Home Address
                </label>
                <div className="relative">
                  <div className="absolute top-2.5 left-3 pointer-events-none text-slate-400">
                    <FiMapPin size={16} />
                  </div>
                  <textarea
                    name="address"
                    rows={2}
                    value={formFields.address}
                    onChange={handleInputChange}
                    className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm resize-none"
                    placeholder="123 Main St, Suite 400, Austin, TX"
                  ></textarea>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-primary-500/10 transition-all duration-150 active:scale-[0.98]"
                >
                  {isEditMode ? 'Update Record' : 'Create Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-scaleUp">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center shadow-inner">
                <FiTrash2 size={24} />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-800 text-base">Delete Employee Records?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you absolutely sure you want to delete the file and employee history for{' '}
                  <span className="font-semibold text-slate-800">{empToDelete?.firstName} {empToDelete?.lastName}</span>? 
                  This operation is permanent and cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setEmpToDelete(null);
                }}
                className="px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-red-500/10 transition-all duration-150 active:scale-[0.98]"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
