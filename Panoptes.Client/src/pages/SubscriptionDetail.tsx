import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Copy, Edit, Pause, Play, Settings, Terminal, 
  Eye, EyeOff
} from 'lucide-react'; // Ensure you have lucide-react installed

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

  // UI State
  const [showTester, setShowTester] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

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

  const calculateSuccessRate = () => {
    if (!logs || logs.length === 0) return "-";
    const total = logs.length;
    const successCount = logs.filter(l => l.responseStatusCode >= 200 && l.responseStatusCode < 300).length;
    if (successCount === 0) return "0%";
    return Math.round((successCount / total) * 100) + "%";
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
          className="group px-3 py-2 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back</span>
        </button>
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-2"></div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 font-mono tracking-tight">{subscription.name}</h2>
      </div>

      {/* Error/Warning Banners */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg p-4 flex gap-3">
          <span className="text-xl">❌</span>
          <div>
            <p className="font-bold text-red-900 dark:text-red-400 text-sm">System Error</p>
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* 2. Main Detail Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 relative overflow-hidden">
        
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Configuration</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              subscription.isActive 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
            }`}>
              {subscription.isActive ? 'Active' : 'Paused'}
            </span>
          </div>

          {/* Action Buttons (Spaced out properly) */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" /> Edit
            </button>
            
            <button
              onClick={handleToggleActive}
              className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-white transition-colors shadow-sm ${
                subscription.isActive 
                  ? 'bg-amber-600 hover:bg-amber-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {subscription.isActive ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Resume</>}
            </button>

            <button
              onClick={() => setIsOptionsModalOpen(true)}
              className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" /> Tools
            </button>

            <button
              onClick={() => setShowTester(!showTester)}
              className="px-3 py-2 bg-[#006A33] border border-[#006A33] text-white hover:bg-[#005a2b] rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-md shadow-green-900/20"
            >
              <Terminal className="w-3.5 h-3.5" /> {showTester ? 'Hide Tester' : 'Test Webhook'}
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 text-sm">
          
          {/* Target URL */}
          <div className="col-span-1 md:col-span-2">
            <p className="text-gray-500 dark:text-gray-400 mb-1.5 font-medium flex items-center gap-2">Target Endpoint</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 block bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-2.5 font-mono text-xs text-gray-800 dark:text-gray-200 break-all">
                {subscription.targetUrl}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(subscription.targetUrl)}
                className="p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                title="Copy URL"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Event Type */}
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">Trigger Event</p>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 dark:text-white text-base">{subscription.eventType}</span>
              {subscription.minimumLovelace ? (
                <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400">
                  Min: {subscription.minimumLovelace / 1000000} ADA
                </span>
              ) : null}
            </div>
          </div>

          {/* Rate Limits */}
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">Rate Limits</p>
            <p className="font-mono text-gray-900 dark:text-white">
              {subscription.maxWebhooksPerMinute}/min &bull; {subscription.maxWebhooksPerHour}/hour
            </p>
          </div>

          {/* Wallet Filters (New Chips Section) */}
          <div className="col-span-1 md:col-span-2">
            <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium flex justify-between">
              <span>Filter Targets</span>
              <span className="text-xs font-normal opacity-70">
                {subscription.walletAddresses?.length || 0} active filters
              </span>
            </p>
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-3 min-h-[50px]">
              {subscription.walletAddresses && subscription.walletAddresses.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {subscription.walletAddresses.map((addr, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 shadow-sm" title={addr}>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-green-500 mr-2"></span>
                      {addr.length > 20 ? `${addr.substring(0, 8)}...${addr.substring(addr.length - 6)}` : addr}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm italic">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  Listening to ALL events (Firehose Mode)
                </div>
              )}
            </div>
          </div>

          {/* Secret Key (Moved Here) */}
          <div className="col-span-1 md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wide">
                HMAC Secret Key
              </p>
              <button 
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="text-xs text-indigo-600 dark:text-green-400 hover:underline flex items-center gap-1"
              >
                {showSecretKey ? <><EyeOff className="w-3 h-3"/> Hide</> : <><Eye className="w-3 h-3"/> Reveal</>}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 block bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-400">
                {showSecretKey ? subscription.secretKey : '•'.repeat(48)}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(subscription.secretKey || '')}
                className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 px-2"
                title="Copy Secret"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Use this key to verify the <code>X-Panoptes-Signature</code> header in your backend for security.
            </p>
          </div>

        </div>
      </div>

      {/* Tester Component */}
      {showTester && activeId && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <WebhookTester
            subscriptionId={activeId}
            targetUrl={subscription.targetUrl}
            samplePayload={{
              event: "test_event",
              timestamp: new Date().toISOString(),
              subscriptionId: activeId,
              data: { message: "Manual test from dashboard" }
            }}
          />
        </div>
      )}

      {/* 3. Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Deliveries" value={String(totalLogs)} />
        <StatsCard 
          label="Success Rate" 
          value={calculateSuccessRate()} 
          alertColor={totalLogs > 0 && calculateSuccessRate() === '0%' ? 'border border-red-300 bg-red-50 dark:bg-red-900/20' : undefined}
        />
        <StatsCard label="Avg Latency" value={calculateAvgLatency()} />
        <div className="p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Rate Usage</p>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 flex items-baseline gap-1">
            {subscription.webhooksInLastMinute || 0}<span className="text-gray-400 dark:text-gray-500 text-base font-normal">/{subscription.maxWebhooksPerMinute} min</span>
          </div>
        </div>
      </div>

      {/* 4. Delivery Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-10">
        <div className="p-6 pb-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Delivery Logs</h3>
        </div>

        <DeliveryLogsTable
          logs={logs}
          totalCount={totalLogs}
          currentPage={currentPage}
          pageSize={itemsPerPage}
          isLoading={loading}
        />

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
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