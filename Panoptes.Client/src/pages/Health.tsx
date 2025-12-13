import React, { useEffect, useState } from 'react';
import { getHealth, HealthResponse } from '../services/api';
import { Activity, Database, Server, HardDrive, Clock, Zap, AlertCircle, CheckCircle, XCircle, Cpu } from 'lucide-react';
import StatCard from '../components/StatCard';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

const Health: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // History for sparklines (keep last 20 points)
  const [memoryHistory, setMemoryHistory] = useState<{ time: number; value: number }[]>([]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); // Poll faster (10s) for live graph feel
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      const data = await getHealth();
      setHealth(data);
      
      // Update Memory History
      setMemoryHistory(prev => {
        const newData = [...prev, { time: Date.now(), value: data.system.memoryUsageMb }];
        return newData.slice(-20); // Keep last 20 points
      });
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch health status');
      console.error('Health check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return 'text-green-600 bg-green-100 dark:bg-green-600 dark:text-white';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-600 dark:text-black/80';
      case 'unhealthy':
        return 'text-red-600 bg-red-100 dark:bg-red-700 dark:text-white';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5" />;
      case 'unhealthy':
        return <XCircle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const formatUptime = (uptime: string) => {
    const match = uptime.match(/(\d+)\.(\d+):(\d+):(\d+)/);
    if (match) {
      const [, days, hours, minutes] = match;
      return `${days}d ${hours}h ${minutes}m`;
    }
    // Fallback for short uptimes without days
    const matchShort = uptime.match(/(\d+):(\d+):(\d+)/);
    if (matchShort) {
       return `${matchShort[1]}h ${matchShort[2]}m`;
    }
    return uptime.split('.')[0]; // remove milliseconds
  };

  if (loading && !health) { // Only show loading spinner on initial load
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-800">Health Check Failed</h3>
            <p className="text-red-600">{error || 'Unable to retrieve health status'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Activity className="w-8 h-8" />
            System Health
          </h1>
          <p className="text-gray-500 mt-1">
            Last updated: {new Date(health.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <div className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${getStatusColor(health.status)}`}>
          {getStatusIcon(health.status)}
          {health.status}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="API Version"
          value={health.version}
          subtitle="Current release"
          icon={<Zap className="w-6 h-6" />}
        />
        <StatCard
          title="System Uptime"
          value={formatUptime(health.uptime)}
          subtitle={`Started ${new Date(health.system.processStartTime).toLocaleDateString()}`}
          icon={<Clock className="w-6 h-6" />}
        />
        {/* NEW: CPU Card */}
        <StatCard
          title="CPU Load (Avg)"
          value={`${health.system.cpuUsagePercent}%`}
          subtitle={`${health.system.threadCount} active threads`}
          icon={<Cpu className="w-6 h-6" />}
        />
        {/* NEW: Memory Card with Sparkline */}
        <div className="bg-white dark:bg-card rounded-lg shadow p-6 border border-border">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Memory Usage</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {health.system.memoryUsageMb.toFixed(0)} MB
              </p>
            </div>
            <div className={`p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400`}>
              <HardDrive className="w-6 h-6" />
            </div>
          </div>
          {/* Sparkline */}
          <div className="h-10 w-full mt-2">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={memoryHistory}>
                 <Area 
                   type="monotone" 
                   dataKey="value" 
                   stroke="#3B82F6" 
                   fill="#93C5FD" 
                   strokeWidth={2}
                   fillOpacity={0.3}
                   isAnimationActive={false}
                 />
                 <YAxis domain={['auto', 'auto']} hide />
               </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Health Checks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Details */}
        <div className="rounded-lg shadow p-6 border bg-white dark:bg-card border-border hover:border-sentinel transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Health
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-mono text-xs uppercase tracking-wider text-gray-500">Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(health.checks.database.status)}`}>
                {health.checks.database.status}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-mono text-xs uppercase tracking-wider text-gray-500">Response Time</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{health.checks.database.responseTimeMs}ms</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="font-mono text-xs uppercase tracking-wider text-gray-500">Message</span>
              <span className="text-sm text-right text-gray-700 dark:text-gray-300 max-w-xs">{health.checks.database.message}</span>
            </div>
          </div>
        </div>

        {/* UtxoRPC Details */}
        <div className="rounded-lg shadow p-6 border bg-white dark:bg-card border-border hover:border-sentinel transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Server className="w-5 h-5" />
            UtxoRPC Service Health
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-mono text-xs uppercase tracking-wider text-gray-500">Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(health.checks.utxoRpc.status)}`}>
                {health.checks.utxoRpc.status}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-mono text-xs uppercase tracking-wider text-gray-500">Latency</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{health.checks.utxoRpc.latencyMs}ms</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="font-mono text-xs uppercase tracking-wider text-gray-500">Message</span>
              <span className="text-sm text-right text-gray-700 dark:text-gray-300 max-w-xs">{health.checks.utxoRpc.message}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="rounded-lg shadow p-6 border bg-white dark:bg-card border-border">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Metrics</h3>
        {health.metrics.error ? (
          <div className="p-3 bg-red-50 rounded text-sm text-red-600">
            {health.metrics.error}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-gray-500">Active Subscriptions</p>
              <p className="text-2xl font-semibold font-mono tabular-nums text-gray-900 dark:text-white mt-1">{health.metrics.activeSubscriptions}</p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-gray-500">Total Subscriptions</p>
              <p className="text-2xl font-semibold font-mono tabular-nums text-gray-900 dark:text-white mt-1">{health.metrics.totalSubscriptions}</p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-gray-500">Last Block Synced</p>
              <p className="text-2xl font-semibold font-mono tabular-nums text-gray-900 dark:text-white mt-1">
                {health.metrics.lastBlockSynced?.toLocaleString() || 'N/A'}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-gray-500">Deliveries (24h)</p>
              <p className="text-2xl font-semibold font-mono tabular-nums text-gray-900 dark:text-white mt-1">{health.metrics.deliveriesLast24h}</p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-gray-500">Successful</p>
              <p className="text-2xl font-semibold font-mono tabular-nums text-green-600 mt-1">{health.metrics.successfulDeliveries}</p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-gray-500">Failed</p>
              <p className="text-2xl font-semibold font-mono tabular-nums text-red-600 mt-1">{health.metrics.failedDeliveries}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Health;