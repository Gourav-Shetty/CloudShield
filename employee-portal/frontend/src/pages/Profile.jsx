import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FiUser, 
  FiMail, 
  FiSmartphone, 
  FiBriefcase, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiShield, 
  FiLock,
  FiEdit2
} from 'react-icons/fi';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  
  const [formFields, setFormFields] = useState({
    username: user?.username || '',
    email: user?.email || '',
    displayName: user?.displayName || user?.username || '',
    phone: user?.phone || '',
    department: user?.department || 'Administration',
    bio: user?.bio || 'CloudShield AI security coordinator.'
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormFields(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      // Save changes back to our Auth Context and LocalStorage
      updateProfile({
        email: formFields.email,
        displayName: formFields.displayName,
        phone: formFields.phone,
        department: formFields.department,
        bio: formFields.bio
      });

      setTimeout(() => {
        setSuccessMsg('Your profile configurations have been updated successfully.');
        setLoading(false);
      }, 800);

    } catch (err) {
      console.error(err);
      setError('An error occurred while updating profile.');
      setLoading(false);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar & Summary details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 text-center space-y-5">
            <div className="relative w-28 h-28 mx-auto">
              <div className="w-full h-full rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center font-bold text-primary-700 text-3xl uppercase shadow-inner">
                {user?.username?.substring(0, 2)}
              </div>
              <div className="absolute bottom-1 right-1 bg-primary-600 border border-white text-white p-1.5 rounded-full shadow-md cursor-pointer hover:bg-primary-700 transition-colors">
                <FiEdit2 size={12} />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-lg leading-snug">
                {formFields.displayName || user?.username}
              </h3>
              <p className="text-xs text-primary-600 font-semibold uppercase tracking-wider bg-primary-50 inline-block px-3 py-1 rounded-full border border-primary-100">
                {user?.role}
              </p>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              {formFields.bio}
            </p>

            <div className="pt-4 border-t border-slate-100 text-left space-y-3">
              <div className="flex items-center text-xs text-slate-600">
                <FiShield className="mr-2 text-slate-400 shrink-0" size={14} />
                <span>Account ID: <span className="font-semibold">{user?.id?.substring(0, 8) || 'N/A'}...</span></span>
              </div>
              <div className="flex-1 flex items-center text-xs text-slate-600">
                <FiMail className="mr-2 text-slate-400 shrink-0" size={14} />
                <span className="truncate">{formFields.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Profile details */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg">Account Details</h3>
              <p className="text-xs text-slate-400">Update account email and general profile statistics</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Username (Locked) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Username (System ID)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <FiLock size={16} />
                    </div>
                    <input
                      type="text"
                      disabled
                      value={formFields.username}
                      className="block w-full pl-11 pr-3 py-2.5 border border-slate-200 rounded-xl text-slate-400 bg-slate-100/50 select-none cursor-not-allowed text-sm"
                    />
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Display Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <FiUser size={16} />
                    </div>
                    <input
                      type="text"
                      name="displayName"
                      required
                      value={formFields.displayName}
                      onChange={handleInputChange}
                      className="block w-full pl-11 pr-3 py-2.5 border border-slate-200 rounded-xl text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm"
                      placeholder="Display Name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Contact Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <FiMail size={16} />
                    </div>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formFields.email}
                      onChange={handleInputChange}
                      className="block w-full pl-11 pr-3 py-2.5 border border-slate-200 rounded-xl text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Direct Phone Line
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <FiSmartphone size={16} />
                    </div>
                    <input
                      type="text"
                      name="phone"
                      value={formFields.phone}
                      onChange={handleInputChange}
                      className="block w-full pl-11 pr-3 py-2.5 border border-slate-200 rounded-xl text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm"
                      placeholder="+1 (555) 012-3456"
                    />
                  </div>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Assigned Department
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <FiBriefcase size={16} />
                    </div>
                    <input
                      type="text"
                      name="department"
                      value={formFields.department}
                      onChange={handleInputChange}
                      className="block w-full pl-11 pr-3 py-2.5 border border-slate-200 rounded-xl text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm"
                      placeholder="Administration"
                    />
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Professional Bio
                </label>
                <textarea
                  name="bio"
                  rows={4}
                  value={formFields.bio}
                  onChange={handleInputChange}
                  className="block w-full px-3.5 py-3 border border-slate-200 rounded-xl text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm resize-none"
                  placeholder="Short bio description..."
                ></textarea>
              </div>

              {/* Form Action */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-500/10 transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Save Settings'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;
