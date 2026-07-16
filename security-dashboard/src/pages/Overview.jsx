import React, { useState, useEffect, useMemo } from 'react';
import { useSocket } from '../hooks/useSocket';
import api from '../api/axios';
import {
  FiTerminal,
  FiBell,
  FiAlertTriangle,
  FiLock,
  FiActivity,
  FiTrendingUp,
  FiZap,
  FiShield,
} from 'react-icons/fi';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

/* ─── CountUp ──────────────────────────────────────────────────── */
const CountUp = ({ to, duration = 800 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(to, 10);
    if (isNaN(end)) return;
    if (start === end) { setCount(end); return; }
    const stepTime = Math.max(Math.floor(duration / Math.max(end, 1)), 15);
    const increment = Math.max(Math.ceil(end / (duration / stepTime)), 1);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { clearInterval(timer); setCount(end); }
      else { setCount(start); }
    }, stepTime);
    return () => clearInterval(timer);
  }, [to, duration]);
  return <span>{count.toLocaleString()}</span>;
};

/* ─── Custom Recharts Tooltip ──────────────────────────────────── */
const CyberTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md">
      <p className="text-[10px] font-mono text-gray-500 mb-2 uppercase tracking-wider">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-400">{p.dataKey}:</span>
          <span className="text-white font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── Severity badge helper ────────────────────────────────────── */
const SeverityBadge = ({ severity }) => {
  const map = {
    critical: 'threat-badge-critical',
    high: 'threat-badge-high',
    medium: 'threat-badge-medium',
    low: 'threat-badge-low',
  };
  return (
    <span className={map[severity] || map.low}>
      {severity?.toUpperCase()}
    </span>
  );
};


