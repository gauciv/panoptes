import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';

import { 
  getSubscription, 
  getSubscriptionLogs, 
  updateSubscription, 
  deleteSubscription, 
  triggerTestEvent,
  resetSubscription,
  toggleSubscriptionActive
} from '../services/api';

import { WebhookSubscription, DeliveryLog } from '../types';
import EditSubscriptionModal from '../components/EditSubscriptionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SubscriptionDetailSkeleton from '../components/SubscriptionDetailSkeleton';
import Pagination from '../components/Pagination';
import ExportButton from '../components/ExportButton'; 
import WebhookTester from '../components/WebhookTester'; // <--- NEW IMPORT
import { convertToCSV, downloadFile, generateFilename } from '../utils/exportUtils'; 
import { EmptyState } from '../components/EmptyState';

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
  
  // New State for Webhook Tester Visibility
  const [showTester, setShowTester] = useState(false); // <--- NEW STATE

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // UI State for Logs Table
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Delivery mode when resuming - if true, only deliver the latest halted event
  // Persisted to localStorage per subscription
  const [deliverLatestOnly, setDeliverLatestOnly] = useState(() => {
    if (activeId) {
      const stored = localStorage.getItem(`deliverLatestOnly_${activeId}`);
      return stored === 'true';
    }
    return false;
  });

  // Persist deliverLatestOnly to localStorage when it changes
  const handleDeliverLatestOnlyChange = (value: boolean) => {
    setDeliverLatestOnly(value);
    if (activeId) {
      localStorage.setItem(`deliverLatestOnly_${activeId}`, String(value));
    }
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

  // NOTE: Kept original logic, but button now toggles UI instead
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


  const handleToggleActive = async () => {
    if(!activeId) return;
    try {
        // Pass deliverLatestOnly when resuming a paused subscription
        const isCurrentlyPaused = subscription && !subscription.isActive;
        await toggleSubscriptionActive(activeId, isCurrentlyPaused ? deliverLatestOnly : false);
        await fetchSubscription(true); // Force refresh to get updated state
        setError(null);
    } catch (err: any) {
        console.error("Error toggling subscription:", err);
        setError(`Toggle Failed: ${err.message}`);
    }
  };

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
  };

  const handleReset = async () => {
    if (!activeId) return;
    try {
      await resetSubscription(activeId);
      await fetchSubscription(true); // Force refresh to get updated state
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

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-300 rounded-md p-4 animate-in slide-in-from-top-2">
          <div className="flex items-start">
            <span className="text-2xl mr-3">❌</span>
            <div className="flex-1">
              <span className="text-sm font-semibold text-red-900">Error</span>
              <p className="text-sm text-red-800 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Warning Banners */}
      {subscription.isCircuitBroken && (
          <div className="bg-orange-50 border border-orange-300 rounded-md p-4 animate-in slide-in-from-top-2">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <span className="text-2xl mr-3">⚡</span>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-orange-900">Circuit Breaker Triggered</span>
                  <p className="text-sm text-orange-800 mt-1">{subscription.circuitBrokenReason}</p>
                </div>
              </div>
              <button onClick={handleReset} className="ml-4 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700">
                Reset
              </button>
            </div>
          </div>
        )}

      {/* Paused Banner */}
      {!subscription.isActive && !subscription.isCircuitBroken && !subscription.isRateLimited && (
        <div className="bg-amber-50 border border-amber-300 rounded-md p-4 animate-in slide-in-from-top-2">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <svg className="h-6 w-6 text-amber-600 mr-3 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
              <div className="flex-1">
                <span className="text-sm font-semibold text-amber-900">⏸️ Subscription Paused - Webhook Deliveries Halted</span>
                <p className="text-sm text-amber-800 mt-2">
                  {deliverLatestOnly 
                    ? "When you resume, only the most recent halted event will be delivered. All other queued events will be discarded."
                    : "When you resume, all halted events will be delivered to your endpoint in order."}
                </p>
                <p className="text-xs text-amber-600 mt-1 italic">
                  Use the "Latest Only" toggle above to change delivery behavior.
                </p>
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

      {/* 2. Subscription Details Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-6">
             <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-gray-900">Subscription Details</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  subscription.isActive
                    ? 'bg-green-100 text-green-700 dark:bg-green-600 dark:text-white'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {subscription.isActive ? 'Active' : 'Inactive'}
                </span>
             </div>
             <div className="flex gap-2 items-center">
                {/* Latest Only Toggle - Controls delivery behavior when resuming from paused state */}
                {!subscription.isRateLimited && !subscription.isCircuitBroken && (
                  <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200 transition-colors" title="When enabled, only the latest halted event will be delivered on resume">
                    <span className="text-xs font-medium text-gray-600">Latest Only</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={deliverLatestOnly}
                      onClick={() => handleDeliverLatestOnlyChange(!deliverLatestOnly)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                        deliverLatestOnly ? 'bg-amber-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          deliverLatestOnly ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </label>
                )}

                {/* Toggle Active/Paused Button */}
                {subscription.isRateLimited || subscription.isCircuitBroken ? (
                  <button onClick={handleReset} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 shadow-sm flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    Reset
                  </button>
                ) : subscription.isActive ? (
                  <button onClick={handleToggleActive} className="px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-600 dark:text-white rounded-md text-sm font-medium hover:bg-green-200 dark:hover:bg-green-700 shadow-sm flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-300"></span>
                    Active
                  </button>
                ) : (
                  <button onClick={handleToggleActive} className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-md text-sm font-medium hover:bg-amber-200 shadow-sm flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Paused
                  </button>
                )}

                {/* NEW EXPORT BUTTON ADDED HERE */}
                <ExportButton onExport={handleExportLogs} disabled={totalLogs === 0} />


                {/* MODIFIED TEST BUTTON */}
                <button 
                    onClick={() => setShowTester(!showTester)} 
                    className={`px-3 py-1.5 rounded-md text-sm font-medium shadow-sm transition-colors ${
                        showTester 
                        ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                >
                    {showTester ? 'Hide Tester' : 'Test Webhook'}
                </button>
                <button onClick={handleTest} className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                    </svg>
                    Test
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

      {/* --- NEW: WEBHOOK TESTER SECTION --- */}
      {showTester && activeId && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
             <WebhookTester 
                subscriptionId={activeId}
                targetUrl={subscription.targetUrl}
                samplePayload={{
                    event: "test_event",
                    timestamp: new Date().toISOString(),
                    subscriptionId: activeId,
                    data: {
                        message: "This is a manual test from the dashboard.",
                        user: "admin"
                    }
                }}
             />
        </div>
      )}

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
             <EmptyState
               icon={Activity}
               title="No Delivery Logs"
               description="We haven't delivered any webhooks for this subscription yet. Trigger a test event to verify your integration."
               action={{
                 label: "Trigger Test Event",
                 onClick: () => setShowTester(true)
               }}
               className="py-12"
             />
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