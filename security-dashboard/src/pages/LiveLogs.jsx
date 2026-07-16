import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSocket } from '../hooks/useSocket';
import api from '../api/axios';
import { 
  FiPlay, 
  FiPause, 
  FiSearch, 
  FiTrash2, 
  FiDownload,
  FiTerminal
} from 'react-icons/fi';

const LiveLogs = () => {
  const { socket } = useSocket();
  const [logs, setLogs] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  
  // Filter States
  const [ipFilter, setIpFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');

  const scrollRef = useRef(null);
  const logBuffer = useRef([]);

  // Generate realistic seed logs for initial display
  const generateSeedLogs = () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    const endpoints = [
      '/api/auth/login', '/api/users/profile', '/api/dashboard/stats', 
      '/api/v1/payment', '/wp-admin/index.php', '/api/reports/download',
      '/etc/passwd', '/api/v2/analyze', '/api/ip/block-list'
    ];
    const eventTypes = ['Nominal', 'Auth Failure', 'SQLi Attempt', 'XSS Attempt', 'Anomaly', 'Port Scan', 'Path Traversal'];
    const ips = ['192.168.1.50', '203.0.113.110', '198.51.100.42', '192.0.2.75', '185.220.101.4', '10.0.0.15'];

    const seed = [];
    const now = Date.now();
    for (let i = 40; i >= 0; i--) {
      const method = methods[Math.floor(Math.random() * methods.length)];
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const status = Math.random() > 0.85 
        ? (Math.random() > 0.5 ? 404 : 500) 
        : (method === 'POST' ? 201 : 200);
      
      let eventType = 'Nominal';
      if (status === 500) eventType = 'Anomaly';
      if (endpoint.includes('passwd')) eventType = 'Path Traversal';
      if (endpoint.includes('login') && status === 404) eventType = 'Auth Failure';

      seed.push({
        id: `seed-${i}`,
        timestamp: new Date(now - i * 5000),
        ip: ips[Math.floor(Math.random() * ips.length)],
        method,
        endpoint,
        status,
        eventType
      });
    }
    return seed;
  };

  // Load seed logs and try to fetch latest from server
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const response = await api.get('/logs');
        const raw = Array.isArray(response.data?.logs)
          ? response.data.logs
          : Array.isArray(response.data)
          ? response.data
          : null;

        if (raw !== null) {
          setLogs(raw.map(l => ({
            id: l._id || l.id,
            timestamp: new Date(l.timestamp),
            ip: l.ip || 'unknown',
            method: l.method || 'GET',
            endpoint: l.endpoint || '/',
            status: l.status || 200,
            eventType: l.eventType || 'Nominal'
          })));
        } else {
          setLogs(generateSeedLogs());
        }
      } catch (err) {
        console.warn('Could not fetch active logs from backend. Standing by with seed data.');
        setLogs(generateSeedLogs());
      }
    };
    loadLogs();
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    const handleNewLog = (log) => {
      const formattedLog = {
        id:        log._id || log.id || String(Date.now() + Math.random()),
        timestamp: new Date(log.timestamp || log.createdAt || Date.now()),
        ip:        log.ip || 'unknown',
        method:    log.method || 'GET',
        endpoint:  log.endpoint || '/',
        status:    log.status || 200,
        eventType: log.eventType || 'Nominal'
      };

      if (isPaused) {
        // Queue in buffer
        logBuffer.current.push(formattedLog);
        // Truncate buffer to 200 max
        if (logBuffer.current.length > 200) {
          logBuffer.current.shift();
        }
      } else {
        setLogs(prev => {
          const nextLogs = [...prev, formattedLog];
          if (nextLogs.length > 200) {
            nextLogs.shift(); // FIFO: drop the oldest at the top (index 0)
          }
          return nextLogs;
        });
      }
    };

    socket.on('new-log', handleNewLog);

    return () => {
      socket.off('new-log');
    };
  }, [socket, isPaused]);

  // Handle Pause/Resume toggle
  const handlePauseToggle = () => {
    if (isPaused) {
      // Flushes buffered logs into current display
      if (logBuffer.current.length > 0) {
        setLogs(prev => {
          const nextLogs = [...prev, ...logBuffer.current];
          logBuffer.current = [];
          if (nextLogs.length > 200) {
            return nextLogs.slice(nextLogs.length - 200);
          }
          return nextLogs;
        });
      }
    }
    setIsPaused(!isPaused);
  };

  // Scroll to bottom when new logs arrive (if not paused)
  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  // Filter logs locally
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchIp = ipFilter ? log.ip.includes(ipFilter.trim()) : true;
      const matchMethod = methodFilter ? log.method === methodFilter : true;
      const matchStatus = statusFilter 
        ? log.status.toString().startsWith(statusFilter.trim()) 
        : true;
      const matchType = eventTypeFilter 
        ? log.eventType.toLowerCase().includes(eventTypeFilter.toLowerCase().trim()) 
        : true;

      return matchIp && matchMethod && matchStatus && matchType;
    });
  }, [logs, ipFilter, methodFilter, statusFilter, eventTypeFilter]);

  // Clear Logs View
  const handleClearLogs = () => {
    setLogs([]);
    logBuffer.current = [];
  };

  // Download Logs as JSON
  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `cloudshield_live_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-120px)]">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <FiTerminal className="text-cyber-blue animate-pulse" />
            Live Gateway Logs
          </h2>
          <p className="text-sm text-gray-400 font-mono">Real-time HTTP packet analyzer. Max 200 logs buffer (FIFO).</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Pause / Play Button */}
          <button
            onClick={handlePauseToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-semibold tracking-wider transition-all border ${
              isPaused 
                ? 'bg-cyber-yellow/10 border-cyber-yellow text-cyber-yellow shadow-[0_0_8px_rgba(255,170,0,0.15)] hover:bg-cyber-yellow/20' 
                : 'bg-cyber-blue/10 border-cyber-blue text-cyber-blue shadow-[0_0_8px_rgba(0,212,255,0.15)] hover:bg-cyber-blue/20'
            }`}
          >
            {isPaused ? (
              <>
                <FiPlay className="w-3.5 h-3.5" />
                <span>RESUME STREAM ({logBuffer.current.length} HELD)</span>
              </>
            ) : (
              <>
                <FiPause className="w-3.5 h-3.5" />
                <span>PAUSE STREAM</span>
              </>
            )}
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportLogs}
            className="p-2.5 bg-dark-800 border border-gray-700/50 hover:border-cyber-blue/40 text-gray-400 hover:text-white rounded-lg transition-colors"
            title="Download Logs"
          >
            <FiDownload className="w-4 h-4" />
          </button>

          {/* Trash Button */}
          <button
            onClick={handleClearLogs}
            className="p-2.5 bg-dark-800 border border-gray-700/50 hover:border-cyber-red/40 text-gray-400 hover:text-cyber-red rounded-lg transition-colors"
            title="Clear Logs View"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 shrink-0 border-gray-800/80">
        {/* IP Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
            <FiSearch className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={ipFilter}
            onChange={(e) => setIpFilter(e.target.value)}
            placeholder="Filter Source IP..."
            className="w-full bg-dark-800/60 border border-gray-700/40 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue font-mono"
          />
        </div>

        {/* Method Select */}
        <div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full bg-dark-800/60 border border-gray-700/40 rounded-lg py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-cyber-blue font-mono"
          >
            <option value="">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        {/* Status Search */}
        <div>
          <input
            type="text"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="Filter Status Code (e.g. 404, 5)..."
            className="w-full bg-dark-800/60 border border-gray-700/40 rounded-lg py-2 px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue font-mono"
          />
        </div>

        {/* Event Type Search */}
        <div>
          <input
            type="text"
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            placeholder="Filter Event (e.g. SQLi, Nominal)..."
            className="w-full bg-dark-800/60 border border-gray-700/40 rounded-lg py-2 px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue font-mono"
          />
        </div>
      </div>

      {/* Logs Table Area */}
      <div className="glass-card flex-1 min-h-0 overflow-hidden flex flex-col border-gray-800/80">
        {/* Table Head (Locked at top) */}
        <div className="grid grid-cols-12 bg-dark-800/80 px-6 py-3 border-b border-gray-800 text-[11px] font-mono uppercase tracking-wider text-gray-500 shrink-0">
          <div className="col-span-2">Timestamp</div>
          <div className="col-span-2">Source IP</div>
          <div className="col-span-1 text-center">Method</div>
          <div className="col-span-4">Endpoint</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-2 text-right">Event Type</div>
        </div>

        {/* Table Body (Scrollable container) */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto divide-y divide-gray-800/50"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 font-mono text-xs">
              <span className="animate-pulse">WAITING_FOR_LIVE_PACKETS_OR_CRITERIA_MISMATCH...</span>
            </div>
          ) : (
            filteredLogs.map((log) => {
              // Coloring for statuses
              let statusColor = 'text-cyber-green';
              let rowBg = 'hover:bg-dark-800/30';
              if (log.status >= 500) {
                statusColor = 'text-cyber-red';
                rowBg = 'bg-cyber-red/5 hover:bg-cyber-red/10 border-l border-cyber-red/30';
              } else if (log.status >= 400) {
                statusColor = 'text-cyber-yellow';
                rowBg = 'bg-cyber-yellow/5 hover:bg-cyber-yellow/10 border-l border-cyber-yellow/30';
              } else if (log.status >= 300) {
                statusColor = 'text-cyber-purple';
              }

              // Coloring for HTTP Methods
              let methodBadge = 'text-cyber-green bg-cyber-green/10 border border-cyber-green/20';
              if (log.method === 'POST') methodBadge = 'text-cyber-blue bg-cyber-blue/10 border border-cyber-blue/20';
              if (log.method === 'PUT') methodBadge = 'text-cyber-yellow bg-cyber-yellow/10 border border-cyber-yellow/20';
              if (log.method === 'DELETE') methodBadge = 'text-cyber-red bg-cyber-red/10 border border-cyber-red/20';

              return (
                <div 
                  key={log.id} 
                  className={`grid grid-cols-12 items-center px-6 py-2.5 font-mono text-[11px] leading-relaxed transition-all duration-300 ${rowBg}`}
                >
                  <div className="col-span-2 text-gray-500">
                    {log.timestamp.toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 })}
                  </div>
                  <div className="col-span-2 text-cyber-blue font-semibold">{log.ip}</div>
                  <div className="col-span-1 flex justify-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-tight min-w-[50px] text-center ${methodBadge}`}>
                      {log.method}
                    </span>
                  </div>
                  <div className="col-span-4 text-gray-300 truncate pr-4" title={log.endpoint}>
                    {log.endpoint}
                  </div>
                  <div className="col-span-1 text-center font-bold">
                    <span className={statusColor}>{log.status}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      log.eventType === 'Nominal' 
                        ? 'bg-gray-800 text-gray-400' 
                        : log.eventType === 'Auth Failure' || log.eventType === 'Anomaly'
                        ? 'bg-cyber-yellow/20 text-cyber-yellow'
                        : 'bg-cyber-red/20 text-cyber-red'
                    }`}>
                      {log.eventType}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Console stats overlay bar */}
        <div className="bg-dark-800/80 px-6 py-2 border-t border-gray-800 text-[10px] font-mono text-gray-500 flex items-center justify-between shrink-0">
          <span>BUFFER_CAPACITY: {logs.length}/200 LOGS</span>
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-cyber-yellow animate-pulse' : 'bg-cyber-green animate-ping'}`}></span>
            <span>{isPaused ? 'RECEIVING DEFERRED' : 'STREAM ACTIVE'}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default LiveLogs;