/* ─── Overview page ────────────────────────────────────────────── */
const Overview = () => {
  const { socket } = useSocket();
  const [stats, setStats] = useState({
    totalLogs: 0,
    activeAlerts: 0,
    openIncidents: 0,
    blockedIps: 0,
    threatScore: 0,
  });

  const [recentAlerts, setRecentAlerts] = useState([]);

  const [trafficData, setTrafficData] = useState(() => {
    const data = [];
    const now = Date.now();
    for (let i = 59; i >= 0; i--) {
      data.push({
        time: new Date(now - i * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        requests: 0,
        alerts: 0,
      });
    }
    return data;
  });

  const [attackBreakdown, setAttackBreakdown] = useState([]);

  const COLORS = ['#ff3366', '#00d4ff', '#ffaa00', '#a855f7', '#00ff88'];

  /* ── API fetch ────────────────────────────────────────────────── */
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await api.get('/dashboard');
        if (response.data) {
          setStats({
            totalLogs:      response.data.totalLogs      || 0,
            activeAlerts:   response.data.activeAlerts   || 0,
            openIncidents:  response.data.openIncidents  || 0,
            blockedIps:     response.data.blockedIPs     || 0,
            threatScore:    response.data.threatScore    || 0,
          });

          if (Array.isArray(response.data.recentAlerts)) {
            setRecentAlerts(response.data.recentAlerts.slice(0, 5).map(a => ({
              id: a._id || a.id,
              timestamp:  new Date(a.createdAt || a.timestamp),
              severity:   (a.severity || 'medium').toLowerCase(),
              attackType: a.attackType,
              sourceIp:   a.sourceIP || a.sourceIp || 'unknown',
              description: a.description || '',
            })));
          } else {
            setRecentAlerts([]);
          }

          if (Array.isArray(response.data.threatDistribution) && response.data.threatDistribution.length > 0) {
            const totalAlerts = response.data.threatDistribution.reduce((acc, d) => acc + d.count, 0) || 1;
            setAttackBreakdown(response.data.threatDistribution.map(d => {
              const nameMap = { SQLInjection: 'SQL Injection', HTTPFlood: 'DDoS Attack', BruteForce: 'Brute Force', XSS: 'XSS Attack', DirectoryTraversal: 'Path Traversal', PortScan: 'Port Scan' };
              return { name: nameMap[d._id] || d._id, value: Math.round((d.count / totalAlerts) * 100) };
            }));
          } else {
            setAttackBreakdown([]);
          }
        }
      } catch {
        console.warn('Could not fetch stats from backend.');
      }
    };
    fetchDashboardStats();
  }, []);

  /* ── Socket events ────────────────────────────────────────────── */
  useEffect(() => {
    if (!socket) return;

    socket.on('new-log', () => {
      setStats(prev => ({ ...prev, totalLogs: prev.totalLogs + 1 }));
      setTrafficData(prev => {
        const updated = [...prev];
        const last = updated.length - 1;
        if (last >= 0) updated[last] = { ...updated[last], requests: updated[last].requests + 1 };
        return updated;
      });
    });

    socket.on('new-alert', (alert) => {
      const severityLower = (alert.severity || 'medium').toLowerCase();
      setStats(prev => ({
        ...prev,
        activeAlerts: prev.activeAlerts + 1,
        threatScore: Math.min(100, prev.threatScore + (severityLower === 'critical' ? 10 : severityLower === 'high' ? 6 : 3)),
      }));
      setRecentAlerts(prev => [{
        id:          alert._id || alert.id || String(Date.now() + Math.random()),
        timestamp:   new Date(alert.createdAt || alert.timestamp || Date.now()),
        severity:    severityLower,
        attackType:  alert.attackType || 'Anomaly',
        sourceIp:    alert.sourceIP || alert.sourceIp || 'unknown',
        description: alert.description || 'Intrusion behavior flagged by security policy',
      }, ...prev.slice(0, 4)]);
      setTrafficData(prev => {
        const updated = [...prev];
        const last = updated.length - 1;
        if (last >= 0) updated[last] = { ...updated[last], alerts: updated[last].alerts + 1 };
        return updated;
      });
    });

    socket.on('ip-blocked',   () => setStats(prev => ({ ...prev, blockedIps: prev.blockedIps + 1 })));
    socket.on('ip-unblocked', () => setStats(prev => ({ ...prev, blockedIps: Math.max(0, prev.blockedIps - 1) })));

    socket.on('stats-update', (data) => {
      if (data) setStats({
        totalLogs:     data.totalLogs     || stats.totalLogs,
        activeAlerts:  data.activeAlerts  !== undefined ? data.activeAlerts  : stats.activeAlerts,
        openIncidents: data.openIncidents !== undefined ? data.openIncidents : stats.openIncidents,
        blockedIps:    data.blockedIps    !== undefined ? data.blockedIps    : stats.blockedIps,
        threatScore:   data.threatScore   !== undefined ? data.threatScore   : stats.threatScore,
      });
    });

    return () => {
      socket.off('new-log');
      socket.off('new-alert');
      socket.off('ip-blocked');
      socket.off('ip-unblocked');
      socket.off('stats-update');
    };
  }, [socket, stats]);

  /* Push new minute onto chart every 60s */
  useEffect(() => {
    const interval = setInterval(() => {
      setTrafficData(prev => [
        ...prev.slice(1),
        { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), requests: Math.floor(Math.random() * 30) + 10, alerts: 0 },
      ]);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  /* Threat gauge derived values */
  const threatGaugeDetails = useMemo(() => {
    const score = stats.threatScore;
    if (score > 75) return { score, label: 'CRITICAL OUTBREAK', color: '#ff3366', glow: 'cyber-glow-red' };
    if (score > 40) return { score, label: 'ELEVATED RISK',     color: '#ffaa00', glow: 'cyber-glow-yellow' };
    return           { score, label: 'STABLE',               color: '#00ff88', glow: 'cyber-glow-green' };
  }, [stats.threatScore]);

  const formatTimeAgo = (date) => {
    const elapsed = Date.now() - new Date(date).getTime();
    const seconds = Math.floor(elapsed / 1000);
    if (seconds < 60)  return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)  return `${minutes}m ago`;
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /* Severity left-border color for table rows */
  const severityBorderClass = (sev) => ({
    critical: 'border-l-2 border-l-red-500/70',
    high:     'border-l-2 border-l-orange-500/70',
    medium:   'border-l-2 border-l-yellow-500/70',
    low:      'border-l-2 border-l-blue-500/70',
  }[sev] || '');

  return (
    <div className="space-y-8">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 bg-cyber-blue/10 rounded-lg border border-cyber-blue/20">
              <FiActivity className="w-4 h-4 text-cyber-blue drop-shadow-[0_0_4px_rgba(0,212,255,0.6)]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white font-mono">
              SECURITY OVERVIEW
            </h2>
          </div>
          <p className="text-xs text-gray-500 font-mono pl-1">
            Real-time gateway threat analysis &amp; packet monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/[0.07] rounded-lg text-[10px] font-mono">
          <FiZap className="text-cyber-yellow w-3.5 h-3.5 animate-pulse" />
          <span className="text-gray-400 tracking-widest">GW STATUS:</span>
          <span className="text-cyber-green font-semibold">RUNNING</span>
        </div>
      </div>

      {/* ── 4 Stat Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Total Logs */}
        <div className="stat-card group overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-cyber-blue shadow-[0_0_8px_rgba(0,212,255,0.5)]" />
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-gray-500">Total Processed Logs</p>
              <h3 className="text-3xl font-bold mt-2.5 font-mono text-white tabular-nums">
                <CountUp to={stats.totalLogs} />
              </h3>
            </div>
            <div className="p-3 bg-cyber-blue/10 border border-cyber-blue/20 rounded-xl text-cyber-blue group-hover:scale-110 transition-transform duration-200 shadow-[0_0_12px_rgba(0,212,255,0.1)]">
              <FiTerminal className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[10px] font-mono text-cyber-green">
            <FiTrendingUp className="w-3 h-3" />
            <span>+1,420 req / min</span>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-blue to-transparent opacity-30" />
        </div>

        {/* Active Alerts */}
        <div className={`stat-card group overflow-hidden ${stats.activeAlerts > 0 ? 'neon-border-red' : ''}`}>
          <div className={`absolute top-0 inset-x-0 h-[2px] ${stats.activeAlerts > 0 ? 'bg-cyber-red shadow-[0_0_8px_rgba(255,51,102,0.5)]' : 'bg-gray-700'}`} />
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-gray-500">Active Security Alerts</p>
              <h3 className={`text-3xl font-bold mt-2.5 font-mono tabular-nums ${stats.activeAlerts > 0 ? 'text-cyber-red' : 'text-white'}`}>
                <CountUp to={stats.activeAlerts} />
              </h3>
            </div>
            <div className={`p-3 rounded-xl border group-hover:scale-110 transition-transform duration-200 ${
              stats.activeAlerts > 0
                ? 'bg-cyber-red/10 border-cyber-red/20 text-cyber-red shadow-[0_0_12px_rgba(255,51,102,0.15)]'
                : 'bg-white/[0.03] border-white/[0.06] text-gray-400'
            }`}>
              <FiBell className={`w-5 h-5 ${stats.activeAlerts > 0 ? 'animate-bounce' : ''}`} />
            </div>
          </div>
          <div className="mt-4 text-[10px] font-mono text-gray-500">Threat policy version: 4.8.2</div>
          {stats.activeAlerts > 0 && (
            <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-red to-transparent opacity-50" />
          )}
        </div>

        {/* Open Incidents */}
        <div className="stat-card group overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-cyber-yellow shadow-[0_0_8px_rgba(255,170,0,0.4)]" />
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-gray-500">Open Incidents</p>
              <h3 className="text-3xl font-bold mt-2.5 font-mono text-cyber-yellow tabular-nums">
                <CountUp to={stats.openIncidents} />
              </h3>
            </div>
            <div className="p-3 bg-cyber-yellow/10 border border-cyber-yellow/20 rounded-xl text-cyber-yellow group-hover:scale-110 transition-transform duration-200 shadow-[0_0_12px_rgba(255,170,0,0.1)]">
              <FiAlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-[10px] font-mono text-cyber-yellow opacity-70">Critical actions required</div>
          <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-yellow to-transparent opacity-30" />
        </div>

        {/* Blocked IPs */}
        <div className="stat-card group overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-cyber-green shadow-[0_0_8px_rgba(0,255,136,0.4)]" />
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-gray-500">Active Blocked IPs</p>
              <h3 className="text-3xl font-bold mt-2.5 font-mono text-cyber-green tabular-nums">
                <CountUp to={stats.blockedIps} />
              </h3>
            </div>
            <div className="p-3 bg-cyber-green/10 border border-cyber-green/20 rounded-xl text-cyber-green group-hover:scale-110 transition-transform duration-200 shadow-[0_0_12px_rgba(0,255,136,0.1)]">
              <FiLock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-[10px] font-mono text-gray-500">Automatic firewall sync: active</div>
          <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-green to-transparent opacity-30" />
        </div>
      </div>

      {/* ── Charts row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Traffic AreaChart */}
        <div className="glass-card p-6 lg:col-span-2 flex flex-col h-[380px]">
          <div className="flex items-start justify-between mb-5 shrink-0">
            <div>
              <h4 className="font-semibold text-white font-mono tracking-wide text-sm">LIVE NETWORK TRAFFIC</h4>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">Requests and threat signals per minute</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-[2px] bg-cyber-blue rounded inline-block" />
                <span className="text-gray-400">Requests</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-[2px] bg-cyber-red rounded inline-block" />
                <span className="text-gray-400">Alerts</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ff3366" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ff3366" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  stroke="#1f2937"
                  tick={{ fill: '#4b5563', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                  axisLine={{ stroke: '#1f2937' }}
                  interval={11}
                />
                <YAxis
                  stroke="#1f2937"
                  tick={{ fill: '#4b5563', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CyberTooltip />} />
                <Area type="monotone" dataKey="requests" stroke="#00d4ff" strokeWidth={1.5} fillOpacity={1} fill="url(#gradRequests)" dot={false} activeDot={{ r: 3, fill: '#00d4ff', strokeWidth: 0 }} />
                <Area type="monotone" dataKey="alerts"   stroke="#ff3366" strokeWidth={1.5} fillOpacity={1} fill="url(#gradAlerts)"   dot={false} activeDot={{ r: 3, fill: '#ff3366', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Threat Score Gauge */}
        <div className="glass-card p-6 flex flex-col items-center justify-between h-[380px] relative overflow-hidden">
          {/* Scanning line effect for the threat card */}
          {stats.threatScore > 40 && (
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-red to-transparent opacity-50 animate-scanline pointer-events-none" />
          )}

          <div className="w-full text-left shrink-0">
            <h4 className="font-semibold text-white font-mono tracking-wide text-sm">SYSTEM THREAT GAUGE</h4>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">Aggregated vector severity score</p>
          </div>

          {/* SVG Arc Gauge */}
          <div className="relative w-52 h-36 flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 100 55" style={{ transform: 'scaleX(1) scaleY(1)' }}>
              {/* Background arc */}
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="#1a2332"
                strokeWidth="9"
                strokeLinecap="round"
              />
              {/* Foreground arc */}
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke={threatGaugeDetails.color}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray="125.6"
                strokeDashoffset={125.6 - (125.6 * threatGaugeDetails.score) / 100}
                className="transition-all duration-1000 ease-out"
                style={{ filter: `drop-shadow(0 0 5px ${threatGaugeDetails.color})` }}
              />
              {/* Tick marks */}
              {[0, 25, 50, 75, 100].map((tick, i) => {
                const angle = -180 + (tick / 100) * 180;
                const rad = (angle * Math.PI) / 180;
                const cx = 50 + 40 * Math.cos(rad);
                const cy = 50 + 40 * Math.sin(rad);
                return <circle key={i} cx={cx} cy={cy} r="1" fill="#374151" />;
              })}
            </svg>

            {/* Center readout */}
            <div className="absolute bottom-1 flex flex-col items-center">
              <span
                className="text-5xl font-extrabold font-mono leading-none tabular-nums"
                style={{ color: threatGaugeDetails.color, textShadow: `0 0 20px ${threatGaugeDetails.color}60` }}
              >
                {threatGaugeDetails.score}
              </span>
              <span className="text-[9px] text-gray-600 font-mono tracking-[0.2em] mt-1">/ 100</span>
            </div>
          </div>

          <div className="w-full space-y-3">
            <div className={`py-1.5 px-4 rounded-full border text-[10px] font-bold tracking-[0.2em] font-mono text-center transition-all duration-500 ${threatGaugeDetails.glow}`}>
              {threatGaugeDetails.label}
            </div>
            <p className="text-[10px] text-gray-500 font-mono text-center leading-relaxed">
              {stats.threatScore > 75
                ? 'Gateway experiencing critical threats. Urgent containment running.'
                : stats.threatScore > 40
                ? 'Anomalous activity detected. Automated diagnostics active.'
                : 'All signals nominal. ML scoring indicates stable environment.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Recent Alerts + Attack Distribution ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Alerts table */}
        <div className="glass-card lg:col-span-2 overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-white/[0.05]">
            <h4 className="font-semibold text-white font-mono tracking-wide text-sm">RECENT ESCALATED ALERTS</h4>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">Latest intrusion events evaluated by AI core.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-mono uppercase tracking-[0.15em] text-gray-600 border-b border-white/[0.04]">
                  <th className="py-3 pl-6 pr-3 font-medium">Time</th>
                  <th className="py-3 px-3 font-medium">Severity</th>
                  <th className="py-3 px-3 font-medium">Attack</th>
                  <th className="py-3 px-3 font-medium">Source IP</th>
                  <th className="py-3 pl-3 pr-6 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {recentAlerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className={`hover:bg-white/[0.02] transition-colors group/row ${severityBorderClass(alert.severity)}`}
                  >
                    <td className="py-3.5 pl-6 pr-3 text-[10px] font-mono text-gray-500 whitespace-nowrap">
                      {formatTimeAgo(alert.timestamp)}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td className="py-3.5 px-3 text-xs font-mono text-white font-semibold whitespace-nowrap">
                      {alert.attackType}
                    </td>
                    <td className="py-3.5 px-3 text-[11px] font-mono text-cyber-blue whitespace-nowrap">
                      {alert.sourceIp}
                    </td>
                    <td className="py-3.5 pl-3 pr-6 text-[10px] font-mono text-gray-400 max-w-[180px] truncate" title={alert.description}>
                      {alert.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attack Distribution PieChart */}
        <div className="glass-card p-6 flex flex-col">
          <div className="shrink-0 mb-4">
            <h4 className="font-semibold text-white font-mono tracking-wide text-sm">ATTACK DISTRIBUTION</h4>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">Threat classification breakdown</p>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie
                  data={attackBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {attackBreakdown.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      style={{ filter: `drop-shadow(0 0 4px ${COLORS[index % COLORS.length]}60)` }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d1117', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px', fontFamily: 'JetBrains Mono', fontSize: '11px' }}
                  itemStyle={{ color: '#d1d5db' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 gap-1.5 mt-2">
            {attackBreakdown.map((type, idx) => (
              <div key={type.name} className="flex items-center justify-between gap-2 text-[10px] font-mono">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length], boxShadow: `0 0 4px ${COLORS[idx % COLORS.length]}80` }}
                  />
                  <span className="text-gray-400 truncate">{type.name}</span>
                </div>
                <span className="text-gray-500 tabular-nums">{type.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
