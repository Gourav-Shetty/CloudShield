import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiShield, FiLock, FiUser, FiAlertCircle, FiActivity } from 'react-icons/fi';

/* ─── Floating particle background ───────────────────────────────
   Pure CSS + inline keyframe-based particles rendered as small
   absolutely-positioned divs. No canvas, no heavy deps.
*/
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  size: `${Math.random() * 2 + 1}px`,
  delay: `${Math.random() * 8}s`,
  duration: `${6 + Math.random() * 10}s`,
  color: i % 3 === 0 ? '#00d4ff' : i % 3 === 1 ? '#00ff88' : '#a855f7',
  opacity: 0.2 + Math.random() * 0.4,
}));

const Login = () => {
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [bootText, setBootText]     = useState('');
  const bootRef = useRef(null);

  const { login } = useAuth();
  const navigate  = useNavigate();

  /* Typewriter boot sequence */
  useEffect(() => {
    const lines = [
      'INITIALIZING CLOUDSHIELD AI...',
      'LOADING THREAT INTELLIGENCE...',
      'SOC GATEWAY READY.',
    ];
    let lineIdx  = 0;
    let charIdx  = 0;
    let fullText = '';

    const type = () => {
      if (lineIdx >= lines.length) return;
      const line = lines[lineIdx];
      if (charIdx < line.length) {
        fullText += line[charIdx];
        setBootText(fullText);
        charIdx++;
        bootRef.current = setTimeout(type, 35);
      } else {
        fullText += '\n';
        setBootText(fullText);
        lineIdx++;
        charIdx = 0;
        bootRef.current = setTimeout(type, 300);
      }
    };

    bootRef.current = setTimeout(type, 400);
    return () => clearTimeout(bootRef.current);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) { setLocalError('Please fill in all fields.'); return; }
    setLocalError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setLocalError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060910] relative overflow-hidden font-sans">

      {/* ── CSS grid background ────────────────────────────────── */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* ── Radial ambient glows ───────────────────────────────── */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyber-blue/[0.06] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyber-purple/[0.06] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-2/3 left-1/2 w-[300px] h-[300px] bg-cyber-green/[0.04] rounded-full blur-[80px] pointer-events-none" />

      {/* ── Floating particles ─────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: p.left,
              bottom: '-4px',
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.opacity,
              animation: `particle ${p.duration} ${p.delay} linear infinite`,
              boxShadow: `0 0 4px ${p.color}`,
            }}
          />
        ))}
      </div>

      {/* ── Login card ────────────────────────────────────────── */}
      <div className="relative w-full max-w-md mx-4 z-10">

        {/* Outer animated border glow */}
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-cyber-blue/30 via-cyber-purple/20 to-cyber-blue/10 blur-[1px] pointer-events-none" />
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-cyber-blue/15 via-transparent to-transparent pointer-events-none" />

        <div className="relative bg-[#0a0d14]/90 backdrop-blur-xl rounded-2xl border border-cyber-blue/15 p-8 shadow-[0_0_60px_rgba(0,212,255,0.08)]">

          {/* ── Shield logo header ─────────────────────────────── */}
          <div className="flex flex-col items-center mb-8">
            {/* Animated glow rings */}
            <div className="relative mb-5">
              <div className="absolute inset-[-16px] rounded-full border border-cyber-blue/10 animate-pulse-slow" />
              <div className="absolute inset-[-10px] rounded-full border border-cyber-blue/15 animate-pulse-slow" style={{ animationDelay: '0.5s' }} />
              <div className="absolute inset-[-4px] rounded-full border border-cyber-blue/25" />

              {/* Shield icon container */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyber-blue/15 to-cyber-blue/5 border border-cyber-blue/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,212,255,0.2),inset_0_0_20px_rgba(0,212,255,0.05)]">
                <FiShield className="w-7 h-7 text-cyber-blue drop-shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-lg font-bold tracking-[0.3em] text-white font-mono uppercase">
                CloudShield <span className="text-cyber-blue">AI</span>
              </h2>
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.25em] mt-1">
                Security Operations Center
              </p>
              <div className="mt-2 h-px w-24 mx-auto bg-gradient-to-r from-transparent via-cyber-blue/40 to-transparent" />
            </div>
          </div>

          {/* Boot text console */}
          <div className="mb-6 px-3 py-2 bg-black/30 rounded border border-white/[0.04]">
            <pre className="text-[9px] font-mono text-cyber-green/70 whitespace-pre-wrap leading-relaxed min-h-[42px]">
              {bootText}<span className="animate-pulse">_</span>
            </pre>
          </div>

          {/* Error alert */}
          {localError && (
            <div className="mb-5 p-3.5 rounded-xl bg-cyber-red/[0.08] border border-cyber-red/25 text-cyber-red text-[11px] font-mono flex items-start gap-2.5 animate-fadeIn">
              <FiAlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{localError}</span>
            </div>
          )}

          {/* ── Form ─────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-medium text-gray-500 uppercase tracking-[0.2em] block">
                Operator ID
              </label>
              <div className="relative group/field">
                <FiUser className="absolute inset-y-0 left-3.5 my-auto w-3.5 h-3.5 text-gray-600 group-focus-within/field:text-cyber-blue transition-colors" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="analyst_codename"
                  disabled={submitting}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-cyber-blue/50 focus:bg-white/[0.05] focus:shadow-[0_0_0_1px_rgba(0,212,255,0.15),0_0_20px_rgba(0,212,255,0.05)] transition-all duration-200 font-mono text-[13px]"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-medium text-gray-500 uppercase tracking-[0.2em] block">
                Access Key
              </label>
              <div className="relative group/field">
                <FiLock className="absolute inset-y-0 left-3.5 my-auto w-3.5 h-3.5 text-gray-600 group-focus-within/field:text-cyber-blue transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={submitting}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-cyber-blue/50 focus:bg-white/[0.05] focus:shadow-[0_0_0_1px_rgba(0,212,255,0.15),0_0_20px_rgba(0,212,255,0.05)] transition-all duration-200 font-mono text-[13px]"
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full relative group/btn overflow-hidden rounded-xl py-3.5 font-semibold text-sm tracking-[0.15em] uppercase text-[#060910] font-mono shadow-lg transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,212,255,0.3)] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyber-blue via-[#00b8e6] to-cyber-green transition-all duration-300 group-hover/btn:opacity-90" />
              {/* Shimmer on hover */}
              <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-all duration-700 ease-out" />
              <span className="relative z-10 flex items-center justify-center gap-2 font-bold">
                {submitting ? (
                  <>
                    <span className="animate-spin w-4 h-4 border-2 border-[#060910]/30 border-t-[#060910] rounded-full" />
                    AUTHENTICATING...
                  </>
                ) : (
                  <>
                    <FiShield className="w-4 h-4" />
                    ESTABLISH SECURE CONNECTION
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Footer hint */}
          <div className="mt-6 pt-5 border-t border-white/[0.04] text-center">
            <p className="text-[10px] text-gray-700 font-mono">
              EVAL ACCESS:{' '}
              <span className="text-cyber-yellow">admin</span>
              {' / '}
              <span className="text-cyber-yellow">admin</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
