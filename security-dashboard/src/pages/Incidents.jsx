import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { 
  FiAlertTriangle, 
  FiChevronDown, 
  FiChevronUp, 
  FiClock, 
  FiShield,
  FiCheckCircle, 
  FiActivity,
  FiFileText
} from 'react-icons/fi';

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Seed Mock Incidents
  const generateMockIncidents = () => [
    {
      id: 'INC-2026-8801',
      status: 'open',
      severity: 'critical',
      sourceIp: '198.51.100.42',
      attackType: 'SQL Injection Sequence',
      timestamp: new Date(Date.now() - 30 * 60000), // 30 mins ago
      timeline: [
        { time: '10:26:15', event: 'Anomaly score exceeds threshold (98.4%) on /api/auth/login.' },
        { time: '10:26:30', event: 'IP 198.51.100.42 automatically placed on 2-hour quarantine list.' },
        { time: '10:28:00', event: 'Database connection pools monitored: no data exfiltration detected.' },
        { time: '10:30:00', event: 'Incident escalates to Level 1 Alert.' }
      ],
      actionsTaken: [
        'Automatic 2h firewall block on IP 198.51.100.42',
        'Database log inspection triggered',
        'Payload threat signature hashed and cached'
      ]
    },
    {
      id: 'INC-2026-8794',
      status: 'investigating',
      severity: 'high',
      sourceIp: '203.0.113.110',
      attackType: 'DDoS Resource Exhaustion',
      timestamp: new Date(Date.now() - 140 * 60000), // ~2.3 hours ago
      timeline: [
        { time: '08:35:12', event: 'TCP connection count spiked to 8,500 active threads.' },
        { time: '08:36:00', event: 'Edge CDN caching optimized; load-balancer warning triggered.' },
        { time: '08:40:22', event: 'Analyst initialized manual threat investigation.' }
      ],
      actionsTaken: [
        'Rate-limiting thresholds set to 50 req/sec per client IP',
        'CDN request buffering enabled',
        'Manual traffic capture session established'
      ]
    },
    {
      id: 'INC-2026-8742',
      status: 'resolved',
      severity: 'medium',
      sourceIp: '192.0.2.75',
      attackType: 'Credential Stuffing Anomaly',
      timestamp: new Date(Date.now() - 600 * 60000), // 10 hours ago
      timeline: [
        { time: '00:56:04', event: 'Over 120 authentication requests failed from single subnet.' },
        { time: '01:00:10', event: 'CAPTCHA challenge enforced on route /api/auth.' },
        { time: '01:05:00', event: 'Traffic returns to normal baseline.' },
        { time: '02:00:00', event: 'Analyst resolves incident: Brute force vector mitigated.' }
      ],
      actionsTaken: [
        'Enforced strict CAPTCHA challenge block',
        'Username blacklist sync completed',
        'Security token regeneration recommended'
      ]
    },
    {
      id: 'INC-2026-8711',
      status: 'resolved',
      severity: 'low',
      sourceIp: '198.51.100.19',
      attackType: 'Reconnaissance Port Scan',
      timestamp: new Date(Date.now() - 1440 * 60000), // 24 hours ago
      timeline: [
        { time: '10:55:00', event: 'Multi-port probing behavior mapped across range 80-8080.' },
        { time: '10:55:12', event: 'Port scan signature identified. Automatic firewall drops enforced.' },
        { time: '11:30:00', event: 'Scan stops. Threat flagged as resolved.' }
      ],
      actionsTaken: [
        'Source IP blacklisted',
        'Port 8080 firewall rules hardened'
      ]
    }
  ];

  // Fetch incidents from API or fall back
  useEffect(() => {
    const fetchIncidents = async () => {
      setLoading(true);
      try {
        const response = await api.get('/incidents');
        if (response.data && Array.isArray(response.data)) {
          setIncidents(response.data.map(inc => ({
            ...inc,
            timestamp: new Date(inc.timestamp)
          })));
        } else {
          setIncidents(generateMockIncidents());
        }
      } catch (err) {
        console.warn('Could not query active incidents from server. Displaying mock logs.');
        setIncidents(generateMockIncidents());
      } finally {
        setLoading(false);
      }
    };
    fetchIncidents();
  }, []);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`/incidents/${id}/status`, { status: newStatus });
      setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: newStatus } : inc));
    } catch (err) {
      console.warn(`Failed to update status for ${id} via API. Simulating locally.`);
      setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: newStatus } : inc));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return 'bg-cyber-red/20 text-cyber-red border border-cyber-red/30';
      case 'investigating':
        return 'bg-cyber-yellow/20 text-cyber-yellow border border-cyber-yellow/30';
      case 'resolved':
        return 'bg-cyber-green/20 text-cyber-green border border-cyber-green/30';
      default:
        return 'bg-gray-800 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <FiShield className="text-cyber-yellow animate-pulse-slow filter drop-shadow-[0_0_5px_rgba(255,170,0,0.4)]" />
          SOC Incident Tracker
        </h2>
        <p className="text-sm text-gray-400 mt-1 font-mono">Aggregated security incidents requiring investigative audits.</p>
      </div>

      {/* Statistics board */}
      <div className="grid grid-cols-3 gap-6">
        <div className="glass-card p-4 border-l-4 border-cyber-red">
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Unresolved Open</p>
          <p className="text-2xl font-bold font-mono text-white mt-1">
            {incidents.filter(i => i.status === 'open').length}
          </p>
        </div>
        <div className="glass-card p-4 border-l-4 border-cyber-yellow">
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Under Investigation</p>
          <p className="text-2xl font-bold font-mono text-white mt-1">
            {incidents.filter(i => i.status === 'investigating').length}
          </p>
        </div>
        <div className="glass-card p-4 border-l-4 border-cyber-green">
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Mitigated & Closed</p>
          <p className="text-2xl font-bold font-mono text-white mt-1">
            {incidents.filter(i => i.status === 'resolved').length}
          </p>
        </div>
      </div>

      {/* Incident List */}
      <div className="space-y-4">
        {loading ? (
          <div className="glass-card p-8 text-center text-gray-500 font-mono text-xs animate-pulse">
            LOADING_INCIDENT_DOSSIERS...
          </div>
        ) : incidents.length === 0 ? (
          <div className="glass-card p-8 text-center text-gray-500 font-mono text-xs">
            NO_ACTIVE_INCIDENTS_REPORTED
          </div>
        ) : (
          incidents.map((incident) => {
            const isExpanded = expandedId === incident.id;
            return (
              <div 
                key={incident.id} 
                className={`glass-card border-gray-800/80 overflow-hidden transition-all duration-300 ${
                  incident.status === 'open' ? 'hover:border-cyber-red/30' : 'hover:border-cyber-blue/30'
                }`}
              >
                {/* Header Summary Row */}
                <div 
                  onClick={() => toggleExpand(incident.id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-dark-800/20 select-none gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`p-2.5 rounded-lg ${
                      incident.status === 'open' 
                        ? 'bg-cyber-red/10 text-cyber-red' 
                        : incident.status === 'investigating'
                        ? 'bg-cyber-yellow/10 text-cyber-yellow'
                        : 'bg-cyber-green/10 text-cyber-green'
                    }`}>
                      <FiAlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-white">{incident.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${getStatusBadge(incident.status)}`}>
                          {incident.status}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          incident.severity === 'critical' ? 'severity-critical' : incident.severity === 'high' ? 'severity-high' : 'severity-medium'
                        }`}>
                          {incident.severity}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-200 mt-1 truncate">{incident.attackType}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0 text-xs font-mono text-gray-400">
                    <div className="hidden sm:block">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Source IP</span>
                      <span className="text-cyber-blue font-semibold">{incident.sourceIp}</span>
                    </div>
                    <div className="hidden sm:block">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Logged</span>
                      <span className="flex items-center gap-1">
                        <FiClock className="w-3.5 h-3.5" />
                        <span>{new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>
                    {isExpanded ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {/* Expanded Details Pane */}
                {isExpanded && (
                  <div className="border-t border-gray-800 bg-dark-800/10 p-6 space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Timeline of events */}
                      <div className="space-y-3">
                        <h5 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <FiActivity className="text-cyber-blue" />
                          Security Event Timeline
                        </h5>
                        <div className="relative border-l border-gray-800 pl-4 ml-2 space-y-4 py-1.5">
                          {incident.timeline.map((item, idx) => (
                            <div key={idx} className="relative">
                              <span className="absolute -left-[21.5px] top-1.5 w-2 h-2 rounded-full bg-cyber-blue"></span>
                              <span className="font-mono text-[10px] text-gray-500 block">{item.time}</span>
                              <p className="text-xs text-gray-300 mt-0.5">{item.event}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions taken */}
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <h5 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                            <FiFileText className="text-cyber-green" />
                            Containment Actions Taken
                          </h5>
                          <ul className="space-y-2 text-xs text-gray-300">
                            {incident.actionsTaken.map((action, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-cyber-green font-bold select-none">[✓]</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Interactive operations form */}
                        {incident.status !== 'resolved' && (
                          <div className="pt-4 border-t border-gray-800/60 flex flex-wrap gap-2.5">
                            {incident.status === 'open' && (
                              <button
                                onClick={() => handleUpdateStatus(incident.id, 'investigating')}
                                className="px-3.5 py-1.5 bg-cyber-yellow/10 border border-cyber-yellow/40 hover:bg-cyber-yellow/20 text-cyber-yellow rounded-lg text-xs font-mono font-semibold uppercase transition-all"
                              >
                                Investigate Incident
                              </button>
                            )}
                            <button
                              onClick={() => handleUpdateStatus(incident.id, 'resolved')}
                              className="flex items-center gap-1 px-3.5 py-1.5 bg-cyber-green/15 border border-cyber-green/40 hover:bg-cyber-green/25 text-cyber-green rounded-lg text-xs font-mono font-semibold uppercase transition-all"
                            >
                              <FiCheckCircle className="w-3.5 h-3.5" />
                              <span>Mark Resolved</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Incidents;
