import React, { useState, useRef, useEffect } from 'react';
import { FiLock, FiUnlock, FiShield } from 'react-icons/fi';
import axios from 'axios';

/**
 * SlideCaptcha component - A premium sliding puzzle verification modal.
 */
const SlideCaptcha = ({ isOpen, onSuccess, onCancel, message }) => {
  const [position, setPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  
  const trackRef = useRef(null);
  const handleRef = useRef(null);
  const startX = useRef(0);
  const maxDelta = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setPosition(0);
      setIsVerified(false);
      setError('');
    }
  }, [isOpen]);

  // Calculate maximum slide distance dynamically
  const getSliderLimits = () => {
    if (!trackRef.current || !handleRef.current) return 0;
    return trackRef.current.clientWidth - handleRef.current.clientWidth - 8; // padding margin offset
  };

  const handleStart = (e) => {
    if (isVerified) return;
    setIsDragging(true);
    setError('');
    startX.current = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    maxDelta.current = getSliderLimits();
  };

  const handleMove = (e) => {
    if (!isDragging || isVerified) return;
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const delta = clientX - startX.current;
    
    // Clamp between 0 and maxDelta
    const newPos = Math.max(0, Math.min(maxDelta.current, delta));
    setPosition(newPos);
  };

  const handleEnd = async () => {
    if (!isDragging || isVerified) return;
    setIsDragging(false);

    const limits = getSliderLimits();
    const percent = limits > 0 ? (position / limits) * 100 : 0;

    if (percent >= 92) {
      // Snap to end
      setPosition(limits);
      setIsVerified(true);
      
      try {
        // Call the employee portal CAPTCHA verify endpoint
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const response = await axios.post(`${apiBase}/auth/verify-captcha`, {
          sliderOffset: percent
        });

        if (response.data && response.data.success) {
          setTimeout(() => {
            onSuccess(response.data.captchaToken);
          }, 800);
        } else {
          throw new Error(response.data.message || 'Verification failed');
        }
      } catch (err) {
        setIsVerified(false);
        setPosition(0);
        setError(err.response?.data?.message || 'Humanity verification failed. Please try again.');
      }
    } else {
      // Snap back to start
      setPosition(0);
    }
  };

  // Attach global mousemove/mouseup listeners while dragging to make experience smooth
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, position]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-all duration-300">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 p-6 sm:p-8 flex flex-col text-slate-800 relative animate-fade-in">
        <div className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center shadow-sm">
            <FiShield size={24} className="animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Security Verification Required</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {message || 'Anomalous traffic signatures detected. Please drag the slider to verify you are a human operator.'}
          </p>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-[11px] font-medium text-red-600 text-center">
            {error}
          </div>
        )}

        {/* Sliding Puzzle Track */}
        <div className="mt-6 relative">
          <div 
            ref={trackRef}
            className={`h-14 w-full rounded-xl border transition-all relative flex items-center justify-center select-none overflow-hidden ${
              isVerified 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                : 'bg-slate-50 border-slate-200/80 text-slate-400'
            }`}
          >
            {/* Filled background progress */}
            <div 
              className={`absolute left-0 top-0 bottom-0 transition-all ${
                isVerified ? 'bg-emerald-100/40' : 'bg-primary-100/30'
              }`}
              style={{ width: `${position + 24}px` }}
            ></div>

            {/* Slider track hint text */}
            <span className="text-xs font-semibold tracking-wide pointer-events-none z-10 transition-opacity duration-300">
              {isVerified ? 'VERIFICATION COMPLETED' : 'SLIDE TO VERIFY OPERATOR'}
            </span>

            {/* Sliding handle */}
            <div
              ref={handleRef}
              onMouseDown={handleStart}
              onTouchStart={handleStart}
              style={{ transform: `translateX(${position}px)` }}
              className={`absolute left-1.5 h-11 w-11 rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing select-none transition-shadow duration-200 shadow-md ${
                isVerified 
                  ? 'bg-emerald-500 text-white shadow-emerald-200/50' 
                  : 'bg-gradient-to-tr from-primary-600 to-primary-500 text-white shadow-primary-200/50 hover:shadow-lg'
              }`}
            >
              {isVerified ? <FiUnlock size={18} /> : <FiLock size={18} />}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            Cancel Request
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlideCaptcha;
