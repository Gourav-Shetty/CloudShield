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
  FiZap
} from 'react-icons/fi';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

// Dependency-free CountUp component for high-tech HUD count increments
const CountUp = ({ to, duration = 800 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(to, 10);
    if (isNaN(end)) return;
    if (start === end) {
      setCount(end);
      return;
    }
    
    const stepTime = Math.max(Math.floor(duration / Math.max(end, 1)), 15);
    const increment = Math.max(Math.ceil(end / (duration / stepTime)), 1);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, stepTime);
    
    return () => clearInterval(timer);
  }, [to, duration]);

  return <span>{count.toLocaleString()}</span>;
};

const Overview = () => {
  const { socket } = useSocket();
  const [stats, setStats] = useState({
    totalLogs: 154820,
    activeAlerts: 14,
    openIncidents: 3,
    blockedIps: 87,
    threatScore: 42
  });

  // Recent Alerts State
  const [recentAlerts, setRecentAlerts] = useState([
    { id: '1', timestamp: new Date(Date.now() - 45000), severity: 'critical', attackType: 'SQL Injection', sourceIp: '198.51.100.42', description: 'SQL injection detected on login endpoint' },
    { id: '2', timestamp: new Date(Date.now() - 180000), severity: 'high', attackType: 'DDoS Attempt', sourceIp: '203.0.113.110', description: 'High traffic anomaly - 1200 req/sec' },
    { id: '3', timestamp: new Date(Date.now() - 600000), severity: 'medium', attackType: 'Brute Force', sourceIp: '192.0.2.75', description: 'Repeated failed login attempts for admin' },
    { id: '4', timestamp: new Date(Date.now() - 900000), severity: 'low', attackType: 'Port Scan', sourceIp: '198.51.100.19', description: 'Reconnaissance scan detected on port 8080' },
    { id: '5', timestamp: new Date(Date.now() - 1200000), severity: 'medium', attackType: 'XSS Attempt', sourceIp: '203.0.113.5', description: 'Reflected XSS script in search query' },
  ]);

  // Traffic Data State (60 minutes)
  const [trafficData, setTrafficData] = useState(() => {
    const data = [];
    const now = Date.now();
    for (let i = 59; i >= 0; i--) {
      data.push({
        time: new Date(now - i * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        requests: Math.floor(Math.random() * 150) + 100,
        alerts: Math.random() > 0.85 ? Math.floor(Math.random() * 3) + 1 : 0
      });
    }
    return data;
  });

  // Attack Type breakdown State
  const [attackBreakdown, setAttackBreakdown] = useState([
    { name: 'SQL Injection', value: 35 },
    { name: 'DDoS Attack', value: 25 },
    { name: 'Brute Force', value: 20 },
    { name: 'XSS Attack', value: 12 },
    { name: 'Path Traversal', value: 8 },
  ]);

  const COLORS = ['#ff3366', '#00d4ff', '#ffaa00', '#a855f7', '#00ff88'];

  // Fetch initial dashboard statistics
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await api.get('/dashboard');
        if (response.data) {
          setStats(prev => ({
            totalLogs: response.data.totalLogs || prev.totalLogs,
            activeAlerts: response.data.activeAlerts !== undefined ? response.data.activeAlerts : prev.activeAlerts,
            openIncidents: response.data.openIncidents !== undefined ? response.data.openIncidents : prev.openIncidents,
            blockedIps: response.data.blockedIPs !== undefined ? response.data.blockedIPs : prev.blockedIps,
            threatScore: response.data.threatScore !== undefined ? response.data.threatScore : prev.threatScore
          }));

          if (response.data.recentAlerts && Array.isArray(response.data.recentAlerts) && response.data.recentAlerts.length > 0) {
            setRecentAlerts(response.data.recentAlerts.slice(0, 5).map(a => ({
              id: a._id || a.id,
              timestamp: new Date(a.createdAt || a.timestamp),
              severity: (a.severity || 'medium').toLowerCase(),
              attackType: a.attackType,
              sourceIp: a.sourceIP || a.sourceIp || 'unknown',
              description: a.description || ''
            })));
          }

          if (response.data.threatDistribution && Array.isArray(response.data.threatDistribution) && response.data.threatDistribution.length > 0) {
            const totalAlerts = response.data.threatDistribution.reduce((acc, d) => acc + d.count, 0) || 1;
            const mappedBreakdown = response.data.threatDistribution.map(d => {
              let displayName = d._id;
              if (d._id === 'SQLInjection') displayName = 'SQL Injection';
              else if (d._id === 'HTTPFlood') displayName = 'DDoS Attack';
              else if (d._id === 'BruteForce') displayName = 'Brute Force';
              else if (d._id === 'XSS') displayName = 'XSS Attack';
              else if (d._id === 'DirectoryTraversal') displayName = 'Path Traversal';
              else if (d._id === 'PortScan') displayName = 'Port Scan';
              
              return {
                name: displayName,
                value: Math.round((d.count / totalAlerts) * 100)
              };
            });
            setAttackBreakdown(mappedBreakdown);
          }
        }
      } catch (err) {
        console.warn('Could not fetch real-time stats from backend. Standing by with mock generator.');
      }
    };

    fetchDashboardStats();
  }, []);

  // Listen to Socket.IO for live streams
  useEffect(() => {
    if (!socket) return;

    // Handle new log event
    socket.on('new-log', (log) => {
      setStats(prev => ({ ...prev, totalLogs: prev.totalLogs + 1 }));
      
      // Update Traffic AreaChart live
      setTrafficData(prevData => {
        const updated = [...prevData];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            requests: updated[lastIndex].requests + 1
          };
        }
        return updated;
      });
    });

    // Handle new alert event
    socket.on('new-alert', (alert) => {
      setStats(prev => ({
        ...prev,
        activeAlerts: prev.activeAlerts + 1,
        // Calculate new dynamic threat score
        threatScore: Math.min(100, prev.threatScore + (alert.severity === 'critical' ? 10 : alert.severity === 'high' ? 6 : 3))
      }));

      // Add to recent alerts table
      setRecentAlerts(prev => {
        const newAlert = {
          id: alert.id || String(Date.now()),
          timestamp: alert.timestamp ? new Date(alert.timestamp) : new Date(),
          severity: alert.severity || 'medium',
          attackType: alert.attackType || 'Anomaly',
          sourceIp: alert.sourceIp || alert.ip || 'Unknown',
          description: alert.description || 'Intrusion behavior flagged by security policy'
        };
        return [newAlert, ...prev.slice(0, 4)];
      });

      // Update traffic alerts count for the latest minute
      setTrafficData(prevData => {
        const updated = [...prevData];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            alerts: updated[lastIndex].alerts + 1
          };
        }
        return updated;
      });
    });

    // Handle IP block events
    socket.on('ip-blocked', () => {
      setStats(prev => ({ ...prev, blockedIps: prev.blockedIps + 1 }));
    });

    socket.on('ip-unblocked', () => {
      setStats(prev => ({ ...prev, blockedIps: Math.max(0, prev.blockedIps - 1) }));
    });

    // Handle system stats broadcast
    socket.on('stats-update', (data) => {
      if (data) {
        setStats({
          totalLogs: data.totalLogs || stats.totalLogs,
          activeAlerts: data.activeAlerts !== undefined ? data.activeAlerts : stats.activeAlerts,
          openIncidents: data.openIncidents !== undefined ? data.openIncidents : stats.openIncidents,
          blockedIps: data.blockedIps !== undefined ? data.blockedIps : stats.blockedIps,
          threatScore: data.threatScore !== undefined ? data.threatScore : stats.threatScore
        });
      }
    });

    return () => {
      socket.off('new-log');
      socket.off('new-alert');
      socket.off('ip-blocked');
      socket.off('ip-unblocked');
      socket.off('stats-update');
    };
  }, [socket, stats]);

  // Push new minute onto Traffic AreaChart every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      setTrafficData(prevData => {
        const nextTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        // Shift left, push new minute entry
        return [
          ...prevData.slice(1),
          { time: nextTime, requests: Math.floor(Math.random() * 30) + 10, alerts: 0 }
        ];
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Compute text & colors for the Threat Score Gauge
  const threatGaugeDetails = useMemo(() => {
    const score = stats.threatScore;
    let label = 'STABLE';
    let color = '#00ff88'; // cyber-green
    let glow = 'cyber-glow-green';
    
    if (score > 75) {
      label = 'CRITICAL OUTBREAK';
      color = '#ff3366'; // cyber-red
      glow = 'cyber-glow-red';
    } else if (score > 40) {
      label = 'ELEVATED RISK';
      color = '#ffaa00'; // cyber-yellow
      glow = 'cyber-glow-yellow';
    }
    
    return { score, label, color, glow };
  }, [stats.threatScore]);

  // Format relative time for the recent alerts
  const formatTimeAgo = (date) => {
    const elapsed = Date.now() - new Date(date).getTime();
    const seconds = Math.floor(elapsed / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <FiActivity className="text-cyber-blue animate-pulse-slow filter drop-shadow-[0_0_5px_rgba(0,212,255,0.4)]" />
            Security Overview
          </h2>
          <p className="text-sm text-gray-400 mt-1 font-mono">Real-time gateway threat analysis & packet monitoring.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-dark-800 border border-gray-700/40 rounded-lg text-xs font-mono">
          <FiZap className="text-cyber-yellow animate-bounce" />
          <span>GW STATUS: RUNNING</span>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Logs */}
        <div className="stat-card relative group overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-gray-400">Total Processed Logs</p>
              <h3 className="text-3xl font-bold mt-2 font-mono text-white">
                <CountUp to={stats.totalLogs} />
              </h3>
            </div>
            <div className="p-3 bg-cyber-blue/10 border border-cyber-blue/20 rounded-xl text-cyber-blue group-hover:scale-110 transition-transform">
              <FiTerminal className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-cyber-green font-mono">
            <FiTrendingUp className="mr-1" />
            <span>+1,420 req / min</span>
          </div>
          {/* Subtle line glow */}
          <div className="absolute bottom-0 inset-x-0 h-[2px] bg-cyber-blue opacity-50"></div>
        </div>

        {/* Active Alerts */}
        <div className={`stat-card relative group overflow-hidden ${stats.activeAlerts > 0 ? 'border-cyber-red/20' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-gray-400">Active Security Alerts</p>
              <h3 className={`text-3xl font-bold mt-2 font-mono ${stats.activeAlerts > 0 ? 'text-cyber-red' : 'text-white'}`}>
                <CountUp to={stats.activeAlerts} />
              </h3>
            </div>
            <div className={`p-3 rounded-xl border group-hover:scale-110 transition-transform ${
              stats.activeAlerts > 0 
                ? 'bg-cyber-red/10 border-cyber-red/20 text-cyber-red shadow-[0_0_8px_rgba(255,51,102,0.2)]' 
                : 'bg-dark-600 border-gray-700 text-gray-400'
            }`}>
              <FiBell className={`w-6 h-6 ${stats.activeAlerts > 0 ? 'animate-bounce' : ''}`} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-mono text-gray-400">
            <span>Threat policy version: 4.8.2</span>
          </div>
          {stats.activeAlerts > 0 && (
            <div className="absolute bottom-0 inset-x-0 h-[2px] bg-cyber-red"></div>
          )}
        </div>

        {/* Open Incidents */}
        <div className="stat-card relative group overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-gray-400">Open Incidents</p>
              <h3 className="text-3xl font-bold mt-2 font-mono text-cyber-yellow">
                <CountUp to={stats.openIncidents} />
              </h3>
            </div>
            <div className="p-3 bg-cyber-yellow/10 border border-cyber-yellow/20 rounded-xl text-cyber-yellow group-hover:scale-110 transition-transform">
              <FiAlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-cyber-yellow font-mono">
            <span>Critical actions required</span>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-[2px] bg-cyber-yellow opacity-50"></div>
        </div>

        {/* Blocked IPs */}
        <div className="stat-card relative group overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-gray-400">Active Blocked IPs</p>
              <h3 className="text-3xl font-bold mt-2 font-mono text-cyber-green">
                <CountUp to={stats.blockedIps} />
              </h3>
            </div>
            <div className="p-3 bg-cyber-green/10 border border-cyber-green/20 rounded-xl text-cyber-green group-hover:scale-110 transition-transform">
              <FiLock className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-gray-400 font-mono">
            <span>Automatic firewall sync: active</span>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-[2px] bg-cyber-green opacity-50"></div>
        </div>
      </div>

      {/* Main Charts & Gauge row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Traffic AreaChart (Spans 2 columns) */}
        <div className="glass-card p-6 lg:col-span-2 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="font-bold text-white">Live System Network Traffic</h4>
              <p className="text-xs text-gray-400 font-mono mt-0.5">Requests and threat signals per minute</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-cyber-blue/30 border border-cyber-blue rounded"></span>
                <span className="text-gray-300">Requests/min</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-cyber-red/30 border border-cyber-red rounded"></span>
                <span className="text-gray-300">Alerts/min</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff3366" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#ff3366" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  stroke="#4b5563" 
                  fontSize={10} 
                  fontFamily="JetBrains Mono" 
                  tickLine={false}
                  interval={12}
                />
                <YAxis 
                  stroke="#4b5563" 
                  fontSize={10} 
                  fontFamily="JetBrains Mono" 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                  labelStyle={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#9ca3af' }}
                  itemStyle={{ fontFamily: 'Inter', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="requests" 
                  stroke="#00d4ff" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRequests)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="alerts" 
                  stroke="#ff3366" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorAlerts)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Threat Score Gauge */}
        <div className="glass-card p-6 flex flex-col justify-between items-center text-center h-[400px]">
          <div className="w-full text-left">
            <h4 className="font-bold text-white">System Threat Gauge</h4>
            <p className="text-xs text-gray-400 font-mono mt-0.5">Aggregated vector severity score</p>
          </div>

          {/* SVG Arc Gauge */}
          <div className="relative w-48 h-32 flex items-center justify-center mt-6">
            <svg className="w-full h-full transform -rotate-180" viewBox="0 0 100 50">
              {/* Background Arc */}
              <path 
                d="M 10 50 A 40 40 0 0 1 90 50" 
                fill="none" 
                stroke="#243147" 
                strokeWidth="10" 
                strokeLinecap="round"
              />
              {/* Foreground Arc */}
              <path 
                d="M 10 50 A 40 40 0 0 1 90 50" 
                fill="none" 
                stroke={threatGaugeDetails.color} 
                strokeWidth="10" 
                strokeLinecap="round"
                strokeDasharray="125.6"
                strokeDashoffset={125.6 - (125.6 * threatGaugeDetails.score) / 100}
                className="transition-all duration-1000 ease-out"
                style={{
                  filter: `drop-shadow(0 0 4px ${threatGaugeDetails.color})`
                }}
              />
            </svg>
            
            {/* Centered details */}
            <div className="absolute bottom-0 flex flex-col items-center">
              <span className="text-4xl font-extrabold text-white font-mono leading-none">
                {threatGaugeDetails.score}
              </span>
              <span className="text-[10px] text-gray-500 font-mono tracking-widest mt-1">SCORE / 100</span>
            </div>
          </div>

          <div className="w-full space-y-2 mt-4">
            <div className={`py-1.5 px-4 rounded-full border text-xs font-bold tracking-widest font-mono ${threatGaugeDetails.glow} transition-all duration-500`}>
              {threatGaugeDetails.label}
            </div>
            <p className="text-xs text-gray-400 px-4">
              {stats.threatScore > 75 
                ? 'Gateway experiencing critical security threats. Urgent containment actions are running.' 
                : stats.threatScore > 40
                ? 'Anomalous network activity detected. Automated scanners running diagnostics.' 
                : 'All traffic signals nominal. Machine learning scoring indicates stable environment.'}
            </p>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Alerts Table & Attack Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts (Spans 2 columns) */}
        <div className="glass-card p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-white mb-1">Recent Escalated Alerts</h4>
            <p className="text-xs text-gray-400 font-mono mb-6">Latest intrusion events evaluated by AI core.</p>
          </div>

          <div className="overflow-x-auto min-h-[220px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-[11px] font-mono uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Attack Type</th>
                  <th className="py-3 px-4">Source IP</th>
                  <th className="py-3 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono text-xs">
                {recentAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-dark-800/30 transition-colors">
                    <td className="py-3.5 px-4 text-gray-400 whitespace-nowrap">
                      {formatTimeAgo(alert.timestamp)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        alert.severity === 'critical' 
                          ? 'severity-critical' 
                          : alert.severity === 'high' 
                          ? 'severity-high' 
                          : alert.severity === 'medium'
                          ? 'severity-medium'
                          : 'severity-low'
                      }`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-white font-semibold whitespace-nowrap">{alert.attackType}</td>
                    <td className="py-3.5 px-4 text-cyber-blue font-mono">{alert.sourceIp}</td>
                    <td className="py-3.5 px-4 text-gray-400 max-w-[200px] truncate" title={alert.description}>
                      {alert.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attack Type Distribution PieChart */}
        <div className="glass-card p-6 flex flex-col justify-between h-full min-h-[340px]">
          <div>
            <h4 className="font-bold text-white mb-1">Attack Distribution</h4>
            <p className="text-xs text-gray-400 font-mono mb-4">Threat classification breakdown</p>
          </div>

          <div className="flex-1 min-h-0 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={attackBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {attackBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                  itemStyle={{ fontFamily: 'Inter', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Simple custom legend */}
          <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-mono text-gray-400">
            {attackBreakdown.map((type, idx) => (
              <div key={type.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="truncate">{type.name} ({type.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
