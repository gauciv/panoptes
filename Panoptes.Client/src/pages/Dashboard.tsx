import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  getSubscriptions, 
  getLogs, 
  createSubscription, 
  triggerTestEvent, 
  updateSubscription, 
  deleteSubscription, 
  toggleSubscriptionActive, 
  resetSubscription 
} from '../services/api';
import { WebhookSubscription, DeliveryLog } from '../types';
import { Inbox, AlertCircle, ChevronLeft, ChevronRight, FilterX } from 'lucide-react'; // Added icons

// --- COMPONENTS ---
import StatCard from '../components/StatCard';
import { SubscriptionGrid } from '../components/SubscriptionGrid';
import { SubscriptionCardSkeleton } from '../components/skeletons/SubscriptionCardSkeleton';
import SubscriptionDetail from '../pages/SubscriptionDetail';
import SubscriptionFilters from '../components/SubscriptionFilters';
import LogViewer from '../components/LogViewer';
import CreateSubscriptionModal from '../components/CreateSubscriptionModal';
import EditSubscriptionModal from '../components/EditSubscriptionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import AnalyticsPage from './Analytics';
import { SetupWizard } from '../components/SetupWizard';
import { EmptyState } from '../components/EmptyState';
import { OnboardingTour } from '../components/OnboardingTour';

// --- HOOKS ---
import { useSubscriptionFilters } from '../hooks/useSubscriptionFilters';
import { SUBSCRIPTION_TEMPLATES, SubscriptionTemplate } from '../config/templates';

interface SystemInfo {
  network: string;
  grpcEndpoint: string;
  hasApiKey: boolean;
  availableNetworks: string[];
  configuredVia: string;
}

interface SetupStatus {
  isConfigured: boolean;
  network?: string;
  grpcEndpoint?: string;
  lastUpdated?: string;
}

