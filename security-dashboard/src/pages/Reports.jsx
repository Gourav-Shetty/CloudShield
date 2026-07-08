import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { 
  FiFileText, 
  FiDownload, 
  FiChevronDown, 
  FiChevronUp, 
  FiCalendar, 
  FiActivity, 
  FiInfo,
  FiSearch
} from 'react-icons/fi';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Seed Data for Security Reports Archive
  const generateMockReports = () => [
    {
      id: 'REP-2026-0412',
      ip: '198.51.100.42',
      attackType: 'SQL Injection Probe',
      severity: 'critical',
      date: new Date(Date.now() - 2 * 3600000), // 2 hours ago
      summary: 'Multi-vector database probe detected on user authentication endpoint targeting password and privilege tables.',
      findings: 'The attacker appended Union Select and SQL comment tags (-- ) inside the username field to bypass the authentication schema. Automated query checkers recognized the payload. The source IP has been blocked.',
      timeline: [
        { time: '08:42:01', description: 'Initial port request received.' },
        { time: '08:42:15', description: 'Signature SQL injection substring detected in POST body.' },
        { time: '08:42:16', description: 'WAF rules blocking triggered. Connection terminated.' },
        { time: '08:43:00', description: 'Quarantine lease established. IP blocked in gateway firewall.' }
      ]
    },
    {
      id: 'REP-2026-0409',
      ip: '203.0.113.110',
      attackType: 'DDoS Syn-Flood Attempt',
      severity: 'high',
      date: new Date(Date.now() - 24 * 3600000), // 1 day ago
      summary: 'Volumetric connection spike originating from multiple subnets attempting TCP synchronization exhaustion.',
      findings: 'A packet burst of 12,000 requests per minute saturated connection limits. Automated rate-limiting algorithms identified the malicious signature and dropped connections at edge nodes. Services remained active.',
      timeline: [
        { time: '06:12:00', description: 'Volume threshold exceeded (Requests count: 5k/min).' },
        { time: '06:13:02', description: 'Dynamic rate limiters deployed connection throttling.' },
        { time: '06:15:30', description: 'Attack mitigated. Load drops back to regular thresholds.' }
      ]
    },
    {
      id: 'REP-2026-0398',
      ip: '192.0.2.75',
      attackType: 'Brute Force Attempt',
      severity: 'medium',
      date: new Date(Date.now() - 3 * 24 * 3600000), // 3 days ago
      summary: 'Rapid sequential login failures targeted toward administrative accounts.',
      findings: 'Over 140 logins attempted across a 3-minute span with variable common username strings. CAPTCHA challenges enforced immediately, stopping the dictionary scanner.',
      timeline: [
        { time: '22:15:00', description: 'Failed login attempts spike detected (25 in 10s).' },
        { time: '22:15:15', description: 'System enforces CAPTCHA prompt on all /login routes.' },
        { time: '22:18:22', description: 'Dictionary scanner fails CAPTCHA validations. Session activity terminated.' }
      ]
    },
    {
      id: 'REP-2026-0382',
      ip: '198.51.100.19',
      attackType: 'Port Scanning Anomaly',
      severity: 'low',
      date: new Date(Date.now() - 7 * 24 * 3600000), // 7 days ago
      summary: 'Network reconnaissance scanning identified across active ports.',
      findings: 'Continuous port ping probes mapped across ports 80, 443, 8080, and 9000. Firewall rules automatically dropped scan telemetry. No target services were exposed.',
      timeline: [
        { time: '14:20:10', description: 'Probing behavior logged on port 8080.' },
        { time: '14:20:12', description: 'Automated IP blacklist updated with scanning node.' },
        { time: '14:25:00', description: 'Scanner dropped from all perimeter connections.' }
      ]
    }
  ];

  // Fetch reports on mount
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const response = await api.get('/reports');
        if (response.data && Array.isArray(response.data)) {
          setReports(response.data.map(r => ({
            ...r,
            date: new Date(r.date)
          })));
        } else {
          setReports(generateMockReports());
        }
      } catch (err) {
        console.warn('API reports index failed. Seeding reports repository locally.');
        setReports(generateMockReports());
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDownloadReport = (report) => {
    const reportData = {
      ...report,
      downloadedAt: new Date().toISOString(),
      platform: 'CloudShield AI SOC Audit Engine'
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Security_Report_${report.id}_${report.ip}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filter reports
  const filteredReports = reports.filter(report => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      report.id.toLowerCase().includes(query) ||
      report.ip.includes(query) ||
      report.attackType.toLowerCase().includes(query) ||
      report.summary.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <FiFileText className="text-cyber-blue" />
            Security Incident Reports
          </h2>
          <p className="text-sm text-gray-400 mt-1 font-mono">Forensic database archive and threat summaries.</p>
        </div>

        {/* Filter Input */}
        <div className="relative w-full sm:w-72 shrink-0">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
            <FiSearch className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports..."
            className="w-full bg-dark-800 border border-gray-700/60 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue font-mono"
          />
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="glass-card p-12 text-center text-gray-500 font-mono text-xs animate-pulse">
            RETRIEVING_REPORT_DOSSIERS...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="glass-card p-12 text-center text-gray-500 font-mono text-xs">
            NO_ARCHIVED_REPORTS_FOUND
          </div>
        ) : (
          filteredReports.map((report) => {
            const isExpanded = expandedId === report.id;
            return (
              <div 
                key={report.id}
                className="glass-card border-gray-800/80 hover:border-gray-700/50 transition-all duration-200 overflow-hidden"
              >
                {/* Header Summary Row */}
                <div 
                  onClick={() => toggleExpand(report.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-dark-800/10"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyber-blue">{report.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${
                        report.severity === 'critical' 
                          ? 'severity-critical shadow-[0_0_6px_rgba(255,51,102,0.1)]' 
                          : report.severity === 'high' 
                          ? 'severity-high' 
                          : report.severity === 'medium'
                          ? 'severity-medium'
                          : 'severity-low'
                      }`}>
                        {report.severity}
                      </span>
                      <span className="font-mono text-[11px] text-gray-500 flex items-center gap-1">
                        <FiCalendar className="w-3.5 h-3.5" />
                        {new Date(report.date).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white leading-normal truncate">
                      {report.attackType} — Origin IP: <span className="text-cyber-blue font-mono">{report.ip}</span>
                    </h3>
                    
                    <p className="text-xs text-gray-400 line-clamp-1 pr-6 font-sans">
                      {report.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadReport(report);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border border-gray-700 text-gray-300 hover:text-white rounded-md text-xs font-mono tracking-wide transition-all uppercase"
                      title="Download JSON Report"
                    >
                      <FiDownload className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Export JSON</span>
                    </button>
                    <div className="p-1.5 rounded-full hover:bg-dark-700/60 text-gray-400">
                      {isExpanded ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Forensic Pane */}
                {isExpanded && (
                  <div className="border-t border-gray-800 bg-dark-800/10 p-6 space-y-6 animate-fade-in font-sans">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Findings Excerpt */}
                      <div className="md:col-span-2 space-y-4">
                        <div className="space-y-2">
                          <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                            <FiInfo className="text-cyber-blue" />
                            Security Incident Findings
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed bg-dark-800/40 p-4 rounded-lg border border-gray-800/60">
                            {report.findings}
                          </p>
                        </div>

                        {/* Summary Block */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                            Executive Impact Summary
                          </h4>
                          <p className="text-xs text-gray-400 leading-relaxed">
                            {report.summary}
                          </p>
                        </div>
                      </div>

                      {/* Timeline audit block */}
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <FiActivity className="text-cyber-green" />
                          Packet Log Timeline
                        </h4>

                        <div className="relative border-l border-gray-800 pl-4 ml-2 space-y-4 py-1.5">
                          {report.timeline.map((event, idx) => (
                            <div key={idx} className="relative">
                              <span className="absolute -left-[21.5px] top-1.5 w-2 h-2 rounded-full bg-cyber-blue"></span>
                              <span className="font-mono text-[9px] text-gray-500 block">{event.time}</span>
                              <p className="text-xs text-gray-300 mt-0.5">{event.description}</p>
                            </div>
                          ))}
                        </div>
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

export default Reports;
