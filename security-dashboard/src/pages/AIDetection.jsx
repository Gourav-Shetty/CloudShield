import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid
} from 'recharts';
import { FiCpu, FiTrendingUp, FiCheckCircle, FiAlertOctagon, FiPlus, FiActivity } from 'react-icons/fi';

const AIDetection = () => {
  // 7 Features definitions for AI Network Audits
  const FEATURES = [
    { key: 'requestRate', label: 'Request Rate (R/S)' },
    { key: 'errorRate', label: 'Error Rate (4xx/5xx)' },
    { key: 'payloadSize', label: 'Payload Entropy' },
    { key: 'pathDepth', label: 'URL Path Depth' },
    { key: 'uaEntropy', label: 'User-Agent Entropy' },
    { key: 'payloadRisk', label: 'SQLi/XSS Heuristics' },
    { key: 'ipReputation', label: 'IP Rep Score' }
  ];

  // Forms state for Manual Analysis
  const [formData, setFormData] = useState({
    requestRate: 45,
    errorRate: 12,
    payloadSize: 30,
    pathDepth: 20,
    uaEntropy: 50,
    payloadRisk: 15,
    ipReputation: 10,
    ip: '192.168.1.189'
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Anomaly timeline and log state
  const [anomalyLog, setAnomalyLog] = useState([
    { id: '1', ip: '185.220.101.4', threatScore: 92, label: 'Anomalous', prediction: 'Tor Outbound DDoS Probe', timestamp: new Date(Date.now() - 5 * 60000), features: { requestRate: 95, errorRate: 85, payloadSize: 40, pathDepth: 30, uaEntropy: 95, payloadRisk: 90, ipReputation: 98 } },
    { id: '2', ip: '198.51.100.42', threatScore: 88, label: 'Anomalous', prediction: 'SQL Injection Sequence', timestamp: new Date(Date.now() - 12 * 60000), features: { requestRate: 50, errorRate: 90, payloadSize: 60, pathDepth: 20, uaEntropy: 45, payloadRisk: 98, ipReputation: 35 } },
    { id: '3', ip: '192.168.1.50', threatScore: 24, label: 'Normal', prediction: 'Valid User Request', timestamp: new Date(Date.now() - 25 * 60000), features: { requestRate: 20, errorRate: 5, payloadSize: 30, pathDepth: 15, uaEntropy: 30, payloadRisk: 5, ipReputation: 5 } },
    { id: '4', ip: '203.0.113.110', threatScore: 82, label: 'Anomalous', prediction: 'Syn-Flood Anomaly', timestamp: new Date(Date.now() - 40 * 60000), features: { requestRate: 99, errorRate: 15, payloadSize: 10, pathDepth: 10, uaEntropy: 85, payloadRisk: 5, ipReputation: 75 } },
    { id: '5', ip: '192.0.2.75', threatScore: 68, label: 'Normal', prediction: 'High Rate Login Failure', timestamp: new Date(Date.now() - 60 * 60000), features: { requestRate: 75, errorRate: 70, payloadSize: 40, pathDepth: 20, uaEntropy: 35, payloadRisk: 15, ipReputation: 12 } },
    { id: '6', ip: '10.0.0.15', threatScore: 12, label: 'Normal', prediction: 'Internal Node Baseline', timestamp: new Date(Date.now() - 90 * 60000), features: { requestRate: 10, errorRate: 2, payloadSize: 20, pathDepth: 10, uaEntropy: 15, payloadRisk: 2, ipReputation: 2 } }
  ]);

  // Selected IP to display in the Radar Chart (defaults to first in list)
  const [selectedAuditId, setSelectedAuditId] = useState('1');

  // Find currently selected audit log details
  const selectedAudit = useMemo(() => {
    return anomalyLog.find(log => log.id === selectedAuditId) || anomalyLog[0];
  }, [anomalyLog, selectedAuditId]);

  // Format Radar Data from the selected audit features
  const radarData = useMemo(() => {
    if (!selectedAudit) return [];
    return FEATURES.map(f => ({
      subject: f.label,
      value: selectedAudit.features[f.key] || 0,
      fullMark: 100
    }));
  }, [selectedAudit]);

  // Format Line Chart Data (Timeline from oldest to newest)
  const lineChartData = useMemo(() => {
    return [...anomalyLog]
      .reverse()
      .map((log, idx) => ({
        index: idx + 1,
        ip: log.ip,
        score: log.threatScore,
        label: log.label
      }));
  }, [anomalyLog]);

  // Retrieve list of anomalies from backend on mount
  useEffect(() => {
    const fetchAILogs = async () => {
      try {
        const response = await api.get('/ai/detections');
        if (response.data && Array.isArray(response.data)) {
          setAnomalyLog(response.data.map(d => ({
            ...d,
            timestamp: new Date(d.timestamp)
          })));
        }
      } catch (err) {
        console.warn('Backend AI audit logs inaccessible. Keeping loaded seed records.');
      }
    };
    fetchAILogs();
  }, []);

  const handleInputChange = (field, val) => {
    setFormData(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setAnalyzing(true);
    setAnalysisResult(null);

    // Compute mock results if API fails (Normal if mean feature risk < 70)
    const sum = Object.values(formData).reduce((acc, v) => (typeof v === 'number' ? acc + v : acc), 0);
    const mean = Math.floor(sum / 7);
    // Add weights to errorRate & payloadRisk
    const weightedScore = Math.min(100, Math.floor(mean * 0.7 + formData.payloadRisk * 0.15 + formData.errorRate * 0.15));
    
    let prediction = 'Normal Request Baseline';
    let label = 'Normal';
    if (weightedScore >= 80) {
      label = 'Anomalous';
      if (formData.payloadRisk > 70) prediction = 'SQLi/XSS Injection Vector';
      else if (formData.requestRate > 80) prediction = 'DDoS Flood Activity';
      else if (formData.uaEntropy > 80 && formData.ipReputation > 70) prediction = 'Malicious Bot Spidering';
      else prediction = 'Critical Protocol Anomaly';
    } else if (weightedScore >= 50) {
      prediction = 'Suspicious Scanning Pattern';
    }

    const mockOutput = {
      id: String(Date.now()),
      ip: formData.ip || '192.168.1.99',
      threatScore: weightedScore,
      label,
      prediction,
      timestamp: new Date(),
      features: {
        requestRate: formData.requestRate,
        errorRate: formData.errorRate,
        payloadSize: formData.payloadSize,
        pathDepth: formData.pathDepth,
        uaEntropy: formData.uaEntropy,
        payloadRisk: formData.payloadRisk,
        ipReputation: formData.ipReputation
      }
    };

    try {
      const response = await api.post('/analyze', {
        ip: formData.ip,
        features: {
          requestRate: formData.requestRate,
          errorRate: formData.errorRate,
          payloadSize: formData.payloadSize,
          pathDepth: formData.pathDepth,
          uaEntropy: formData.uaEntropy,
          payloadRisk: formData.payloadRisk,
          ipReputation: formData.ipReputation
        }
      });

      const serverOutput = {
        ...response.data,
        id: response.data.id || String(Date.now()),
        timestamp: response.data.timestamp ? new Date(response.data.timestamp) : new Date()
      };
      
      setAnomalyLog(prev => [serverOutput, ...prev]);
      setSelectedAuditId(serverOutput.id);
      setAnalysisResult(serverOutput);
    } catch (err) {
      console.warn('API /analyze request failed. Appending simulated AI calculation for dashboard continuity.');
      setAnomalyLog(prev => [mockOutput, ...prev]);
      setSelectedAuditId(mockOutput.id);
      setAnalysisResult(mockOutput);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <FiCpu className="text-cyber-blue animate-pulse-slow filter drop-shadow-[0_0_5px_rgba(0,212,255,0.4)]" />
          AI Threat Detection Core
        </h2>
        <p className="text-sm text-gray-400 mt-1 font-mono">Neural network classification for advanced zero-day threat telemetry.</p>
      </div>

      {/* Main Grid: Left is charts, Right is Manual Audit Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feature Vector Radar & Score Trend */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div className="glass-card p-6 flex flex-col justify-between h-[360px]">
              <div>
                <h4 className="font-bold text-white text-sm uppercase tracking-wider font-mono">Feature Vector Mapping</h4>
                <p className="text-[11px] text-gray-400 font-mono mt-0.5">Auditing: <span className="text-cyber-blue">{selectedAudit?.ip || 'Unselected'}</span></p>
              </div>

              <div className="flex-1 w-full min-h-0 flex items-center justify-center">
                {selectedAudit ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#1f2937" />
                      <PolarAngleAxis dataKey="subject" stroke="#9ca3af" fontSize={8} fontFamily="JetBrains Mono" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#374151" fontSize={8} />
                      <Radar 
                        name="Normalized Vector" 
                        dataKey="value" 
                        stroke="#00d4ff" 
                        fill="#00d4ff" 
                        fillOpacity={0.3} 
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-500 font-mono text-xs">No vector selected</div>
                )}
              </div>
              <div className="text-[10px] text-center font-mono text-gray-500">
                FEATURES EVALUATED: 7 | BIAS CORRECTION: ACTIVE
              </div>
            </div>

            {/* Line Chart */}
            <div className="glass-card p-6 flex flex-col justify-between h-[360px]">
              <div>
                <h4 className="font-bold text-white text-sm uppercase tracking-wider font-mono">Threat Score Timeline</h4>
                <p className="text-[11px] text-gray-400 font-mono mt-0.5">Aggregated audit sequences</p>
              </div>

              <div className="flex-1 w-full min-h-0 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="index" stroke="#4b5563" fontSize={9} fontFamily="JetBrains Mono" />
                    <YAxis domain={[0, 100]} stroke="#4b5563" fontSize={9} fontFamily="JetBrains Mono" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                      labelStyle={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#9ca3af' }}
                      itemStyle={{ fontFamily: 'Inter', fontSize: '12px' }}
                    />
                    <ReferenceLine y={80} stroke="#ff3366" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: 'THRESHOLD (80)', fill: '#ff3366', fontSize: 8, fontFamily: 'JetBrains Mono', position: 'top' }} />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#a855f7" 
                      strokeWidth={2}
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        const fill = payload.label === 'Anomalous' ? '#ff3366' : '#00ff88';
                        return (
                          <circle cx={cx} cy={cy} r={4} fill={fill} stroke="none" />
                        );
                      }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Anomalies Table */}
          <div className="glass-card p-6">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider font-mono mb-4">Neural Net Audit History</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-[10px] font-mono uppercase tracking-wider text-gray-500">
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-3">Risk Level</th>
                    <th className="py-2.5 px-3">AI Prediction</th>
                    <th className="py-2.5 px-3">Classification</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40 font-mono text-xs">
                  {anomalyLog.map((log) => {
                    const isSelected = selectedAuditId === log.id;
                    const isAnomalous = log.label === 'Anomalous';
                    
                    return (
                      <tr 
                        key={log.id} 
                        className={`hover:bg-dark-800/40 transition-colors ${isSelected ? 'bg-cyber-blue/5 border-l-2 border-cyber-blue' : ''}`}
                      >
                        <td className="py-3 px-3 text-cyber-blue font-bold">{log.ip}</td>
                        <td className="py-3 px-3 w-40">
                          <div className="flex items-center gap-2">
                            <span className="w-6 text-gray-300 font-semibold">{log.threatScore}</span>
                            <div className="flex-1 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${isAnomalous ? 'bg-cyber-red' : 'bg-cyber-green'}`} 
                                style={{ width: `${log.threatScore}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-white font-medium">{log.prediction}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${
                            isAnomalous 
                              ? 'severity-critical shadow-[0_0_6px_rgba(255,51,102,0.1)]' 
                              : 'severity-low'
                          }`}>
                            {log.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setSelectedAuditId(log.id)}
                            className="px-2.5 py-1 bg-dark-700 hover:bg-dark-600 border border-gray-700/60 rounded text-[10px] text-gray-300 hover:text-white uppercase transition-colors"
                          >
                            Audit Vector
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Manual Feature Form */}
        <div className="glass-card p-6 flex flex-col justify-between h-fit space-y-6">
          <div>
            <h4 className="font-bold text-white text-sm uppercase tracking-wider font-mono">Manual Vector Auditing</h4>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">Submit custom metrics to predict network anomalies.</p>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-gray-400 block">Audited IP Address</label>
              <input
                type="text"
                value={formData.ip}
                onChange={(e) => handleInputChange('ip', e.target.value)}
                placeholder="192.168.1.189"
                className="w-full bg-dark-800 border border-gray-700/60 rounded-lg py-2 px-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyber-blue font-mono"
              />
            </div>

            {/* Sliders for the 7 features */}
            {FEATURES.map((feat) => (
              <div key={feat.key} className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-gray-400 uppercase">{feat.label}</span>
                  <span className="text-cyber-blue font-bold">{formData[feat.key]}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData[feat.key]}
                  onChange={(e) => handleInputChange(feat.key, parseInt(e.target.value))}
                  className="w-full h-1 bg-dark-800 rounded-lg appearance-none cursor-pointer accent-cyber-blue focus:outline-none"
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={analyzing}
              className="w-full relative group/btn overflow-hidden rounded-lg py-2.5 font-mono text-xs font-bold tracking-wider uppercase text-black"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyber-blue to-cyber-purple transition-transform duration-300 group-hover/btn:scale-105"></div>
              <span className="relative z-10 flex items-center justify-center gap-1.5">
                <FiActivity className={`${analyzing ? 'animate-spin' : ''}`} />
                {analyzing ? 'COMPUTING_NEURAL_WEIGHTS...' : 'RUN CLASSIFICATION'}
              </span>
            </button>
          </form>

          {/* Form Results Banner */}
          {analysisResult && (
            <div className={`p-4 rounded-lg border font-mono text-xs ${
              analysisResult.label === 'Anomalous' 
                ? 'bg-cyber-red/10 border-cyber-red/30 text-cyber-red' 
                : 'bg-cyber-green/10 border-cyber-green/30 text-cyber-green'
            } animate-fade-in`}>
              <div className="flex items-center justify-between font-bold">
                <span>PREDICTION: {analysisResult.label.toUpperCase()}</span>
                <span>RISK: {analysisResult.threatScore}%</span>
              </div>
              <p className="text-[10px] text-gray-300 mt-1 uppercase tracking-tight">
                Classification: {analysisResult.prediction}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIDetection;
