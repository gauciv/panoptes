import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { 
  getSubscription, 
  getSubscriptionLogs, 
  updateSubscription, 
  deleteSubscription, 
  triggerTestEvent 
} from '../services/api';

import { getSubscription, getSubscriptionLogs, updateSubscription, deleteSubscription, triggerTestEvent, toggleSubscriptionActive, resetSubscription } from '../services/api';

import { WebhookSubscription, DeliveryLog } from '../types';
import EditSubscriptionModal from '../components/EditSubscriptionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SubscriptionDetailSkeleton from '../components/SubscriptionDetailSkeleton';
import Pagination from '../components/Pagination';
import ExportButton from '../components/ExportButton.tsx'; 
import { convertToCSV, downloadFile, generateFilename } from '../utils/exportUtils'; 

// --- PROPS INTERFACE ---
interface SubscriptionDetailProps {
    subscription?: WebhookSubscription | null;
    onBack?: () => void;
}

// --- HELPER COMPONENT FOR STATS ---
const StatsCard = ({ label, value, subtext, alertColor }: { label: string, value: string, subtext?: string, alertColor?: string }) => (
    <div className={`p-5 rounded-xl shadow-sm border border-gray-200 ${alertColor ? alertColor : 'bg-white'}`}>
        <p className="text-gray-500 text-sm mb-1">{label}</p>
        <p className={`text-2xl font-bold ${alertColor ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
        {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
);

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
  
  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // UI State for Logs Table
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // --- API CALLS ---
  const fetchSubscription = async () => {
    if (propSubscription) {
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
      const errorMsg = error.response?.data || error.message || "Failed to fetch subscription details.";
      setError(`API Error: ${errorMsg}`);
    }
  };

  const fetchLogs = async () => {
    if (!activeId) return;
    try {
      const skip = (currentPage - 1) * itemsPerPage;
      const logsData = await getSubscriptionLogs(activeId, skip, itemsPerPage);
      // Ensure logs is always an array
      setLogs(logsData.logs || []);
      setTotalLogs(logsData.totalCount || 0);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
      setLogs([]);
      setTotalLogs(0);
    }
  };

  // --- NEW: EXPORT HANDLER ---
  const handleExportLogs = async (format: 'csv' | 'json') => {
    if (!activeId || !subscription) return;

    try {
      // 1. Fetch ALL logs (or a reasonable large limit like 1000) so we export more than just page 1
      const limit = 1000;
      const logsData = await getSubscriptionLogs(activeId, 0, limit);
      const logsToExport = logsData.logs || [];

      if (logsToExport.length === 0) {
        alert("No logs available to export.");
        return;
      }

      // 2. Generate Filename
      const filename = generateFilename(subscription.name, format);

      // 3. Convert and Download
      if (format === 'json') {
        const jsonContent = JSON.stringify(logsToExport, null, 2);
        downloadFile(jsonContent, filename, 'application/json');
      } else {
        const csvContent = convertToCSV(logsToExport); // This utils uses the same safe extraction logic
        downloadFile(csvContent, filename, 'text/csv');
      }

    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export logs. Please try again.");
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
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [activeId, currentPage]);

  // --- ACTIONS ---
  const handleBack = () => {
      if (onBack) onBack();
      else navigate('/');
  };

  const handleTest = async () => {
    if (!activeId) return;
    try {
      await triggerTestEvent(activeId);
      fetchLogs(); 
    } catch (error: any) {
      console.error("Error triggering test:", error);
      alert("Failed to trigger test webhook.");
    }
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


  const handleResume = async () => {
    if(!activeId) return;
    try {
        await fetch(`http://localhost:5186/subscriptions/${activeId}/resume`, { method: 'POST' });
        if (!propSubscription) await fetchSubscription();
    } catch (err: any) {
        alert(`Failed to resume: ${err.message}`);
    }
  }

  // --- HELPER: ROBUST PAYLOAD EXTRACTOR ---
  const getPayload = (log: any) => {
      if (!log) return null;
      return (
          log.payloadJson || 
          log.PayloadJson ||  // PascalCase (Common in .NET)
          log.requestPayload || 
          log.RequestPayload || 
          log.data || 
          log.Data || 
          log.body || 
          log.Body || 
          null
      );
  };

  const getResponseBody = (log: any) => {
      if (!log) return null;
      return (
          log.responseBody || 
          log.ResponseBody || 
          log.response || 
          log.Response || 
          null
      );
  };

  const toggleRow = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  const renderStatusBadge = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return <span className="text-green-600 font-bold">{statusCode}</span>;
    if (statusCode === 429) return <span className="text-yellow-600 font-bold">{statusCode}</span>;
    return <span className="text-red-600 font-bold">{statusCode}</span>;
  };

  const formatJson = (data: any) => {
      if (!data) return null; 
      try {
          if (typeof data === 'object') {
              return JSON.stringify(data, null, 2);
          }
          if (typeof data === 'string') {
              try {
                  const parsed = JSON.parse(data);
                  return JSON.stringify(parsed, null, 2);
              } catch {
                  return data; 
              }
          }
          return String(data);
      } catch (e) { 
          return String(data); 
      }

  const handleToggleActive = async () => {
    if (!id) return;
    try {
      await toggleSubscriptionActive(id);
      fetchSubscription();
      setError(null);
    } catch (error: any) {
      console.error("Error toggling subscription:", error);
      const errorMsg = error.response?.data || error.message || "Failed to toggle subscription.";
      setError(`Toggle Failed: ${errorMsg}`);
    }
  };

  const handleReset = async () => {
    if (!id) return;
    try {
      await resetSubscription(id);
      fetchSubscription();
      setError(null);
    } catch (error: any) {
      console.error("Error resetting subscription:", error);
      const errorMsg = error.response?.data || error.message || "Failed to reset subscription.";
      setError(`Reset Failed: ${errorMsg}`);
    }

  };

  const calculateSuccessRate = () => {
    if (!logs || logs.length === 0) return "-";
    const relevantLogs = logs.filter(l => l.responseStatusCode !== 429);
    if (relevantLogs.length === 0) return "-";
    const successCount = relevantLogs.filter(l => l.responseStatusCode >= 200 && l.responseStatusCode < 300).length;
    return Math.round((successCount / relevantLogs.length) * 100) + "%";
  };

  const calculateAvgLatency = () => {
    if (!logs || logs.length === 0) return "0ms";
    const totalLatency = logs.reduce((sum, log) => sum + log.latencyMs, 0);
    return Math.round(totalLatency / logs.length) + "ms";
  };

  // --- RENDER ---
  if (loading && !subscription) return <SubscriptionDetailSkeleton />;
  
  if (!subscription) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Subscription not found</div>
        <button onClick={handleBack} className="ml-4 text-blue-600 underline">Go Back</button>
      </div>
    );
  }

  return (

    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300 relative max-w-7xl mx-auto p-4 sm:px-6 lg:px-8">
      
      {/* 1. Header Navigation */}
      <div className="flex items-center gap-2">
        <button onClick={handleBack} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600 font-bold">
            &larr; 
        </button>
        <h2 className="text-xl font-bold text-gray-900">{subscription.name}</h2>
      </div>

      {/* Warning Banners */}
      {subscription.isCircuitBroken && (
          <div className="bg-orange-50 border border-orange-300 rounded-md p-4 animate-in slide-in-from-top-2">

    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">{subscription.name}</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Details Card */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Subscription Details</h2>
            <div className="flex space-x-3">
              {/* Toggle Active/Paused Button */}
              {(() => {
                const isDisabled = subscription.isRateLimited || subscription.isCircuitBroken;
                if (isDisabled) {
                  return (
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 flex items-center gap-2"
                      title="Click to reset - clears rate limit and circuit breaker"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                      </svg>
                      Disabled - Click to Reset
                    </button>
                  );
                }
                return subscription.isActive ? (
                  <button
                    onClick={handleToggleActive}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-md text-sm font-medium hover:bg-green-200 flex items-center gap-2"
                    title="Click to pause - webhooks will stop, events will be queued"
                  >
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Active
                  </button>
                ) : (
                  <button
                    onClick={handleToggleActive}
                    className="px-4 py-2 bg-amber-100 text-amber-700 rounded-md text-sm font-medium hover:bg-amber-200 flex items-center gap-2"
                    title="Click to resume - queued events will be delivered"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Paused
                  </button>
                );
              })()}
              <button
                onClick={handleTest}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Test Webhook
              </button>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Edit
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
          <div className="px-6 py-5">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                  {(() => {
                    const isDisabled = subscription.isRateLimited || subscription.isCircuitBroken;
                    if (isDisabled) {
                      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">🚫 Disabled</span>;
                    }
                    return subscription.isActive ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">⏸️ Paused</span>
                    );
                  })()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Event Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{subscription.eventType}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Target URL</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono break-all">{subscription.targetUrl}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Target Address</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{subscription.targetAddress || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Policy ID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{subscription.policyId || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Wallet Address Filter</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {subscription.walletAddresses && subscription.walletAddresses.length > 0 ? (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500 mb-1">
                        Listening to {subscription.walletAddresses.length} address(es)
                      </div>
                      <div className="max-h-32 overflow-y-auto bg-gray-50 rounded p-2">
                        {subscription.walletAddresses.map((addr, idx) => (
                          <div key={idx} className="font-mono text-xs text-gray-700 break-all">
                            {addr}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-500 italic">All addresses (no filter)</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Rate Limits</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <div className="space-y-2">
                    <div>{subscription.maxWebhooksPerMinute}/min, {subscription.maxWebhooksPerHour}/hour</div>
                    {subscription.isRateLimited && (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          🚫 Rate Limited
                        </span>
                        <span className="text-xs text-red-600">Webhooks are being throttled</span>
                      </div>
                    )}
                  </div>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(subscription.createdAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Paused Banner */}
        {subscription.isPaused && (
          <div className="mb-6 bg-amber-50 border border-amber-300 rounded-md p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <svg className="h-6 w-6 text-amber-600 mr-3 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                </svg>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-amber-900">⏸️ Subscription Paused - Webhook Deliveries Halted</span>
                  <p className="text-sm text-amber-800 mt-2">
                    This subscription is currently paused. Events are still being recorded, but webhooks are not being sent to your endpoint.
                    When you resume this subscription, all pending events will be delivered.
                  </p>
                  {subscription.pausedAt && (
                    <p className="text-xs text-amber-700 mt-2">
                      <strong>Paused since:</strong> {new Date(subscription.pausedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleToggleActive}
                className="ml-4 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 whitespace-nowrap"
              >
                Resume Subscription
              </button>
            </div>
          </div>
        )}

        {/* Circuit Breaker Banner */}
        {subscription.isCircuitBroken && (
          <div className="mb-6 bg-orange-50 border border-orange-300 rounded-md p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <span className="text-2xl mr-3">⚡</span>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-orange-900">Circuit Breaker Triggered</span>
                  <p className="text-sm text-orange-800 mt-1">{subscription.circuitBrokenReason}</p>
                </div>
              </div>
              <button onClick={handleResume} className="ml-4 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700">
                Resume
              </button>
            </div>
          </div>
        )}

      {/* 2. Subscription Details Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-6">
             <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-gray-900">Subscription Details</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    subscription.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                    {subscription.isActive ? 'Active' : 'Inactive'}
                </span>
             </div>
             <div className="flex gap-2">
                {/* NEW EXPORT BUTTON ADDED HERE */}
                <ExportButton onExport={handleExportLogs} disabled={totalLogs === 0} />

                <button onClick={handleTest} className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 shadow-sm">
                    Test Webhook
                </button>
                <button onClick={() => setIsEditModalOpen(true)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 shadow-sm">
                    Edit
                </button>
                <button onClick={() => setIsDeleteModalOpen(true)} className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm font-medium hover:bg-red-100 shadow-sm">
                    Delete
                </button>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 text-sm">
            <div>
                <p className="text-gray-500 mb-1 font-medium">Target URL</p>
                <div className="font-mono text-gray-900 break-all bg-gray-50 p-2 rounded border border-gray-200 text-xs">
                    {subscription.targetUrl}
                </div>
            </div>
            <div>
                <p className="text-gray-500 mb-1 font-medium">Event Type</p>
                <p className="font-bold text-gray-900 text-base">{subscription.eventType}</p>
            </div>
            {subscription.targetAddress && (
                <div>
                    <p className="text-gray-500 mb-1 font-medium">Target Address</p>
                    <p className="font-mono text-gray-900 text-xs break-all">{subscription.targetAddress}</p>
                </div>
            )}
            <div>
                <p className="text-gray-500 mb-1 font-medium">Rate Limits</p>
                <p className="font-medium text-gray-900">
                    {subscription.maxWebhooksPerMinute}/min, {subscription.maxWebhooksPerHour}/hour
                </p>
            </div>
        </div>
      </div>

      {/* 3. Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Deliveries" value={String(totalLogs)} />
        <StatsCard label="Success Rate" value={calculateSuccessRate()} />
        <StatsCard label="Avg Latency" value={calculateAvgLatency()} />
        <div className="p-5 rounded-xl shadow-sm border border-gray-200 bg-white">
          <p className="text-gray-500 text-sm mb-1">Rate Usage</p>
          <div className="text-2xl font-bold text-green-600 flex items-baseline gap-1">
            {subscription.webhooksInLastMinute || 0}<span className="text-gray-400 text-base font-normal">/{subscription.maxWebhooksPerMinute} min</span>
          </div>
        </div>
      </div>

      {/* 4. Delivery Logs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-10">
         <div className="p-6 pb-2">
            <h3 className="text-lg font-bold text-gray-900">Delivery Logs</h3>
            <p className="text-xs text-gray-500 mt-2">
                Showing page {currentPage} of {Math.ceil(totalLogs / itemsPerPage) || 1}
            </p>
         </div>
         
         {loading && logs.length === 0 ? (
             <div className="p-10 text-center text-gray-500">Loading logs...</div>
         ) : logs.length === 0 ? (
             <div className="p-10 text-center text-gray-500 bg-gray-50">No logs found.</div>
         ) : (
             <div className="mt-4">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 hidden sm:grid">
                    <div className="col-span-3">Time</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Latency</div>
                    <div className="col-span-5">Response</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-gray-100">
                    {logs.map((log) => {
                        const timeValue = (log as any).timestamp || (log as any).createdAt || new Date();
                        const isExpanded = expandedLogId === log.id;
                        
                        // Extract with the robust helper
                        const payloadData = getPayload(log); 
                        const responseData = getResponseBody(log);

                        return (
                            <div key={log.id} className="group transition-colors">
                                <div 
                                    onClick={() => toggleRow(log.id)}
                                    className={`grid grid-cols-1 sm:grid-cols-12 gap-4 px-6 py-4 text-sm cursor-pointer hover:bg-gray-50 items-center ${isExpanded ? 'bg-gray-50' : ''}`}
                                >
                                    <div className="sm:col-span-3 text-gray-600 text-xs sm:text-sm">
                                        {new Date(timeValue).toLocaleString()}
                                    </div>
                                    <div className="sm:col-span-2 font-mono flex items-center justify-between sm:justify-start gap-4">
                                        <span className="sm:hidden font-bold text-gray-500">Status:</span>
                                        {renderStatusBadge(log.responseStatusCode)}
                                    </div>
                                    <div className="sm:col-span-2 font-mono text-gray-500 flex items-center justify-between sm:justify-start gap-4">
                                        <span className="sm:hidden font-bold text-gray-500">Latency:</span>
                                        {log.latencyMs}ms
                                    </div>
                                    <div className="sm:col-span-5 font-mono text-xs text-gray-400 truncate hidden sm:block">
                                        {responseData ? String(responseData).substring(0, 50) : '-'}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-6">
                                            {/* PAYLOAD SECTION */}
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Payload</h4>
                                                <div className="bg-white rounded border border-gray-200 p-4 font-mono text-xs text-gray-700 overflow-x-auto">
                                                    <pre>{payloadData ? formatJson(payloadData) : <span className="text-gray-400 italic">No payload content found (Received null)</span>}</pre>
                                                </div>
                                            </div>

                                            {/* RESPONSE SECTION */}
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Response</h4>
                                                <div className="bg-white rounded border border-gray-200 p-4 font-mono text-xs text-gray-700 overflow-x-auto">
                                                    <pre>{responseData ? formatJson(responseData) : <span className="text-gray-400 italic">No response content</span>}</pre>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                
                {/* Pagination */}
                <div className="p-4 border-t border-gray-200">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={totalLogs}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                </div>
             </div>
         )}
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
                title="Delete Subscription"
                message={`Are you sure you want to delete "${subscription.name}"?`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                confirmVariant="danger"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setIsDeleteModalOpen(false)}
            />
        </>
      )}
    </div>
  );
};

export default SubscriptionDetail;