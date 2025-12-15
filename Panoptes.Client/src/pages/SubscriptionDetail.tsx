import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Play, 
  Pause, 
  Edit2, 
  Trash2, 
  Zap, 
  Eye, 
  EyeOff,
  Download,
  Settings,
  ChevronDown,
  ChevronUp,
  Activity,
  Server,
  Clock,
} from 'lucide-react';

import {
  getSubscription,
  getSubscriptionLogs,
  updateSubscription,
  deleteSubscription,
  toggleSubscriptionActive
} from '../services/api';

import { WebhookSubscription, DeliveryLog } from '../types';
import EditSubscriptionModal from '../components/EditSubscriptionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SubscriptionDetailSkeleton from '../components/SubscriptionDetailSkeleton';
import Pagination from '../components/Pagination';

import AdvancedOptionsModal from '../components/AdvancedOptionsModal';
// FIX: Named import to resolve error 2613
import { WebhookTester } from '../components/WebhookTester'; 
import { convertToCSV, downloadFile, generateFilename } from '../utils/exportUtils';

// --- PROPS INTERFACE ---
interface SubscriptionDetailProps {
  subscription?: WebhookSubscription | null;
  onBack?: () => void;
}

// --- INDUSTRIAL STATS CARD ---
const StatsCard = ({ label, value, icon: Icon, alertColor }: { label: string, value: string, icon: any, alertColor?: string }) => (
  <div className={`
    p-4 rounded-sm border transition-all
    ${alertColor 
        ? alertColor 
        : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)]'
    }
  `}>
    <div className="flex justify-between items-start mb-2">
        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</p>
        <Icon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
    </div>
    <p className={`text-2xl font-mono font-bold ${alertColor && !alertColor.includes('bg-white') ? 'text-red-700 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
        {value}
    </p>
  </div>
);

// DELETED: Local TestWebhookModal component (Redundant)

const SubscriptionDetail: React.FC<SubscriptionDetailProps> = ({ subscription: propSubscription, onBack }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const activeId = propSubscription?.id || paramId;

  // --- STATE ---
  const [subscription, setSubscription] = useState<WebhookSubscription | null>(propSubscription || null);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(50);
  const [loading, setLoading] = useState(!propSubscription);
  const [error, setError] = useState<string | null>(null);

  // UI States
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [showTester, setShowTester] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(false);

  // Delivery mode state
  const [deliverLatestOnly, setDeliverLatestOnly] = useState(() => {
    if (activeId) {
      const stored = localStorage.getItem(`deliverLatestOnly_${activeId}`);
      return stored === 'true';
    }
    return false;
  });

  const handleDeliverLatestOnlyChange = (value: boolean) => {
    setDeliverLatestOnly(value);
    if (activeId) localStorage.setItem(`deliverLatestOnly_${activeId}`, String(value));
  };

  // --- API CALLS ---
  const fetchSubscription = async (forceRefresh: boolean = false) => {
    if (propSubscription && !forceRefresh) {
      setSubscription(propSubscription);
      return;
    }
    if (!activeId) return;
    try {
      const data = await getSubscription(activeId);
      setSubscription(data);
      setError(null);
    } catch (error: any) {
      console.error("Error fetching subscription:", error);
      setError(`API Error: ${error.response?.data || error.message}`);
    }
  };

  const fetchLogs = async () => {
    if (!activeId) return;
    try {
      const skip = (currentPage - 1) * itemsPerPage;
      const logsData = await getSubscriptionLogs(activeId, skip, itemsPerPage);
      setLogs(logsData.logs || []);
      setTotalLogs(logsData.totalCount || 0);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
      setLogs([]);
    }
  };

  // --- EXPORT HANDLER ---
  const handleExportLogs = async (format: 'csv' | 'json') => {
    if (!activeId || !subscription) return;
    try {
      const limit = 1000; 
      const logsData = await getSubscriptionLogs(activeId, 0, limit);
      const logsToExport = logsData.logs || [];

      if (logsToExport.length === 0) {
        alert("No logs available to export.");
        return;
      }

      const filename = generateFilename(subscription.name, format);

      if (format === 'json') {
        downloadFile(JSON.stringify(logsToExport, null, 2), filename, 'application/json');
      } else {
        downloadFile(convertToCSV(logsToExport), filename, 'text/csv');
      }
    } catch (err) {
      alert("Failed to export logs.");
    }
  };

  // --- EFFECTS ---
  useEffect(() => {
    if (propSubscription) {
      setSubscription(propSubscription);
      setLoading(false);
    } else {
      setLoading(true);
      fetchSubscription().then(() => setLoading(false));
    }
  }, [activeId, propSubscription]);

  useEffect(() => {
    fetchLogs();
    const logsInterval = setInterval(fetchLogs, 3000);
    return () => clearInterval(logsInterval);
  }, [activeId, currentPage]);

  useEffect(() => {
    const subInterval = setInterval(() => fetchSubscription(true), 3000);
    return () => clearInterval(subInterval);
  }, [activeId]);

  // --- HANDLERS ---
  const handleBack = () => {
    if (onBack) onBack();
    else navigate('/');
  };

  const handleEditSave = async (data: Partial<WebhookSubscription>) => {
    if (!activeId) return;
    try {
      await updateSubscription(activeId, data);
      setIsEditModalOpen(false);
      if (!propSubscription) await fetchSubscription();
    } catch (error: any) {
      alert(`Update Failed: ${error.message}`);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!activeId) return;
    try {
      await deleteSubscription(activeId);
      if (onBack) onBack();
      else navigate('/');
    } catch (error: any) {
      alert(`Delete Failed: ${error.message}`);
      setIsDeleteModalOpen(false);
    }
  };

  const handleToggleActive = async () => {
    if (!activeId) return;
    try {
      const isCurrentlyPaused = subscription && !subscription.isActive;
      await toggleSubscriptionActive(activeId, isCurrentlyPaused ? deliverLatestOnly : false);
      await fetchSubscription(true);
      setError(null);
    } catch (err: any) {
      setError(`Toggle Failed: ${err.message}`);
    }
  };

  const handleCopyUrl = () => {
    if (!subscription) return;
    navigator.clipboard.writeText(subscription.targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleRow = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  // --- DERIVED METRICS ---
  const usageLastMinute = logs.filter(l => {
    const logTime = new Date(l.attemptedAt).getTime();
    return logTime > Date.now() - 60000;
  }).length;

  const calculateSuccessRate = () => {
    if (totalLogs === 0) return "-";
    const successCount = logs.filter(l => l.responseStatusCode >= 200 && l.responseStatusCode < 300).length;
    if (successCount === 0) return "0%";
    return Math.round((successCount / totalLogs) * 100) + "%";
  };

  const calculateAvgLatency = () => {
    if (totalLogs === 0) return "0ms";
    const totalLatency = logs.reduce((sum, log) => sum + log.latencyMs, 0);
    return Math.round(totalLatency / logs.length) + "ms";
  };

  const renderStatusBadge = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">200 OK</span>;
    }
    if (statusCode === 429) {
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">429 LIMIT</span>;
    }
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">{statusCode} ERR</span>;
  };

  const getPayload = (log: any) => {
    return log.payloadJson || log.PayloadJson || log.requestPayload || log.RequestPayload || '{}';
  };

  const getResponse = (log: any) => {
    return log.responseBody || log.ResponseBody || '(No content)';
  };

  const formatJson = (data: string | object) => {
    try {
      if (typeof data === 'string') return JSON.stringify(JSON.parse(data), null, 2);
      return JSON.stringify(data, null, 2);
    } catch (e) { return String(data); }
  };

  if (loading && !subscription) return <SubscriptionDetailSkeleton />;

  if (!subscription) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="text-red-600 font-mono">ERR: SUBSCRIPTION_NOT_FOUND</div>
        <button onClick={handleBack} className="ml-4 text-zinc-500 hover:text-zinc-900 underline font-mono">GO_BACK</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300 relative max-w-7xl mx-auto">

      {/* 1. HEADER & ACTIONS */}
      <div>
        <button 
          onClick={handleBack} 
          className="p-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-sm transition-colors text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[1px] active:shadow-none mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          
          <div className="min-w-0">
             <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight break-all mr-2">
                    {subscription.name}
                </h2>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wide border ${
                        subscription.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                    }`}>
                        {subscription.isActive ? 'OP:RUNNING' : 'OP:PAUSED'}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-800 px-1.5 rounded-sm">
                        {subscription.id}
                    </span>
                </div>
             </div>
          </div>
        </div>

        {/* INDUSTRIAL TOOLS GRID */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <button 
                onClick={() => setShowTester(true)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[1px] active:shadow-none transition-all"
            >
                <Zap className="w-3.5 h-3.5 text-indigo-500" />
                Test
            </button>
            
            <button 
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[1px] active:shadow-none transition-all"
            >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
            </button>
            
            <button 
                onClick={handleToggleActive}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[1px] active:shadow-none transition-all"
            >
                {subscription.isActive ? <Pause className="w-3.5 h-3.5 text-amber-500" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
                {subscription.isActive ? 'Pause' : 'Resume'}
            </button>
            
            <button 
                onClick={() => setIsAdvancedOptionsOpen(true)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[1px] active:shadow-none transition-all"
            >
                <Settings className="w-3.5 h-3.5" />
                Config
            </button>
            
            <button 
                onClick={() => setIsDeleteModalOpen(true)}
                className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-rose-600 dark:text-rose-400 rounded-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 text-xs font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[1px] active:shadow-none transition-all"
            >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
            </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 p-4 font-mono text-sm shadow-sm">
          <div className="flex items-start">
            <span className="mr-3 font-bold text-red-600">ERR:</span>
            <span className="text-red-800 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* 2. CONFIGURATION CARD */}
      <div className="bg-white dark:bg-zinc-900 rounded-sm border border-zinc-300 dark:border-zinc-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)]">
        <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest">System Configuration</h3>
            
            <div className="flex items-center gap-3 self-start sm:self-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-sm">
                <span className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider">Secret:</span>
                <code className="text-xs font-mono text-zinc-700 dark:text-zinc-300 tracking-wide">
                    {showSecretKey ? subscription.secretKey : "••••••••••••••••"}
                </code>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowSecretKey(!showSecretKey);
                    }} 
                    className="p-2 -mr-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors relative z-10"
                    aria-label="Toggle Secret Visibility"
                >
                    {showSecretKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
            </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-2">
            <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">Target Endpoint</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-xs text-zinc-700 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-sm border border-zinc-200 dark:border-zinc-700 truncate">
                {subscription.targetUrl}
              </div>
              <button 
                onClick={handleCopyUrl}
                className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 transition-colors shadow-sm"
                title="Copy URL"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">Event Type</p>
            <span className="inline-flex items-center px-2 py-1 rounded-sm text-xs font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                {subscription.eventType}
            </span>
          </div>

          <div>
            <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">Throughput Limits</p>
            <div className="text-sm font-mono text-zinc-800 dark:text-zinc-200 flex flex-col">
              <span>{subscription.maxWebhooksPerMinute} <span className="text-zinc-400 text-[10px]">/ min</span></span>
              <span>{subscription.maxWebhooksPerHour} <span className="text-zinc-400 text-[10px]">/ hour</span></span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. STATS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Deliveries" value={String(totalLogs)} icon={Server} />
        <StatsCard 
          label="Success Rate" 
          value={calculateSuccessRate()} 
          icon={Check}
          alertColor={totalLogs > 0 && calculateSuccessRate() === '0%' ? 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800' : undefined}
        />
        <StatsCard label="Avg Latency" value={calculateAvgLatency()} icon={Clock} />
        
        {/* Synced Rate Usage */}
        <div className="p-4 rounded-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)]">
            <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Rate Usage (1m)</p>
                <Activity className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100">{usageLastMinute}</span>
                <span className="text-xs font-mono text-zinc-400">/ {subscription.maxWebhooksPerMinute}</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-sm overflow-hidden border border-zinc-200 dark:border-zinc-700">
                <div 
                    className={`h-full ${usageLastMinute >= subscription.maxWebhooksPerMinute ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${Math.min(100, (usageLastMinute / subscription.maxWebhooksPerMinute) * 100)}%` }}
                />
            </div>
        </div>
      </div>

      {/* 4. DELIVERY LOGS */}
      <div className="bg-white dark:bg-zinc-900 rounded-sm border border-zinc-300 dark:border-zinc-700 overflow-hidden mb-10 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)]">
        <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
                <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest">Delivery Logs</h3>
            </div>
            
            <div className="flex gap-2 self-start sm:self-auto">
                <button 
                  onClick={() => handleExportLogs('json')}
                  className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider border border-zinc-300 dark:border-zinc-600 rounded-sm bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  JSON
                </button>
                <button 
                  onClick={() => handleExportLogs('csv')}
                  className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider border border-zinc-300 dark:border-zinc-600 rounded-sm bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  CSV
                </button>
            </div>
        </div>

        {loading ? (
            <div className="p-12 text-center font-mono text-xs text-zinc-500">INITIALIZING_LOG_STREAM...</div>
        ) : totalLogs === 0 ? (
            <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 font-mono text-xs">NO_DATA_AVAILABLE</div>
        ) : (
            <div>
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2 text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                    <div className="col-span-3">Timestamp</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Duration</div>
                    <div className="col-span-5">Result</div>
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {logs.map((log) => {
                        const timeValue = (log as any).timestamp || (log as any).createdAt || new Date();
                        const isExpanded = expandedLogId === log.id;
                        const isThrottled = log.responseStatusCode === 429;
                        
                        return (
                            <div key={log.id} className={`group transition-colors ${isExpanded ? 'bg-zinc-50 dark:bg-zinc-900/50' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/30'}`}>
                                <div 
                                    onClick={() => toggleRow(log.id)}
                                    className="px-6 py-3 cursor-pointer flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 items-start md:items-center"
                                >
                                    <div className="flex md:hidden w-full justify-between items-center mb-1">
                                        <div>{renderStatusBadge(log.responseStatusCode)}</div>
                                        <div className="text-xs text-zinc-500 font-mono">
                                            {new Date(timeValue).toLocaleTimeString()}
                                        </div>
                                    </div>

                                    <div className="hidden md:block col-span-3 text-zinc-600 dark:text-zinc-300 font-mono text-xs">
                                        {new Date(timeValue).toLocaleTimeString()} <span className="text-zinc-400 text-[10px]">{new Date(timeValue).toLocaleDateString()}</span>
                                    </div>

                                    <div className="hidden md:block col-span-2 font-mono">
                                        {renderStatusBadge(log.responseStatusCode)}
                                    </div>

                                    <div className="col-span-2 font-mono text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                        <span className="md:hidden font-bold">Latency:</span> {log.latencyMs}ms
                                    </div>

                                    <div className="col-span-5 w-full font-mono text-xs text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-2">
                                        <div className="md:hidden mr-1">
                                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        </div>
                                        {isThrottled && (
                                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-tight whitespace-nowrap">[Rate Limit]</span>
                                        )}
                                        <span className={`truncate ${isThrottled ? 'opacity-75' : ''}`}>
                                            {(log as any).responseBody || 'No Content'}
                                        </span>
                                    </div>
                                </div>

                                {isExpanded && (
                                <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 animate-in slide-in-from-top-1">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Payload Section */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Payload</h4>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(formatJson(getPayload(log)));
                                                    }}
                                                    className="text-[10px] font-mono font-bold text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 uppercase tracking-wider"
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-sm border border-zinc-200 dark:border-zinc-800 p-3 overflow-x-auto max-h-60 custom-scrollbar max-w-[calc(100vw-4rem)]">
                                                <pre className="text-xs font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-all">
                                                    {/* USES HELPER FUNCTION */}
                                                    {formatJson(getPayload(log))}
                                                </pre>
                                            </div>
                                        </div>

                                        {/* Response Section */}
                                        <div>
                                            <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">Server Response</h4>
                                            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-sm border border-zinc-200 dark:border-zinc-800 p-3 overflow-x-auto max-h-60 custom-scrollbar max-w-[calc(100vw-4rem)]">
                                                <pre className="text-xs font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-all">
                                                    {/* USES HELPER FUNCTION */}
                                                    {formatJson(getResponse(log))}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                          </div>
                        );
                    })}
                </div>
            </div>
        )}

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <Pagination
            currentPage={currentPage}
            totalItems={totalLogs}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* MODALS */}
      {subscription && (
        <>
          <EditSubscriptionModal
            isOpen={isEditModalOpen}
            subscription={subscription}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleEditSave}
          />
          <ConfirmationModal
            isOpen={isDeleteModalOpen}
            title="TERMINATE SUBSCRIPTION"
            message={`Confirm deletion for "${subscription.name}". This action cannot be undone.`}
            confirmLabel="TERMINATE"
            cancelLabel="CANCEL"
            confirmVariant="danger"
            onConfirm={handleDeleteConfirm}
            onCancel={() => setIsDeleteModalOpen(false)}
          />
          <AdvancedOptionsModal
            isOpen={isAdvancedOptionsOpen}
            onClose={() => setIsAdvancedOptionsOpen(false)}
            subscriptionName={subscription.name}
            deliverLatestOnly={deliverLatestOnly}
            onDeliverLatestOnlyChange={handleDeliverLatestOnlyChange}
          />
          {/* FIX: Use global WebhookTester with isOpen/onClose logic */}
          <WebhookTester 
            isOpen={showTester} 
            onClose={() => setShowTester(false)} 
            subscription={subscription} 
          />
        </>
      )}
    </div>
  );
};

export default SubscriptionDetail;