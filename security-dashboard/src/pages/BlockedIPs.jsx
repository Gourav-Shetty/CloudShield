import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import api from '../api/axios';
import { FiLock, FiUnlock, FiPlus, FiAlertOctagon, FiClock, FiSearch, FiUserCheck } from 'react-icons/fi';

// Dedicated reactive Countdown Timer cell
const Countdown = ({ targetDate, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(targetDate).getTime() - Date.now();
      if (difference <= 0) {
        setTimeLeft('EXPIRED');
        if (timerRef.current) clearInterval(timerRef.current);
        if (onExpire) onExpire();
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      const parts = [];
      if (hours > 0) parts.push(String(hours).padStart(2, '0'));
      parts.push(String(minutes).padStart(2, '0'));
      parts.push(String(seconds).padStart(2, '0'));

      setTimeLeft(parts.join(':'));
    };

    calculateTime(); // run once immediately
    timerRef.current = setInterval(calculateTime, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [targetDate]);

  return (
    <span className={`font-mono font-bold ${timeLeft === 'EXPIRED' ? 'text-cyber-red animate-pulse' : 'text-cyber-yellow'}`}>
      {timeLeft}
    </span>
  );
};

const BlockedIPs = () => {
  const { socket } = useSocket();
  const [blockedList, setBlockedList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [ipInput, setIpInput] = useState('');
  const [reasonInput, setReasonInput] = useState('DDoS Anomaly Detection');
  const [durationInput, setDurationInput] = useState('300'); // 5 minutes in seconds
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Seed data
  const generateMockBlocks = () => {
    const now = Date.now();
    return [
      { ip: '185.220.101.4', blockedAt: new Date(now - 120000), unblockAt: new Date(now + 180000), reason: 'Tor Node DDoS Signature Probe', status: 'active', restrictionType: 'RateLimit', rateLimitRps: 2 },
      { ip: '198.51.100.42', blockedAt: new Date(now - 900000), unblockAt: new Date(now + 2700000), reason: 'SQL Injection Sequence', status: 'active', restrictionType: 'Block' },
      { ip: '203.0.113.110', blockedAt: new Date(now - 1800000), unblockAt: new Date(now + 5400000), reason: 'Brute Force Flood Pattern', status: 'active', restrictionType: 'Captcha' },
      { ip: '192.0.2.75', blockedAt: new Date(now - 3600000), unblockAt: new Date(now + 82800000), reason: 'Critical SSH Auth Stuffing', status: 'active', restrictionType: 'Block' }
    ];
  };

  // Fetch initial blocked list
  useEffect(() => {
    const fetchBlockedIPs = async () => {
      try {
        const response = await api.get('/ip/blocks');
        const raw = response.data?.blockedIps || response.data;
        if (raw && Array.isArray(raw)) {
          setBlockedList(raw.map(b => ({
            ...b,
            id: b._id || b.id,
            blockedAt: new Date(b.blockedAt),
            unblockAt: new Date(b.unblockAt),
            reason: b.reason || b.attackType || 'Unknown',
            status: b.isActive ? 'active' : 'expired'
          })));
        } else {
          setBlockedList(generateMockBlocks());
        }
      } catch (err) {
        console.warn('API blocked-list endpoints inaccessible. Starting with default simulated bans.');
        setBlockedList(generateMockBlocks());
      }
    };
    fetchBlockedIPs();
  }, []);

  // Listen to Socket.IO events
  useEffect(() => {
    if (!socket) return;

    const handleIpBlocked = (ban) => {
      const formattedBan = {
        ...ban,
        blockedAt: ban.blockedAt ? new Date(ban.blockedAt) : new Date(),
        unblockAt: ban.unblockAt ? new Date(ban.unblockAt) : new Date(Date.now() + 300000),
        status: 'active'
      };
      
      // Prevent duplicates
      setBlockedList(prev => {
        if (prev.some(item => item.ip === formattedBan.ip)) return prev;
        return [formattedBan, ...prev];
      });
    };

    const handleIpUnblocked = (data) => {
      const unblockedIp = typeof data === 'string' ? data : data?.ip;
      if (unblockedIp) {
        setBlockedList(prev => prev.filter(item => item.ip !== unblockedIp));
      }
    };

    socket.on('ip-blocked', handleIpBlocked);
    socket.on('ip-unblocked', handleIpUnblocked);

    return () => {
      socket.off('ip-blocked');
      socket.off('ip-unblocked');
    };
  }, [socket]);

  // Handle manual IP blocking submission
  const handleBlockSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    // Quick validation
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ipInput.trim())) {
      setFormError('Please enter a valid IPv4 address.');
      return;
    }

    setSubmitting(true);
    const durationSeconds = parseInt(durationInput, 10);
    const blockedAt = new Date();
    const unblockAt = new Date(blockedAt.getTime() + durationSeconds * 1000);

    const blockData = {
      ip: ipInput.trim(),
      reason: reasonInput,
      blockedAt: blockedAt.toISOString(),
      unblockAt: unblockAt.toISOString(),
      status: 'active'
    };

    try {
      await api.post('/ip/block', blockData);
      // Backend should emit ip-blocked, but update local state just in case
      setBlockedList(prev => {
        if (prev.some(item => item.ip === blockData.ip)) return prev;
        return [{ ...blockData, blockedAt, unblockAt }, ...prev];
      });
      setIpInput('');
    } catch (err) {
      console.warn('Block IP API submission failed. Performing local state dispatch.');
      setBlockedList(prev => {
        if (prev.some(item => item.ip === blockData.ip)) return prev;
        return [{ ...blockData, blockedAt, unblockAt }, ...prev];
      });
      setIpInput('');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle manual unblocking trigger
  const handleUnblock = async (ip) => {
    try {
      await api.post('/ip/unblock', { ip });
      setBlockedList(prev => prev.filter(item => item.ip !== ip));
    } catch (err) {
      console.warn(`Unblock API call failed for ${ip}. Performing local removal.`);
      setBlockedList(prev => prev.filter(item => item.ip !== ip));
    }
  };

  // Handle unlocking user accounts associated with an IP
  const [unlockMessage, setUnlockMessage] = useState('');
  const handleUnlockAccount = async (ip) => {
    try {
      const res = await api.post('/incidents/unlock-account', { ip });
      const msg = res.data?.message || 'Account unlocked';
      setUnlockMessage(msg);
      setTimeout(() => setUnlockMessage(''), 4000);
    } catch (err) {
      console.warn(`Unlock account failed for ${ip}.`);
      setUnlockMessage('Failed to unlock — check server logs.');
      setTimeout(() => setUnlockMessage(''), 4000);
    }
  };

  // Called when a timer expires
  const handleTimerExpire = (expiredIp) => {
    // Optionally trigger API unblock or just filter it out of the UI
    setBlockedList(prev => prev.filter(item => item.ip !== expiredIp));
  };

  // Filter list by search query
  const filteredList = blockedList.filter(ban => {
    const searchLower = searchQuery.toLowerCase().trim();
    return ban.ip.includes(searchLower) || ban.reason.toLowerCase().includes(searchLower);
  });

  return (
    <div className="space-y-6">
      {/* Unlock Account Toast */}
      {unlockMessage && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-lg border bg-dark-800/95 border-cyber-blue/40 text-cyber-blue text-xs font-mono shadow-lg shadow-cyber-blue/10 animate-fade-in flex items-center gap-2">
          <FiUserCheck className="w-4 h-4" />
          {unlockMessage}
        </div>
      )}
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <FiLock className="text-cyber-green animate-pulse-slow filter drop-shadow-[0_0_5px_rgba(0,255,136,0.4)]" />
          Gateway IP Access Blocks
        </h2>
        <p className="text-sm text-gray-400 mt-1 font-mono">Manage firewall rules and active network exclusion leases.</p>
      </div>

      {/* Manual Block Form at top */}
      <div className="glass-card p-6 border-gray-800/80">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
          <FiPlus className="text-cyber-blue" />
          Provision Access Ban Policy
        </h3>

        <form onSubmit={handleBlockSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          {/* Target IP */}
          <div className="space-y-1.5 sm:col-span-1">
            <label className="text-[10px] font-mono uppercase text-gray-400 block">Target IPv4 Address</label>
            <input
              type="text"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              placeholder="e.g. 198.51.100.82"
              className="w-full bg-dark-800 border border-gray-700/60 rounded-lg py-2 px-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyber-blue font-mono"
            />
          </div>

          {/* Block Reason */}
          <div className="space-y-1.5 sm:col-span-1">
            <label className="text-[10px] font-mono uppercase text-gray-400 block">Block Reason Category</label>
            <select
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              className="w-full bg-dark-800 border border-gray-700/60 rounded-lg py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-cyber-blue font-mono"
            >
              <option value="DDoS Anomaly Detection">DDoS Anomaly Detection</option>
              <option value="SQL Injection Signature">SQL Injection Signature</option>
              <option value="Brute Force Pattern Flag">Brute Force Pattern Flag</option>
              <option value="Tor Exit Probe Block">Tor Exit Probe Block</option>
              <option value="Unauthorized API Traversal">Unauthorized API Traversal</option>
              <option value="Manual Security Quarantine">Manual Security Quarantine</option>
            </select>
          </div>

          {/* Duration Leases */}
          <div className="space-y-1.5 sm:col-span-1">
            <label className="text-[10px] font-mono uppercase text-gray-400 block">Ban Duration Lease</label>
            <select
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              className="w-full bg-dark-800 border border-gray-700/60 rounded-lg py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-cyber-blue font-mono"
            >
              <option value="60">1 Minute (Quick Test)</option>
              <option value="300">5 Minutes (Temporary)</option>
              <option value="3600">1 Hour (Investigative)</option>
              <option value="86400">24 Hours (Standard)</option>
              <option value="604800">7 Days (Severe)</option>
              <option value="31536000">Permanent</option>
            </select>
          </div>

          {/* Deploy Trigger */}
          <div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-cyber-red/10 border border-cyber-red/35 hover:bg-cyber-red/20 text-cyber-red rounded-lg py-2 font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-cyber-red/5 flex items-center justify-center gap-1.5"
            >
              <FiAlertOctagon className="w-4 h-4 shrink-0" />
              <span>Deploy Firewall Block</span>
            </button>
          </div>
        </form>

        {formError && (
          <p className="mt-3 text-xs text-cyber-red font-mono uppercase tracking-tight flex items-center gap-1.5">
            <span>[ERROR]</span> {formError}
          </p>
        )}
      </div>

      {/* Blocked IP Table Grid */}
      <div className="glass-card border-gray-800/80 overflow-hidden">
        {/* Table Filter Input */}
        <div className="p-4 border-b border-gray-800 bg-dark-800/20 flex items-center">
          <div className="relative w-full max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
              <FiSearch className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search active IP blocks by address or reason..."
              className="w-full bg-dark-800/50 border border-gray-700/40 rounded-lg py-1.5 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue font-mono"
            />
          </div>
        </div>

        {/* IP Block Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-dark-800/30 text-[11px] font-mono uppercase tracking-wider text-gray-500">
                <th className="py-4 px-6">Source IP</th>
                <th className="py-4 px-6">Enforced At</th>
                <th className="py-4 px-6">Duration Countdown</th>
                <th className="py-4 px-6">Block Reason</th>
                <th className="py-4 px-6">Restriction Policy</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50 font-mono text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">
                    NO_ACTIVE_IP_BANS_FOUND_MATCHING_SELECTION
                  </td>
                </tr>
              ) : (
                filteredList.map((ban) => {
                  const policy = ban.restrictionType || 'Block';
                  let ipColor = 'text-cyber-red';
                  let dotColor = 'bg-cyber-red';
                  let rowBorder = 'border-cyber-red/30';
                  
                  if (policy === 'RateLimit') {
                    ipColor = 'text-cyber-yellow';
                    dotColor = 'bg-cyber-yellow';
                    rowBorder = 'border-cyber-yellow/30';
                  } else if (policy === 'Captcha') {
                    ipColor = 'text-cyber-purple';
                    dotColor = 'bg-cyber-purple';
                    rowBorder = 'border-cyber-purple/30';
                  }

                  return (
                    <tr 
                      key={ban.ip} 
                      className={`hover:bg-dark-800/20 transition-all duration-300 relative border-l-2 group ${rowBorder}`}
                    >
                      <td className={`py-4 px-6 font-bold font-mono tracking-wide relative ${ipColor}`}>
                        {ban.ip}
                        {/* Active glow dot */}
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ml-2 animate-ping opacity-60 ${dotColor}`}></span>
                      </td>
                      <td className="py-4 px-6 text-gray-400">
                        {new Date(ban.blockedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          <FiClock className="w-3.5 h-3.5 text-gray-500" />
                          <Countdown targetDate={ban.unblockAt} onExpire={() => handleTimerExpire(ban.ip)} />
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-300 max-w-xs truncate" title={ban.reason}>
                        {ban.reason}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          policy === 'Block' 
                            ? 'bg-cyber-red/10 border-cyber-red/20 text-cyber-red shadow-[0_0_8px_rgba(255,51,102,0.1)]'
                            : policy === 'RateLimit'
                            ? 'bg-cyber-yellow/10 border-cyber-yellow/20 text-cyber-yellow shadow-[0_0_8px_rgba(255,170,0,0.1)]'
                            : 'bg-cyber-purple/10 border-cyber-purple/20 text-cyber-purple shadow-[0_0_8px_rgba(168,85,247,0.1)]'
                        }`}>
                          {policy} {policy === 'RateLimit' ? `(${ban.rateLimitRps} RPS)` : ''}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <button
                            onClick={() => handleUnblock(ban.ip)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-cyber-green/10 border border-cyber-green/30 text-cyber-green hover:bg-cyber-green/20 rounded-md font-semibold text-[10px] tracking-wider uppercase transition-all"
                          >
                            <FiUnlock className="w-3.5 h-3.5" />
                            <span>Unban</span>
                          </button>
                          <button
                            onClick={() => handleUnlockAccount(ban.ip)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue hover:bg-cyber-blue/20 rounded-md font-semibold text-[10px] tracking-wider uppercase transition-all"
                          >
                            <FiUserCheck className="w-3.5 h-3.5" />
                            <span>Unlock Account</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BlockedIPs;
