import React, { useEffect, useState } from 'react';
import { getHealth, HealthResponse } from '../services/api';
import { Activity, Database, Server, HardDrive, Clock, Zap, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import StatCard from '../components/StatCard';

const Health: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      const data = await getHealth();
      setHealth(data);
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
    // Parse uptime format: "00:00:00" or timespan format
    const match = uptime.match(/(\d+)\.(\d+):(\d+):(\d+)/);
    if (match) {
      const [, days, hours, minutes] = match;
      return `${days}d ${hours}h ${minutes}m`;
    }
    return uptime;
  };

  if (loading) {
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
            Last updated: {new Date(health.timestamp).toLocaleString()}
          </p>
        </div>
        <div className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${getStatusColor(health.status)}`}>
          {getStatusIcon(health.status)}
          {health.status}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>

      {/* Detailed Health Checks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Details */}
        <div className="rounded-lg shadow p-6 border bg-white border-gray-200 hover:border-sentinel transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
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
              <span className="font-mono font-semibold text-gray-900">{health.checks.database.responseTimeMs}ms</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="font-mono text-xs uppercase tracking-wider text-gray-500">Message</span>
              <span className="text-sm text-right text-gray-700 max-w-xs">{health.checks.database.message}</span>
            </div>
            {health.checks.database.error && (
              <div className="mt-2 p-3 bg-red-50 rounded text-sm text-red-600">
                {health.checks.database.error}
              </div>
            )}
          </div>
        </div>

        {/* UtxoRPC Details */}
        <div className="rounded-lg shadow p-6 border bg-white border-gray-200 hover:border-sentinel transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
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
              <span className="font-mono font-semibold text-gray-900">{health.checks.utxoRpc.latencyMs}ms</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="font-mono text-xs uppercase tracking-wider text-gray-500">Message</span>
              <span className="text-sm text-right text-gray-700 max-w-xs">{health.checks.utxoRpc.message}</span>
            </div>
            {health.checks.utxoRpc.error && (
              <div className="mt-2 p-3 bg-red-50 rounded text-sm text-red-600">
                {health.checks.utxoRpc.error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="rounded-lg shadow p-6 border bg-white border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Metrics</h3>
        {health.metrics.error ? (
          <div className="p-3 bg-red-50 rounded text-sm text-red-600">
            {health.metrics.error}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-gray-500">Active Subscriptions</p>
              <p className="text-2xl font-semibold font-mono tabular-nums text-gray-900 mt-1">{health.metrics.activeSubscriptions}</p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-gray-500">Total Subscriptions</p>
              <p className="text-2xl font-semibold font-mono tabular-nums text-gray-900 mt-1">{health.metrics.totalSubscriptions}</p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-gray-500">Last Block Synced</p>
              <p className="text-2xl font-semibold font-mono tabular-nums text-gray-900 mt-1">
                {health.metrics.lastBlockSynced?.toLocaleString() || 'N/A'}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-gray-500">Deliveries (24h)</p>
              <p className="text-2xl font-semibold font-mono tabular-nums text-gray-900 mt-1">{health.metrics.deliveriesLast24h}</p>
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

      {/* System Information */}
      <div className="rounded-lg shadow p-6 border bg-white border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <HardDrive className="w-5 h-5" />
          System Information
        </h3>
        {health.system.error ? (
          <div className="p-3 bg-red-50 rounded text-sm text-red-600">
            {health.system.error}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-gray-500">Memory Usage</p>
              <p className="text-2xl font-semibold font-mono tabular-nums text-gray-900 mt-1">{health.system.memoryUsageMb.toFixed(2)} MB</p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-gray-500">Garbage Collector Memory</p>
              <p className="text-2xl font-semibold font-mono tabular-nums text-gray-900 mt-1">{health.system.gcMemoryMb.toFixed(2)} MB</p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-gray-500">Thread Count</p>
              <p className="text-2xl font-semibold font-mono tabular-nums text-gray-900 mt-1">{health.system.threadCount}</p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-gray-500">Process Started</p>
              <p className="text-sm font-semibold font-mono text-gray-900 mt-1">
                {new Date(health.system.processStartTime).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Health;
