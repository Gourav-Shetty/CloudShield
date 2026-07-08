import React, { useState, useEffect, useMemo } from 'react';
import { useSocket } from '../hooks/useSocket';
import api from '../api/axios';
import { 
  FiBell, 
  FiSearch, 
  FiCheckCircle, 
  FiChevronLeft, 
  FiChevronRight,
  FiFilter
} from 'react-icons/fi';

const Alerts = () => {
  const { socket } = useSocket();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [severityFilter, setSeverityFilter] = useState('');
  const [attackFilter, setAttackFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Mock generator if API is not active
  const generateMockAlerts = () => {
    const severities = ['critical', 'high', 'medium', 'low'];
    const attackTypes = ['SQL Injection', 'DDoS Attempt', 'Brute Force', 'XSS Attempt', 'Port Scan', 'Path Traversal'];
    const ips = ['198.51.100.42', '203.0.113.110', '192.0.2.75', '198.51.100.19', '203.0.113.5', '185.220.101.4'];
    const descriptions = [
      'SQL injection payload block on database gate',
      'Sudden traffic surge exceeding DDoS threshold',
      'Brute force sequence: 10 logins failed in 30s',
      'XSS query parameter blocked on search gateway',
      'Port scanner activity detected from external block',
      'Restricted directory scan traversal blocked'
    ];

    const mock = [];
    const now = Date.now();
    for (let i = 0; i < 35; i++) {
      const severity = severities[i % severities.length];
      const typeIdx = i % attackTypes.length;
      mock.push({
        id: `alert-mock-${i}`,
        timestamp: new Date(now - i * 45 * 60000), // intervals of 45 mins
        severity,
        attackType: attackTypes[typeIdx],
        sourceIp: ips[i % ips.length],
        description: descriptions[typeIdx],
        resolved: false,
        isNew: false
      });
    }
    return mock;
  };

  // Fetch initial alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const response = await api.get('/alerts');
        const raw = response.data?.alerts || response.data;
        if (raw && Array.isArray(raw) && raw.length > 0) {
          setAlerts(raw.map(a => ({
            id: a._id || a.id,
            timestamp: new Date(a.createdAt || a.timestamp),
            severity: (a.severity || 'low').toLowerCase(),
            attackType: a.attackType,
            sourceIp: a.sourceIP || a.sourceIp || 'unknown',
            description: a.description || '',
            resolved: a.isResolved || a.resolved || false,
            isNew: false
          })));
        } else {
          setAlerts(generateMockAlerts());
        }
      } catch (err) {
        console.warn('Unable to query security alerts from backend. Seeding interface with mock alerts.');
        setAlerts(generateMockAlerts());
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  // Socket listener for new alert
  useEffect(() => {
    if (!socket) return;

    const handleNewAlert = (alert) => {
      const formattedAlert = {
        id: alert._id || alert.id || String(Date.now() + Math.random()),
        timestamp: new Date(alert.createdAt || alert.timestamp || Date.now()),
        severity: (alert.severity || 'low').toLowerCase(),
        attackType: alert.attackType,
        sourceIp: alert.sourceIP || alert.sourceIp || 'unknown',
        description: alert.description || '',
        resolved: alert.isResolved || alert.resolved || false,
        isNew: true
      };

      setAlerts(prev => [formattedAlert, ...prev]);

      // Remove the flash class after 2 seconds
      setTimeout(() => {
        setAlerts(prev => 
          prev.map(a => a.id === formattedAlert.id ? { ...a, isNew: false } : a)
        );
      }, 2000);
    };

    socket.on('new-alert', handleNewAlert);

    return () => {
      socket.off('new-alert');
    };
  }, [socket]);

  // Resolve alert handler
  const handleResolveAlert = async (id) => {
    try {
      // POST or PUT to resolve endpoint
      await api.put(`/alerts/${id}/resolve`);
      
      // Update local state
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
    } catch (err) {
      console.warn(`Resolve API call failed for alert ID: ${id}. Resolving locally for UI continuity.`);
      // Update locally anyway for demo continuity
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
    }
  };

  // Filter alerts locally
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // Remove resolved alerts from this table or keep them with flag? 
      // Typically alert dashboards focus on un-resolved alerts. Let's filter out resolved ones 
      // or let them be filtered by search
      if (alert.resolved) return false;

      const matchSeverity = severityFilter ? alert.severity === severityFilter : true;
      const matchAttack = attackFilter ? alert.attackType === attackFilter : true;
      
      const searchLower = searchQuery.toLowerCase().trim();
      const matchSearch = searchLower 
        ? alert.sourceIp.includes(searchLower) || 
          alert.attackType.toLowerCase().includes(searchLower) ||
          alert.description.toLowerCase().includes(searchLower)
        : true;

      return matchSeverity && matchAttack && matchSearch;
    });
  }, [alerts, severityFilter, attackFilter, searchQuery]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage) || 1;
  const paginatedAlerts = useMemo(() => {
    // Reset page if page index is out of bounds
    const page = currentPage > totalPages ? 1 : currentPage;
    const startIndex = (page - 1) * itemsPerPage;
    return filteredAlerts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAlerts, currentPage, totalPages]);

  const uniqueAttackTypes = useMemo(() => {
    const types = new Set(alerts.map(a => a.attackType));
    return Array.from(types);
  }, [alerts]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <FiBell className="text-cyber-red animate-pulse-slow filter drop-shadow-[0_0_5px_rgba(255,51,102,0.4)]" />
          Active Incident Alerts
        </h2>
        <p className="text-sm text-gray-400 mt-1 font-mono">Consolidated system intrusion alerts queue.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-5 border-gray-800/80 space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
          <FiFilter className="text-cyber-blue" />
          <span>FILTER SECURE SIGNAL METRIC:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* IP or Description search */}
          <div className="relative sm:col-span-2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
              <FiSearch className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by IP, Attack Type, Description..."
              className="w-full bg-dark-800/60 border border-gray-700/40 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue font-mono"
            />
          </div>

          {/* Severity dropdown */}
          <div>
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-dark-800/60 border border-gray-700/40 rounded-lg py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-cyber-blue font-mono"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Attack Type dropdown */}
          <div>
            <select
              value={attackFilter}
              onChange={(e) => {
                setAttackFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-dark-800/60 border border-gray-700/40 rounded-lg py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-cyber-blue font-mono"
            >
              <option value="">All Attack Types</option>
              {uniqueAttackTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="glass-card border-gray-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-dark-800/50 text-[11px] font-mono uppercase tracking-wider text-gray-500">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Severity</th>
                <th className="py-4 px-6">Attack Type</th>
                <th className="py-4 px-6">Source IP</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500 animate-pulse">
                    PARSING_LOG_SIGNALS...
                  </td>
                </tr>
              ) : paginatedAlerts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">
                    NO_ACTIVE_ALERTS_MATCHING_SELECTION
                  </td>
                </tr>
              ) : (
                paginatedAlerts.map((alert) => (
                  <tr 
                    key={alert.id}
                    className={`transition-all duration-300 ${
                      alert.isNew 
                        ? 'bg-cyber-red/20 border-y border-cyber-red animate-pulse' 
                        : 'hover:bg-dark-800/30'
                    }`}
                  >
                    <td className="py-4 px-6 text-gray-400 whitespace-nowrap">
                      {alert.timestamp.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold border uppercase ${
                        alert.severity === 'critical'
                          ? 'severity-critical shadow-[0_0_6px_rgba(255,51,102,0.15)]'
                          : alert.severity === 'high'
                          ? 'severity-high'
                          : alert.severity === 'medium'
                          ? 'severity-medium'
                          : 'severity-low'
                      }`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-white font-bold whitespace-nowrap">{alert.attackType}</td>
                    <td className="py-4 px-6 text-cyber-blue font-semibold whitespace-nowrap">{alert.sourceIp}</td>
                    <td className="py-4 px-6 text-gray-300 max-w-xs truncate" title={alert.description}>
                      {alert.description}
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-cyber-green/10 border border-cyber-green/30 text-cyber-green hover:bg-cyber-green/20 rounded-md font-semibold text-[10px] tracking-wider transition-all mx-auto uppercase"
                      >
                        <FiCheckCircle className="w-3.5 h-3.5" />
                        <span>Resolve</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="bg-dark-800/30 px-6 py-4 border-t border-gray-800 flex items-center justify-between font-mono text-xs text-gray-500">
          <div>
            Showing {filteredAlerts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredAlerts.length)} of {filteredAlerts.length} active alerts
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`p-1.5 rounded border border-gray-700/60 transition-colors ${
                currentPage === 1 
                  ? 'text-gray-700 border-gray-800/40 cursor-not-allowed' 
                  : 'text-gray-300 hover:border-cyber-blue hover:text-white'
              }`}
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-gray-300 px-2">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`p-1.5 rounded border border-gray-700/60 transition-colors ${
                currentPage === totalPages
                  ? 'text-gray-700 border-gray-800/40 cursor-not-allowed' 
                  : 'text-gray-300 hover:border-cyber-blue hover:text-white'
              }`}
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