const Dashboard: React.FC = () => {
  const location = useLocation();
  const activeView = location.pathname === '/dashboard/analytics' ? 'analytics' : 'overview';
  
  // --- STATE ---
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true); 

  // Pagination State for Logs
  const [logPage, setLogPage] = useState(0);
  const LOGS_PER_PAGE = 10;

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Selection State
  const [selectedSubscription, setSelectedSubscription] = useState<WebhookSubscription | null>(null); 
  const [viewingSubscription, setViewingSubscription] = useState<WebhookSubscription | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  
  // System Info & Setup
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  // Templates
  const [initialModalValues, setInitialModalValues] = useState<{ name?: string; eventType?: string } | undefined>(undefined);

  // --- FILTERS HOOK ---
  const {
    searchQuery,
    statusFilter,
    eventTypeFilter,
    sortBy,
    availableEventTypes,
    activeFilterCount,
    filteredSubscriptions,
    setSearchQuery,
    setStatusFilter,
    setEventTypeFilter,
    setSortBy,
    clearFilters,
  } = useSubscriptionFilters(subscriptions);

  // --- DATA FETCHING ---
  const fetchSubscriptions = async () => {
    try {
      const subsData = await getSubscriptions();
      setSubscriptions(subsData);
      setError(null);
      setIsConnected(true);
    } catch (error: any) {
      console.error("Error fetching subscriptions:", error);
      const errorMsg = error.response?.data || error.message || "Failed to fetch subscriptions.";
      setError(`API Error: ${errorMsg}`);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      // Use state for pagination
      const logsData = await getLogs(logPage * LOGS_PER_PAGE, LOGS_PER_PAGE);
      setLogs(logsData.logs);
      setTotalLogs(logsData.totalCount);
      setError(null);
      setIsConnected(true);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
      const errorMsg = error.response?.data || error.message || "Failed to fetch delivery logs.";
      setError(`API Error: ${errorMsg}`);
      setIsConnected(false);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const response = await fetch('/health/system-info');
      const data = await response.json();
      setSystemInfo(data);
    } catch (error) {
      console.error("Error fetching system info:", error);
    }
  };

  const fetchSetupStatus = async () => {
    try {
      const response = await fetch('/setup/status');
      const data = await response.json();
      setSetupStatus(data);
    } catch (error) {
      console.error("Error fetching setup status:", error);
    }
  };

  // --- EFFECTS ---
  useEffect(() => {
    fetchSetupStatus();
    fetchSubscriptions();
    fetchLogs();
    fetchSystemInfo();

    // Fetch logs more frequently, subs less frequently
    const logInterval = setInterval(fetchLogs, 3000); 
    const subInterval = setInterval(fetchSubscriptions, 10000);

    return () => {
      clearInterval(logInterval);
      clearInterval(subInterval);
    };
  }, [logPage]); // Re-fetch logs when page changes

  // --- HANDLERS ---

  const handleSetupComplete = () => {
    setShowSetupWizard(false);
    fetchSetupStatus();
    fetchSystemInfo();
    fetchSubscriptions();
    toast.success('System configured successfully!');
  };

  const handleSetupClose = () => {
    setShowSetupWizard(false);
  };

  const handleTest = async (id: string) => {
    try {
      await triggerTestEvent(id);
      fetchLogs();
      setError(null);
      toast.success('Test event triggered successfully!');
    } catch (error: any) {
      console.error("Error triggering test:", error);
      const errorMsg = error.response?.data || error.message || "Failed to trigger test webhook.";
      toast.error(`Test Failed: ${errorMsg}`);
    }
  };

  const handleCreate = async (data: { name: string; targetUrl: string; eventType: string; walletAddresses?: string[] }) => {
    try {
      await createSubscription({
        name: data.name,
        targetUrl: data.targetUrl,
        secretKey: '', 
        eventType: data.eventType,
        isActive: true,
        isPaused: false,
        targetAddress: null,
        policyId: null,
        maxWebhooksPerMinute: 60,
        maxWebhooksPerHour: 1000,
        enableBatching: false,
        batchWindowSeconds: 10,
        walletAddresses: data.walletAddresses || null
      });
      setIsModalOpen(false);
      setInitialModalValues(undefined);
      fetchSubscriptions();
      setError(null);
      toast.success('Subscription created successfully!');
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      const errorMsg = error.response?.data || error.message || "Failed to create subscription.";
      toast.error(errorMsg);
    }
  };

  const handleEdit = (subscription: WebhookSubscription) => {
    setSelectedSubscription(subscription);
    setIsEditModalOpen(true);
  };

  const handleEditSave = async (data: Partial<WebhookSubscription>) => {
    if (!selectedSubscription) return;
    try {
      await updateSubscription(selectedSubscription.id, data);
      setIsEditModalOpen(false);
      setSelectedSubscription(null);
      fetchSubscriptions();
      setError(null);
      toast.success('Subscription updated successfully!');
    } catch (error: any) {
      console.error("Error updating subscription:", error);
      const errorMsg = error.response?.data || error.message || "Failed to update subscription.";
      toast.error(errorMsg);
    }
  };

  const handleDeleteClick = (subscription: WebhookSubscription) => {
    setSelectedSubscription(subscription);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSubscription) return;
    try {
      await deleteSubscription(selectedSubscription.id);
      setIsDeleteModalOpen(false);
      setSelectedSubscription(null);
      fetchSubscriptions();
      setError(null);
      toast.success('Subscription deleted.');
      
      // Also close detail view if we just deleted the one we were looking at
      if (viewingSubscription?.id === selectedSubscription.id) {
        setViewingSubscription(null);
      }
    } catch (error: any) {
      console.error("Error deleting subscription:", error);
      const errorMsg = error.response?.data || error.message || "Failed to delete subscription.";
      toast.error(errorMsg);
      setIsDeleteModalOpen(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await toggleSubscriptionActive(id);
      fetchSubscriptions();
      setError(null);
    } catch (error: any) {
      console.error("Error toggling subscription:", error);
      const errorMsg = error.response?.data || error.message || "Failed to toggle subscription.";
      setError(`Toggle Failed: ${errorMsg}`);
    }
  };

  const handleReset = async (id: string) => {
    try {
      await resetSubscription(id);
      fetchSubscriptions();
      setError(null);
    } catch (error: any) {
      console.error("Error resetting subscription:", error);
      const errorMsg = error.response?.data || error.message || "Failed to reset subscription.";
      setError(`Reset Failed: ${errorMsg}`);
    }
  };

  const handleTemplateSelect = (template: SubscriptionTemplate) => {
    setInitialModalValues({
      name: template.title,
      eventType: template.eventType,
    });
    setIsModalOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage * LOGS_PER_PAGE < totalLogs) {
      setLogPage(newPage);
    }
  };

  // Onboarding Logic
  const SETUP_WIZARD_SHOWN_KEY = 'panoptes_setup_wizard_shown';

  const handleTourFinish = () => {
    console.log("Tour finished");
    const alreadyShown = localStorage.getItem(SETUP_WIZARD_SHOWN_KEY);
    if (!setupStatus?.isConfigured && !alreadyShown) {
      console.log("Showing setup wizard for the first time");
      setShowSetupWizard(true);
      localStorage.setItem(SETUP_WIZARD_SHOWN_KEY, 'true');
    }
  };

  // Derived state for Empty State vs No Results
  const hasSubscriptions = subscriptions.length > 0;
  const hasFilteredResults = filteredSubscriptions.length > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Onboarding Tour */}
      <OnboardingTour enabled={true} onFinish={handleTourFinish} />

      {/* Standardized Error Banner */}
      {error && (
        <div className="mb-6 bg-red-950/20 border border-red-900/50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-400">Connection Error</h3>
            <p className="mt-1 text-sm text-red-300/80">{error}</p>
          </div>
        </div>
      )}

      {/* Offline Banner */}
      {!isConnected && (
        <div className="mb-6 bg-yellow-950/20 border border-yellow-900/50 rounded-lg p-4">
           <span className="text-sm font-medium text-yellow-500">Backend Disconnected - Displaying cached data</span>
        </div>
      )}

      {/* --- ANALYTICS VIEW --- */}
      {activeView === 'analytics' && (
        <AnalyticsPage subscriptions={subscriptions} />
      )}

      {/* --- OVERVIEW VIEW --- */}
      {activeView === 'overview' && (
        <>
        {/* Header with System Info */}
        {systemInfo && (
          <div className="mb-6 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Panoptes Mission Control</h1>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                systemInfo.network === 'Mainnet' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : systemInfo.network === 'Preprod'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
              }`}>
                {systemInfo.network}
              </span>
              {!systemInfo.hasApiKey && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  ⚠️ No API Key
                </span>
              )}
            </div>
          </div>
        )}
        {/* Stats - Only shown on overview */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8" data-tour="stats-overview">
          <StatCard
            title="Active Hooks"
            value={subscriptions.filter(s => s.isActive).length}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
          />
          <StatCard
            title="Total Events"
            value={totalLogs}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          />
          <StatCard
            title="Success Rate"
            value={`${logs.length > 0 ? Math.round((logs.filter(l => l.responseStatusCode >= 200 && l.responseStatusCode < 300).length / logs.length) * 100) : 0}%`}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>
          {/* LOGIC SWITCH: Detail View vs List View */}
          {viewingSubscription ? (
            // 1. DETAIL VIEW
            <SubscriptionDetail 
              subscription={viewingSubscription} 
              onBack={() => setViewingSubscription(null)} 
            />
          ) : (
            // 2. LIST VIEW (Grid + Logs)
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Left Column: Subscriptions (2/3 width) */}
              <div className="lg:col-span-2 space-y-6 bg-white dark:bg-[#050505] border border-gray-200 dark:border-white/10 rounded-xl shadow p-6"> 
                {/* Header */}
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Subscriptions
                  </h2>

                  {/* Hide New Subscription Button if truly empty (Zero State) to focus on center CTA */}
                  {(hasSubscriptions || loading) && (
                    <button
                        onClick={() => {
                        if (!setupStatus?.isConfigured) {
                            setShowSetupWizard(true);
                        } else {
                            setIsModalOpen(true);
                        }
                        }}
                        data-tour="create-subscription"
                        className={`px-4 py-2 rounded-tech text-sm font-medium transition-colors ${
                        setupStatus?.isConfigured
                            ? 'bg-sentinel hover:bg-sentinel-hover'
                            : 'bg-gray-400 hover:bg-gray-500'
                        } text-white`}
                        style={{ color: '#ffffff' }}
                        title={!setupStatus?.isConfigured ? 'Click to configure API' : ''}
                    >
                        {setupStatus?.isConfigured ? 'New Subscription' : 'Configure API'}
                    </button>
                  )}
                </div>

                {/* Filters - Only show if we actually have subscriptions (Zero State Logic) */}
                {hasSubscriptions && (
                    <div data-tour="filters">
                    <SubscriptionFilters
                        searchQuery={searchQuery}
                        statusFilter={statusFilter}
                        eventTypeFilter={eventTypeFilter}
                        sortBy={sortBy}
                        activeFilterCount={activeFilterCount}
                        availableEventTypes={availableEventTypes}
                        onSearchChange={setSearchQuery}
                        onStatusChange={setStatusFilter}
                        onEventTypeChange={setEventTypeFilter}
                        onSortChange={setSortBy}
                        onClearFilters={clearFilters}
                    />
                    </div>
                )}

                {/* Filter Counter */}
                {hasSubscriptions && !loading && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {filteredSubscriptions.length} of {subscriptions.length} subscription
                    {subscriptions.length !== 1 ? 's' : ''}
                    {activeFilterCount > 0 && ' (filtered)'}
                  </div>
                )}

                {/* Grid vs Empty States Logic */}
                {loading ? (
                  // ✅ LOADING: Show Skeletons
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => <SubscriptionCardSkeleton key={i} />)}
                  </div>
                ) : !hasSubscriptions ? (
                  // ✅ ZERO STATE: User has never created a subscription
                  <EmptyState
                    icon={Inbox}
                    title="No Subscriptions Yet"
                    description="Create your first subscription to start monitoring blockchain events. Choose a template below or create a custom one."
                    action={{
                      label: "Create Subscription",
                      onClick: () => setIsModalOpen(true)
                    }}
                    secondaryActions={SUBSCRIPTION_TEMPLATES.map(t => ({
                      label: t.title,
                      onClick: () => handleTemplateSelect(t)
                    }))}
                  />
                ) : !hasFilteredResults ? (
                  // ✅ NO RESULTS: Data exists, but filters hide it
                  <div className="flex flex-col items-center justify-center p-12 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                        <FilterX className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No matching subscriptions</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6 text-center max-w-sm">
                        We couldn't find any subscriptions matching your current filters. Try adjusting your search or status.
                    </p>
                    <button 
                        onClick={clearFilters}
                        className="text-sm font-medium text-sentinel hover:text-sentinel-hover underline"
                    >
                        Clear all filters
                    </button>
                  </div>
                ) : (
                  <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                      <SubscriptionGrid
                        subscriptions={filteredSubscriptions}
                        loading={loading}
                        onSelectSubscription={setViewingSubscription}
                        onTest={handleTest}
                        onEdit={(id) => {
                          const sub = subscriptions.find(s => s.id === id);
                          if (sub) handleEdit(sub);
                        }}
                        onDelete={(id) => {
                          const sub = subscriptions.find(s => s.id === id);
                          if (sub) handleDeleteClick(sub);
                        }}
                        onToggleActive={handleToggleActive}
                        onReset={handleReset}
                      />
                  </div>
                )}
              </div>

              {/* Right Column: Recent Logs (1/3 width) */}
              <div className="lg:col-span-1" data-tour="recent-logs">
                <div className="bg-card shadow rounded-lg border flex flex-col h-full max-h-[700px]">
                  <div className="px-6 py-5 border-b border-border flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-medium text-foreground">Recent Logs</h2>
                    <span className="text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        Live
                    </span>
                  </div>
                  
                  {/* Logs Container */}
                  <div className="px-6 py-5 overflow-y-auto flex-1 custom-scrollbar">
                    {/* Note: LogViewer handles internal rendering. Pass pagination data down if component supported it, 
                        or rely on the parent slicing done in fetchLogs via getLogs(offset, limit) */}
                    <LogViewer logs={logs || []} subscriptions={subscriptions || []} />
                  </div>

                  {/* Pagination Footer */}
                  <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0 bg-gray-50 dark:bg-black/20 rounded-b-lg">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        Page {logPage + 1} of {Math.ceil(totalLogs / LOGS_PER_PAGE)}
                    </span>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => handlePageChange(logPage - 1)}
                            disabled={logPage === 0}
                            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Previous Page"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => handlePageChange(logPage + 1)}
                            disabled={(logPage + 1) * LOGS_PER_PAGE >= totalLogs}
                            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Next Page"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Subscription Modal */}
      <CreateSubscriptionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setInitialModalValues(undefined);
        }}
        onCreate={handleCreate}
        initialValues={initialModalValues}
      />

      {/* Edit Subscription Modal */}
      <EditSubscriptionModal
        isOpen={isEditModalOpen}
        subscription={selectedSubscription}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSubscription(null);
        }}
        onSave={handleEditSave}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Subscription"
        message={`Are you sure you want to delete "${selectedSubscription?.name}"? This action cannot be undone and all associated logs will be orphaned.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setSelectedSubscription(null);
        }}
      />

      {/* Setup Wizard Modal */}
      {showSetupWizard && (
        <SetupWizard onComplete={handleSetupComplete} onClose={handleSetupClose} />
      )}
    </div>
  );
};

export default Dashboard;