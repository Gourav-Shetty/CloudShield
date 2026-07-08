import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiLock, FiUser, FiAlertCircle, FiShield } from 'react-icons/fi';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    const storedError = localStorage.getItem('login_error');
    if (storedError) {
      setError(storedError);
      localStorage.removeItem('login_error');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await login(username, password);
      if (res.success) {
        navigate(from, { replace: true });
      } else {
        setError(res.message || 'Invalid username or password');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden font-sans">
      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%)' }}
      >
        {/* Animated floating blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Blob 1 */}
          <div
            className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl"
            style={{
              background: 'radial-gradient(circle, #3b82f6, #1d4ed8)',
              top: '-8%',
              left: '-12%',
              animation: 'float1 8s ease-in-out infinite',
            }}
          />
          {/* Blob 2 */}
          <div
            className="absolute w-80 h-80 rounded-full opacity-15 blur-3xl"
            style={{
              background: 'radial-gradient(circle, #60a5fa, #0ea5e9)',
              bottom: '5%',
              right: '-8%',
              animation: 'float2 10s ease-in-out infinite',
            }}
          />
          {/* Blob 3 */}
          <div
            className="absolute w-64 h-64 rounded-full opacity-10 blur-2xl"
            style={{
              background: 'radial-gradient(circle, #a5b4fc, #6366f1)',
              top: '40%',
              right: '15%',
              animation: 'float3 12s ease-in-out infinite',
            }}
          />
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Left panel content */}
        <div className="relative z-10 px-16 max-w-xl text-white space-y-10">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm shadow-xl">
              <FiShield size={28} className="text-blue-300" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.25em] text-blue-300 uppercase">CloudShield Corp</p>
              <p className="text-2xl font-bold text-white leading-tight">Employee Portal</p>
            </div>
          </div>

          {/* Quote */}
          <div className="border-l-4 border-blue-400/60 pl-6 space-y-2">
            <p className="text-xl font-light text-white/90 leading-relaxed italic">
              "Empowering teams with intelligent HR tools for a smarter, more connected workplace."
            </p>
            <p className="text-sm font-semibold text-blue-300">— CloudShield Corp</p>
          </div>

          {/* Feature bullets */}
          <div className="space-y-4">
            {[
              { icon: '🛡️', title: 'Secure Access', desc: 'Enterprise-grade authentication' },
              { icon: '📊', title: 'Real-time Analytics', desc: 'Live workforce insights' },
              { icon: '⚡', title: 'Fast & Reliable', desc: 'Built for performance at scale' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-lg shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs text-blue-200/70">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CSS for floating animations */}
        <style>{`
          @keyframes float1 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(30px, -30px) scale(1.05); }
          }
          @keyframes float2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-20px, 20px) scale(1.08); }
          }
          @keyframes float3 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(15px, 25px) scale(0.95); }
          }
        `}</style>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-md space-y-8 animate-fadeIn">
          {/* Mobile logo (shown only on small screens) */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center shadow-md">
              <FiShield size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800">CloudShield Corp</span>
          </div>

          {/* Heading */}
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              Sign in to your employee portal account
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex items-start gap-3 text-red-700 animate-slideUp">
              <FiAlertCircle className="mt-0.5 shrink-0" size={18} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiUser size={16} />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiLock size={16} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {/* Remember me + forgot */}
            <div className="flex items-center justify-between pt-1">
              <label htmlFor="remember-me" className="flex items-center gap-2.5 cursor-pointer select-none group">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 accent-primary-600 transition-colors"
                />
                <span className="text-sm text-slate-600 font-medium group-hover:text-slate-800 transition-colors">
                  Remember me
                </span>
              </label>
              <span className="text-sm font-semibold text-primary-600 hover:text-primary-700 cursor-pointer transition-colors">
                Forgot password?
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Sign In →'
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center text-xs text-slate-400 pt-2">
            By signing in, you agree to CloudShield Corp's{' '}
            <span className="text-primary-500 font-medium cursor-pointer hover:underline">Terms of Use</span>
            {' '}and{' '}
            <span className="text-primary-500 font-medium cursor-pointer hover:underline">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
