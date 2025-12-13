import React, { useEffect, useState } from 'react';
import { getHealth, HealthResponse } from '../services/api';
import { 
  Activity, 
  Database, 
  Server, 
  HardDrive, 
  Clock, 
  Zap, 
  AlertCircle, 
  Cpu, 
  Loader2 
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

// --- INDUSTRIAL STAT CARD ---
const StatCard = ({ title, value, subtitle, icon }: { title: string, value: string, subtitle?: string, icon: any }) => (
  <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-sm p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)]">
    <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{title}</span>
        <div className="text-zinc-400 dark:text-zinc-500">{icon}</div>
    </div>
    <div className="flex flex-col">
        <span className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{value}</span>
        {subtitle && <span className="text-[10px] font-mono text-zinc-400 mt-1">{subtitle}</span>}
    </div>
  </div>
);

const Health: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // History for sparklines (keep last 20 points)
  const [memoryHistory, setMemoryHistory] = useState<{ time: number; value: number }[]>([]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); 
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      const data = await getHealth();
      setHealth(data);
      
      setMemoryHistory(prev => {
        const newData = [...prev, { time: Date.now(), value: data.system.memoryUsageMb }];
        return newData.slice(-20); 
      });
      
      setError(null);
    } catch (err) {
      setError('Connection to health endpoint failed.');
    } finally {
      setLoading(false);
    }
  };

  // --- FIXED STATUS BADGE LOGIC ---
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900 rounded-sm">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                {/* FIX: Dark Green Text on Light Background */}
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    SYSTEM_HEALTHY
                </span>
            </div>
        );
      case 'degraded':
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 rounded-sm">
                <div className="w-2 h-2 bg-amber-500 rounded-full" />
                <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    DEGRADED
                </span>
            </div>
        );
      default:
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900 rounded-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                <span className="text-xs font-mono font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                    CRITICAL_ERROR
                </span>
            </div>
        );
    }
  };

  const formatUptime = (uptime: string) => {
    const match = uptime.match(/(\d+)\.(\d+):(\d+):(\d+)/);
    if (match) {
      const [, days, hours, minutes] = match;
      return `${days}d ${hours}h ${minutes}m`;
    }
    const matchShort = uptime.match(/(\d+):(\d+):(\d+)/);
    if (matchShort) {
       return `${matchShort[1]}h ${matchShort[2]}m`;
    }
    return uptime.split('.')[0]; 
  };

  if (loading && !health) { 
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">DIAGNOSTICS_INITIALIZING...</span>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-mono font-bold text-red-800 uppercase tracking-wider">System Diagnostic Failure</h3>
              <p className="font-mono text-sm text-red-700 mt-2">{error || 'Unable to retrieve telemetry data.'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-20">
        {/* 1. Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono uppercase tracking-tight flex items-center gap-3">
              <Activity className="w-6 h-6 text-zinc-500" />
              System_Telemetry
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-1">
              SNAPSHOT_TIME: {new Date(health.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <div>
              {getStatusBadge(health.status)}
          </div>
        </div>

        {/* 2. Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="API Version"
            value={health.version}
            subtitle="RELEASE_BUILD"
            icon={<Zap className="w-5 h-5" />}
          />
          <StatCard
            title="Uptime"
            value={formatUptime(health.uptime)}
            subtitle={`INIT: ${new Date(health.system.processStartTime).toLocaleDateString()}`}
            icon={<Clock className="w-5 h-5" />}
          />
          <StatCard
            title="CPU Load"
            value={`${health.system.cpuUsagePercent}%`}
            subtitle={`THREADS: ${health.system.threadCount}`}
            icon={<Cpu className="w-5 h-5" />}
          />
          
          {/* Memory Card with Sparkline */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-sm p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)] flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">RAM Usage</p>
                <p className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                  {health.system.memoryUsageMb.toFixed(0)} <span className="text-sm">MB</span>
                </p>
              </div>
              <HardDrive className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
            </div>
            {/* Sparkline */}
            <div className="h-12 w-full mt-2 -mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={memoryHistory}>
                  <defs>
                      <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                  </defs>
                  <Area 
                    type="stepAfter" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fill="url(#colorMem)" 
                    isAnimationActive={false}
                  />
                  <YAxis domain={['auto', 'auto']} hide />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 3. Component Health Checks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Database Module */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-sm overflow-hidden">
              <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
                      <Database className="w-4 h-4" /> Database_Module
                  </h3>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm border ${
                      health.checks.database.status.toLowerCase() === 'healthy' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' 
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                      {health.checks.database.status.toUpperCase()}
                  </span>
              </div>
              <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <span className="font-mono text-xs text-zinc-500 uppercase">Latency</span>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{health.checks.database.responseTimeMs}ms</span>
                  </div>
                  <div className="flex justify-between items-start">
                      <span className="font-mono text-xs text-zinc-500 uppercase">Diagnostic</span>
                      <span className="font-mono text-xs text-right text-zinc-700 dark:text-zinc-300 max-w-[200px] break-words">
                          {health.checks.database.message || 'NO_MESSAGE'}
                      </span>
                  </div>
              </div>
          </div>

          {/* UtxoRPC Module */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-sm overflow-hidden">
              <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
                      <Server className="w-4 h-4" /> UtxoRPC_Service
                  </h3>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm border ${
                      health.checks.utxoRpc.status.toLowerCase() === 'healthy' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' 
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                      {health.checks.utxoRpc.status.toUpperCase()}
                  </span>
              </div>
              <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <span className="font-mono text-xs text-zinc-500 uppercase">Latency</span>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{health.checks.utxoRpc.latencyMs}ms</span>
                  </div>
                  <div className="flex justify-between items-start">
                      <span className="font-mono text-xs text-zinc-500 uppercase">Diagnostic</span>
                      <span className="font-mono text-xs text-right text-zinc-700 dark:text-zinc-300 max-w-[200px] break-words">
                          {health.checks.utxoRpc.message || 'NO_MESSAGE'}
                      </span>
                  </div>
              </div>
          </div>
        </div>

        {/* 4. Operational Metrics */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-300">
                  Operational Metrics
              </h3>
          </div>
          
          <div className="p-6">
              {health.metrics.error ? (
                  <div className="p-4 bg-red-50 border border-red-200 text-xs font-mono text-red-700">
                      ERR_METRICS_UNAVAILABLE: {health.metrics.error}
                  </div>
              ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
                      <div>
                          <p className="font-mono text-[10px] uppercase text-zinc-400 mb-1">Active Hooks</p>
                          <p className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100">{health.metrics.activeSubscriptions}</p>
                      </div>
                      <div>
                          <p className="font-mono text-[10px] uppercase text-zinc-400 mb-1">Total Configured</p>
                          <p className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100">{health.metrics.totalSubscriptions}</p>
                      </div>
                      <div>
                          <p className="font-mono text-[10px] uppercase text-zinc-400 mb-1">Synced Block</p>
                          <p className="text-xl font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate" title={health.metrics.lastBlockSynced?.toLocaleString()}>
                              {health.metrics.lastBlockSynced?.toLocaleString() || 'N/A'}
                          </p>
                      </div>
                      <div>
                          <p className="font-mono text-[10px] uppercase text-zinc-400 mb-1">24h Volume</p>
                          <p className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100">{health.metrics.deliveriesLast24h}</p>
                      </div>
                      <div>
                          <p className="font-mono text-[10px] uppercase text-zinc-400 mb-1">Successful</p>
                          <p className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">{health.metrics.successfulDeliveries}</p>
                      </div>
                      <div>
                          <p className="font-mono text-[10px] uppercase text-zinc-400 mb-1">Failed</p>
                          <p className="text-2xl font-mono font-bold text-red-600 dark:text-red-400">{health.metrics.failedDeliveries}</p>
                      </div>
                  </div>
              )}
          </div>
        </div>
      </div>
    
    </div>
  );
};

export default Health;