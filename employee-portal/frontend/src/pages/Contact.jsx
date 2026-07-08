import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { 
  FiMail, 
  FiUser, 
  FiFileText, 
  FiMessageSquare, 
  FiSend, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiInbox,
  FiEye,
  FiEyeOff
} from 'react-icons/fi';

const Contact = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Form Fields
  const [formFields, setFormFields] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch messages (Admin only)
  const fetchMessages = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/contact');
      if (response.data?.success) {
        setInbox(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching contact messages:', err);
      setError('Could not retrieve contact messages. Ensure server is active.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

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

  // Submit contact message
  const handleSubmitMessage = async (e) => {
    e.preventDefault();
    setError('');

    const { name, email, subject, message } = formFields;
    if (!name || !email || !message) {
      setError('Please provide your name, email address, and a message.');
      return;
    }

    setSubmitLoading(true);
    try {
      const response = await api.post('/contact', {
        name,
        email,
        subject,
        message
      });

      if (response.data?.success) {
        showToast('Your message has been dispatched successfully. An administrator will review it shortly.');
        setFormFields({
          name: '',
          email: '',
          subject: '',
          message: ''
        });
        // Reload list if admin submitted it
        if (isAdmin) {
          fetchMessages();
        }
      }
    } catch (err) {
      console.error('Submit contact message error:', err);
      setError(err.response?.data?.message || 'Error occurred while delivering message.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Mark message as read
  const handleMarkRead = async (msgId) => {
    try {
      const response = await api.put(`/contact/${msgId}`);
      if (response.data?.success) {
        showToast('Message marked as read.');
        fetchMessages();
      }
    } catch (err) {
      console.error('Mark read error:', err);
      setError('Could not update message read status.');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header Banner */}
      <div className="bg-gradient-to-r from-primary-800 to-primary-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-primary-950/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-2">
          <span className="text-xs md:text-sm font-semibold tracking-wider text-primary-200 uppercase bg-primary-900/40 px-3 py-1.5 rounded-full">
            Support Center
          </span>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">Contact Administration</h2>
          <p className="text-sm md:text-base text-primary-100/90 max-w-xl">
            Have a question, feedback, or need HR support? Send a secure message directly to portal coordinators.
          </p>
        </div>
      </div>

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
        
        {/* Left Side: Contact Form (Takes up 1 Column or more depending on view) */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-lg">Send Message</h3>
            <p className="text-xs text-slate-400">Complete the fields below to open a ticket</p>
          </div>

          <form onSubmit={handleSubmitMessage} className="p-6 space-y-5 flex-1">
            {/* Sender Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiUser size={18} />
                </div>
                <input
                  type="text"
                  name="name"
                  required
                  value={formFields.name}
                  onChange={handleInputChange}
                  className="block w-full pl-11 pr-3 py-2.5 border border-slate-200 rounded-xl text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiMail size={18} />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formFields.email}
                  onChange={handleInputChange}
                  className="block w-full pl-11 pr-3 py-2.5 border border-slate-200 rounded-xl text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm"
                  placeholder="john.doe@cloudshield.ai"
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Subject line
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiFileText size={18} />
                </div>
                <input
                  type="text"
                  name="subject"
                  value={formFields.subject}
                  onChange={handleInputChange}
                  className="block w-full pl-11 pr-3 py-2.5 border border-slate-200 rounded-xl text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm"
                  placeholder="Leave allocation, payroll, security concern..."
                />
              </div>
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Message Body <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute top-3.5 left-3.5 pointer-events-none text-slate-400">
                  <FiMessageSquare size={18} />
                </div>
                <textarea
                  name="message"
                  required
                  rows={5}
                  value={formFields.message}
                  onChange={handleInputChange}
                  className="block w-full pl-11 pr-3 py-3 border border-slate-200 rounded-xl text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150 text-sm resize-none"
                  placeholder="Draft your inquiries or request details..."
                ></textarea>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitLoading}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-500/10 transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
              >
                {submitLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <FiSend size={16} />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Inbox Messages Center (Visible to Admin only) */}
        <div className="lg:col-span-2 space-y-6">
          {isAdmin ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg flex items-center space-x-2">
                    <FiInbox size={20} className="text-slate-500" />
                    <span>Admin Inbox</span>
                  </h3>
                  <p className="text-xs text-slate-400">Incoming tickets and inquiries submitted via portal</p>
                </div>
                <span className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                  {inbox.filter(m => !m.isRead).length} Unread
                </span>
              </div>

              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-400 text-xs font-medium">Fetching incoming tickets...</p>
                </div>
              ) : inbox.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                  <FiInbox size={48} className="text-slate-300" />
                  <p className="text-sm font-semibold text-slate-500">Inbox is Clear</p>
                  <p className="text-xs text-slate-400">No contact messages have been registered in the system.</p>
                </div>
              ) : (
                <div className="p-6 space-y-4 max-h-[580px] overflow-y-auto divide-y divide-slate-100">
                  {inbox.map((msg) => {
                    const isMsgRead = msg.isRead;
                    return (
                      <div 
                        key={msg._id} 
                        className={`pt-4 first:pt-0 pb-2 space-y-2 group transition-all duration-150`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-slate-800 text-sm">{msg.name}</h4>
                              <a 
                                href={`mailto:${msg.email}`}
                                className="text-xs text-slate-400 hover:text-primary-600 hover:underline"
                              >
                                ({msg.email})
                              </a>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Received: {new Date(msg.createdAt).toLocaleString()}
                            </p>
                          </div>
                          
                          {!isMsgRead ? (
                            <button
                              onClick={() => handleMarkRead(msg._id)}
                              className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200/50 rounded-lg transition-colors"
                            >
                              <FiEyeOff size={12} />
                              <span>Mark Read</span>
                            </button>
                          ) : (
                            <span className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-200/40 rounded-lg select-none">
                              <FiEye size={12} />
                              <span>Read</span>
                            </span>
                          )}
                        </div>

                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1.5">
                          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Subject: {msg.subject || <span className="text-slate-400 italic">No Subject</span>}
                          </p>
                          
                          {/* 
                            VULNERABILITY NOTE: 
                            The backend stores message raw. Standard React rendering ({msg.message})
                            sanitizes by default preventing XSS. For safety we render standard React text.
                          */}
                          <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed font-medium">
                            {msg.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-primary-50/50 border border-primary-100 p-6 rounded-2xl h-full flex flex-col justify-center text-center space-y-3">
              <FiInbox size={36} className="text-primary-500 mx-auto" />
              <h4 className="font-bold text-slate-800 text-base">Portal Inquiries Desk</h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                Only authenticated portal administrators have permissions to view the support inbox desk and manage employee inquiries.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Contact;
