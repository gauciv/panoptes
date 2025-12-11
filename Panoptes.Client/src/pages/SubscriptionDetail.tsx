import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import {
  getSubscription,
  getSubscriptionLogs,
  updateSubscription,
  deleteSubscription,
  resetSubscription,
  toggleSubscriptionActive
} from '../services/api';

import { WebhookSubscription, DeliveryLog } from '../types';
import EditSubscriptionModal from '../components/EditSubscriptionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SubscriptionDetailSkeleton from '../components/SubscriptionDetailSkeleton';
import Pagination from '../components/Pagination';

import SubscriptionToolsModal from '../components/SubscriptionToolsModal';
import AdvancedOptionsModal from '../components/AdvancedOptionsModal';
import WebhookTester from '../components/WebhookTester';
import DeliveryLogsTable from '../components/DeliveryLogsTable';
import { convertToCSV, downloadFile, generateFilename } from '../utils/exportUtils';


// --- PROPS INTERFACE ---
interface SubscriptionDetailProps {
  subscription?: WebhookSubscription | null;
  onBack?: () => void;
}

// --- HELPER COMPONENT FOR STATS ---
const StatsCard = ({ label, value, subtext, alertColor }: { label: string, value: string, subtext?: string, alertColor?: string }) => (
  <div className={`p-5 rounded-xl shadow-sm border ${alertColor ? alertColor : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
    <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{label}</p>
    <p className={`text-2xl font-bold ${alertColor ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>{value}</p>
    {subtext && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtext}</p>}
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
  const [showTester, setShowTester] = useState(false);

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(false);

  // Note: We removed expandedLogId state because DeliveryLogsTable now handles that internally

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
        const csvContent = convertToCSV(logsToExport);
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
      console.error("Error toggling subscription:", err);
      setError(`Toggle Failed: ${err.message}`);
    }
  };

  const handleReset = async () => {
    if (!activeId) return;
    try {
      await resetSubscription(activeId);
      await fetchSubscription(true);
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
      <div className="flex items-center gap-3">
        <button 
          onClick={handleBack} 
          className="px-3 py-2 border border-[#006A33] bg-[#006A33]/10 hover:bg-[#006A33] text-[#006A33] hover:text-white transition-all font-mono font-bold text-sm uppercase tracking-wider shadow-[0_0_10px_rgba(0,106,51,0.3)] hover:shadow-[0_0_15px_rgba(0,106,51,0.6)] flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <div className="border-l border-[#006A33]/30 h-8"></div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono uppercase tracking-wider">{subscription.name}</h2>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-md p-4 animate-in slide-in-from-top-2">
          <div className="flex items-start">
            <span className="text-2xl mr-3">❌</span>
            <div className="flex-1">
              <span className="text-sm font-semibold text-red-900 dark:text-red-400">Error</span>
              <p className="text-sm text-red-800 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Warning Banners */}
      {subscription.isCircuitBroken && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-800 rounded-md p-4 animate-in slide-in-from-top-2">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <span className="text-2xl mr-3">⚡</span>
              <div className="flex-1">
                <span className="text-sm font-semibold text-orange-900 dark:text-orange-400">Circuit Breaker Triggered</span>
                <p className="text-sm text-orange-800 dark:text-orange-300 mt-1">{subscription.circuitBrokenReason}</p>
              </div>
            </div>
            <button onClick={handleReset} className="ml-4 px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white text-sm font-medium rounded-md hover:bg-orange-700 dark:hover:bg-orange-600">
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Paused Banner */}
      {!subscription.isActive && !subscription.isCircuitBroken && !subscription.isRateLimited && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800 rounded-md p-4 animate-in slide-in-from-top-2">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <svg className="h-6 w-6 text-amber-600 dark:text-amber-400 mr-3 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
              </svg>
              <div className="flex-1">
                <span className="text-sm font-semibold text-amber-900 dark:text-amber-400">⏸️ Subscription Paused - Webhook Deliveries Halted</span>
                <p className="text-sm text-amber-800 dark:text-amber-300 mt-2">
                  {deliverLatestOnly
                    ? "When you resume, only the most recent halted event will be delivered. All other queued events will be discarded."
                    : "When you resume, all halted events will be delivered to your endpoint in order."}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic">
                  Use the "Latest Only" toggle in Options to change delivery behavior.
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleActive}
              className="ml-4 px-4 py-2 bg-amber-600 dark:bg-amber-500 text-white text-sm font-medium rounded-md hover:bg-amber-700 dark:hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-amber-500 whitespace-nowrap"
            >
              Resume Subscription
            </button>
          </div>
        </div>
      )}

      {/* 2. Subscription Details Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Subscription Details</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
              subscription.isActive 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
            }`}>
              {subscription.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsOptionsModalOpen(true)}
              className="px-4 py-2 bg-[#006A33] text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#008040] shadow-[0_0_10px_rgba(0,106,51,0.5)] transition-all flex items-center gap-2 border border-[#006A33]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Tools &gt;
            </button>
            <button
              onClick={() => setIsAdvancedOptionsOpen(true)}
              className="px-4 py-2 bg-[#006A33] text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#008040] shadow-[0_0_10px_rgba(0,106,51,0.5)] transition-all flex items-center gap-2 border border-[#006A33]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Advanced &gt;
            </button>
            <button
              onClick={() => setShowTester(!showTester)}
              className="px-4 py-2 bg-[#006A33] border border-[#006A33] text-white hover:bg-[#008040] font-mono text-xs font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(0,106,51,0.5)] transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Test_Webhook
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">Target URL</p>
            <div className="font-mono text-gray-900 dark:text-gray-100 break-all bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-600 text-xs">
              {subscription.targetUrl}
            </div>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">Event Type</p>
            <p className="font-bold text-gray-900 dark:text-gray-100 text-base">{subscription.eventType}</p>
          </div>
          {subscription.targetAddress && (
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">Target Address</p>
              <p className="font-mono text-gray-900 dark:text-gray-100 text-xs break-all">{subscription.targetAddress}</p>
            </div>
          )}
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">Rate Limits</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
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
        <div className="p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Rate Usage</p>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 flex items-baseline gap-1">
            {subscription.webhooksInLastMinute || 0}<span className="text-gray-400 dark:text-gray-500 text-base font-normal">/{subscription.maxWebhooksPerMinute} min</span>
          </div>
        </div>
      </div>

      {/* 4. Delivery Logs (NOW USING THE COMPONENT) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-10">
        <div className="p-6 pb-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Delivery Logs</h3>
        </div>

        {/* Replaced manual table with the component */}
        <DeliveryLogsTable
          logs={logs}
          totalCount={totalLogs}
          currentPage={currentPage}
          pageSize={itemsPerPage}
          isLoading={loading}
        />

        {/* Kept Pagination since DeliveryLogsTable doesn't handle page changing */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
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
          <SubscriptionToolsModal
            isOpen={isOptionsModalOpen}
            onClose={() => setIsOptionsModalOpen(false)}
            onExport={handleExportLogs}
            onEdit={() => setIsEditModalOpen(true)}
            onDelete={() => setIsDeleteModalOpen(true)}
            hasLogs={totalLogs > 0}
          />
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
          <AdvancedOptionsModal
            isOpen={isAdvancedOptionsOpen}
            onClose={() => setIsAdvancedOptionsOpen(false)}
            subscriptionName={subscription.name}
            deliverLatestOnly={deliverLatestOnly}
            onDeliverLatestOnlyChange={handleDeliverLatestOnlyChange}
          />
        </>
      )}
    </div>
  );
};

export default SubscriptionDetail;