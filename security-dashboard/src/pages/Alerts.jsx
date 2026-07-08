import React, { useState, useEffect, useMemo } from 'react';
import { useSocket } from '../hooks/useSocket';
import api from '../api/axios';
import {
  FiBell,
  FiSearch,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
  FiX,
  FiSliders,
} from 'react-icons/fi';

/* ─── Severity config ──────────────────────────────────────────── */
const SEV_CONFIG = {
  critical: { badge: 'threat-badge-critical', border: 'border-l-red-500/70',    pill: 'bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/20'    },
  high:     { badge: 'threat-badge-high',     border: 'border-l-orange-500/70', pill: 'bg-orange-500/10 text-orange-400 border-orange-500/25 hover:bg-orange-500/20' },
  medium:   { badge: 'threat-badge-medium',   border: 'border-l-yellow-500/70', pill: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25 hover:bg-yellow-500/20' },
  low:      { badge: 'threat-badge-low',      border: 'border-l-blue-500/70',   pill: 'bg-blue-500/10 text-blue-400 border-blue-500/25 hover:bg-blue-500/20'    },
};

const SeverityBadge = ({ severity }) => {
  const cfg = SEV_CONFIG[severity] || SEV_CONFIG.low;
  return <span className={cfg.badge}>{severity?.toUpperCase()}</span>;
};

/* ─── Alerts page ──────────────────────────────────────────────── */
const Alerts = () => {
  const { socket } = useSocket();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [severityFilter, setSeverityFilter] = useState('');
  const [attackFilter, setAttackFilter]     = useState('');
  const [searchQuery, setSearchQuery]       = useState('');
  const [currentPage, setCurrentPage]       = useState(1);
  const itemsPerPage = 10;

  /* Mock generator */
  const generateMockAlerts = () => {
    const severities  = ['critical', 'high', 'medium', 'low'];
    const attackTypes = ['SQL Injection', 'DDoS Attempt', 'Brute Force', 'XSS Attempt', 'Port Scan', 'Path Traversal'];
    const ips         = ['198.51.100.42', '203.0.113.110', '192.0.2.75', '198.51.100.19', '203.0.113.5', '185.220.101.4'];
    const descriptions = [
      'SQL injection payload block on database gate',
      'Sudden traffic surge exceeding DDoS threshold',
      'Brute force sequence: 10 logins failed in 30s',
      'XSS query parameter blocked on search gateway',
      'Port scanner activity detected from external block',
      'Restricted directory scan traversal blocked',
    ];
    const now = Date.now();
    return Array.from({ length: 35 }, (_, i) => {
      const typeIdx = i % attackTypes.length;
      return {
        id: `alert-mock-${i}`,
        timestamp:  new Date(now - i * 45 * 60000),
        severity:   severities[i % severities.length],
        attackType: attackTypes[typeIdx],
        sourceIp:   ips[i % ips.length],
        description: descriptions[typeIdx],
        resolved:   false,
        isNew:      false,
      };
    });
  };

  /* Fetch alerts */
  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const response = await api.get('/alerts');
        const raw = response.data?.alerts || response.data;
        if (raw && Array.isArray(raw) && raw.length > 0) {
          setAlerts(raw.map(a => ({
            id:          a._id || a.id,
            timestamp:   new Date(a.createdAt || a.timestamp),
            severity:    (a.severity || 'low').toLowerCase(),
            attackType:  a.attackType,
            sourceIp:    a.sourceIP || a.sourceIp || 'unknown',
            description: a.description || '',
            resolved:    a.isResolved || a.resolved || false,
            isNew:       false,
          })));
        } else {
          setAlerts(generateMockAlerts());
        }
      } catch {
        console.warn('Unable to query security alerts from backend. Seeding interface with mock alerts.');
        setAlerts(generateMockAlerts());
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  /* Socket: new-alert */
  useEffect(() => {
    if (!socket) return;
    const handleNewAlert = (alert) => {
      const formatted = {
        id:          alert._id || alert.id || String(Date.now() + Math.random()),
        timestamp:   new Date(alert.createdAt || alert.timestamp || Date.now()),
        severity:    (alert.severity || 'low').toLowerCase(),
        attackType:  alert.attackType,
        sourceIp:    alert.sourceIP || alert.sourceIp || 'unknown',
        description: alert.description || '',
        resolved:    alert.isResolved || alert.resolved || false,
        isNew:       true,
      };
      setAlerts(prev => [formatted, ...prev]);
      setTimeout(() => {
        setAlerts(prev => prev.map(a => a.id === formatted.id ? { ...a, isNew: false } : a));
      }, 2000);
    };
    socket.on('new-alert', handleNewAlert);
    return () => socket.off('new-alert');
  }, [socket]);

  /* Resolve */
  const handleResolveAlert = async (id) => {
    try {
      await api.put(`/alerts/${id}/resolve`);
    } catch {
      console.warn(`Resolve API failed for ${id}. Resolving locally.`);
    }
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
  };

  /* Filter */
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      if (alert.resolved) return false;
      const matchSeverity = severityFilter ? alert.severity === severityFilter : true;
      const matchAttack   = attackFilter   ? alert.attackType === attackFilter  : true;
      const searchLower   = searchQuery.toLowerCase().trim();
      const matchSearch   = searchLower
        ? alert.sourceIp.includes(searchLower) ||
          alert.attackType.toLowerCase().includes(searchLower) ||
          alert.description.toLowerCase().includes(searchLower)
        : true;
      return matchSeverity && matchAttack && matchSearch;
    });
  }, [alerts, severityFilter, attackFilter, searchQuery]);

  /* Pagination */
  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage) || 1;
  const paginatedAlerts = useMemo(() => {
    const page = currentPage > totalPages ? 1 : currentPage;
    return filteredAlerts.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredAlerts, currentPage, totalPages]);

  const uniqueAttackTypes = useMemo(() => Array.from(new Set(alerts.map(a => a.attackType))), [alerts]);

  const severityCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    filteredAlerts.forEach(a => { if (counts[a.severity] !== undefined) counts[a.severity]++; });
    return counts;
  }, [filteredAlerts]);

  const clearFilters = () => {
    setSeverityFilter('');
    setAttackFilter('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasFilters = severityFilter || attackFilter || searchQuery;

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 bg-cyber-red/10 rounded-lg border border-cyber-red/20">
              <FiBell className="w-4 h-4 text-cyber-red drop-shadow-[0_0_4px_rgba(255,51,102,0.6)]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white font-mono">
              ACTIVE INCIDENT ALERTS
            </h2>
          </div>
          <p className="text-xs text-gray-500 font-mono pl-1">Consolidated system intrusion alerts queue.</p>
        </div>

        {/* Severity summary pills */}
        <div className="hidden lg:flex items-center gap-2">
          {['critical', 'high', 'medium', 'low'].map(sev => (
            <div key={sev} className={`px-3 py-1.5 rounded-lg border text-[10px] font-mono font-semibold tracking-wider cursor-pointer transition-all duration-150 ${SEV_CONFIG[sev].pill} ${severityFilter === sev ? 'ring-1 ring-white/20' : ''}`}
              onClick={() => { setSeverityFilter(prev => prev === sev ? '' : sev); setCurrentPage(1); }}
            >
              {sev.toUpperCase()} <span className="opacity-60 ml-1">{severityCounts[sev]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────── */}
      <div className="glass-card p-4 border-white/[0.07]">
        <div className="flex items-center gap-3 mb-3">
          <FiSliders className="text-cyber-blue w-3.5 h-3.5" />
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Filter Signal Metrics</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-[10px] font-mono text-gray-500 hover:text-cyber-red transition-colors"
            >
              <FiX className="w-3 h-3" /> CLEAR FILTERS
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <FiSearch className="absolute inset-y-0 left-3 my-auto w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search IP, attack type, description..."
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg py-2.5 pl-8 pr-3 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-cyber-blue/50 focus:bg-white/[0.05] transition-all font-mono"
            />
          </div>

          {/* Severity dropdown */}
          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setCurrentPage(1); }}
            className="bg-white/[0.03] border border-white/[0.07] rounded-lg py-2.5 px-3 text-[11px] text-gray-300 focus:outline-none focus:border-cyber-blue/50 font-mono appearance-none cursor-pointer"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Attack type dropdown */}
          <select
            value={attackFilter}
            onChange={(e) => { setAttackFilter(e.target.value); setCurrentPage(1); }}
            className="bg-white/[0.03] border border-white/[0.07] rounded-lg py-2.5 px-3 text-[11px] text-gray-300 focus:outline-none focus:border-cyber-blue/50 font-mono appearance-none cursor-pointer"
          >
            <option value="">All Attack Types</option>
            {uniqueAttackTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Alerts table ────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                {['Timestamp', 'Severity', 'Attack Type', 'Source IP', 'Description', 'Action'].map((col, i) => (
                  <th key={col} className={`py-3.5 px-5 text-[10px] font-mono font-medium uppercase tracking-[0.15em] text-gray-600 ${i === 5 ? 'text-center' : ''}`}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-gray-600 font-mono text-xs animate-pulse">
                    PARSING_LOG_SIGNALS...
                  </td>
                </tr>
              ) : paginatedAlerts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FiBell className="w-8 h-8 text-gray-700" />
                      <span className="text-gray-600 font-mono text-[11px] tracking-wider">NO_ACTIVE_ALERTS_MATCHING_SELECTION</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAlerts.map((alert) => {
                  const cfg = SEV_CONFIG[alert.severity] || SEV_CONFIG.low;
                  return (
                    <tr
                      key={alert.id}
                      className={`border-l-2 ${cfg.border} transition-all duration-300 group/row ${
                        alert.isNew
                          ? 'bg-cyber-red/10 animate-pulse'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="py-4 px-5 text-[10px] font-mono text-gray-500 whitespace-nowrap">
                        {alert.timestamp.toLocaleString()}
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <SeverityBadge severity={alert.severity} />
                      </td>
                      <td className="py-4 px-5 text-xs font-mono text-white font-semibold whitespace-nowrap">
                        {alert.attackType}
                      </td>
                      <td className="py-4 px-5 text-[11px] font-mono text-cyber-blue whitespace-nowrap tabular-nums">
                        {alert.sourceIp}
                      </td>
                      <td className="py-4 px-5 text-[10px] font-mono text-gray-400 max-w-xs truncate" title={alert.description}>
                        {alert.description}
                      </td>
                      <td className="py-4 px-5 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyber-green/[0.08] border border-cyber-green/25 text-cyber-green hover:bg-cyber-green/[0.15] hover:border-cyber-green/40 hover:shadow-[0_0_12px_rgba(0,255,136,0.15)] rounded-md font-mono text-[10px] tracking-wider transition-all duration-150 uppercase"
                        >
                          <FiCheckCircle className="w-3 h-3" />
                          Resolve
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3.5 border-t border-white/[0.05] bg-white/[0.01] flex items-center justify-between font-mono text-[10px] text-gray-600">
          <span>
            {filteredAlerts.length > 0
              ? `Showing ${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, filteredAlerts.length)} of ${filteredAlerts.length} active alerts`
              : 'No alerts'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={`p-1.5 rounded border transition-all duration-150 ${currentPage === 1 ? 'text-gray-700 border-white/[0.04] cursor-not-allowed' : 'text-gray-400 border-white/[0.08] hover:border-cyber-blue/40 hover:text-cyber-blue'}`}
            >
              <FiChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-gray-500 px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`p-1.5 rounded border transition-all duration-150 ${currentPage === totalPages ? 'text-gray-700 border-white/[0.04] cursor-not-allowed' : 'text-gray-400 border-white/[0.08] hover:border-cyber-blue/40 hover:text-cyber-blue'}`}
            >
              <FiChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
