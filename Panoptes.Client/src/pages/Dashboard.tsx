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
import { 
  Inbox, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  FilterX, 
  Activity, 
  ChevronUp, 
  ChevronDown,
  Plus,
  RefreshCw,
  Terminal
} from 'lucide-react';

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

  const [isStatsOpen, setIsStatsOpen] = useState(true);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-zinc-900 dark:text-zinc-100 pb-20">
      {/* Onboarding Tour */}
      <OnboardingTour enabled={true} onFinish={handleTourFinish} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      { /* Standardized Error Banner */ }
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-red-800 dark:text-red-400">Connection Error</h3>
              <p className="mt-1 text-sm font-mono text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Offline Banner */}
      {!isConnected && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 p-4 shadow-sm">
           <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
              <span className="text-sm font-mono font-bold uppercase text-amber-700 dark:text-amber-400">Backend Disconnected - Displaying Cached Data</span>
           </div>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div>
            <h1 className="text-xl font-bold font-mono uppercase tracking-tight flex items-center gap-3">
              <Terminal className="w-6 h-6 text-zinc-500" />
              Mission_Control
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-1">SYSTEM_VERSION: v1.2.0 | BUILD_8821</p>
          </div>
          
          {systemInfo && (
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border ${
                systemInfo.network === 'Mainnet' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' 
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${systemInfo.network === 'Mainnet' ? 'bg-emerald-500' : 'bg-indigo-500'} animate-pulse`} />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">{systemInfo.network}</span>
              </div>
              
              {!systemInfo.hasApiKey && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm border bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                   <AlertCircle className="w-3 h-3" />
                   <span className="text-xs font-mono font-bold uppercase tracking-wider">NO_API_KEY</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats - Only shown on overview */}
        <div className="space-y-4" data-tour="stats-overview">
    
        {/* 1. CONTROL HEADER (Visible only on Mobile) */}
          <div className="flex md:hidden items-center justify-between">
              <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-zinc-500" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">System Telemetry</h3>
              </div>
              <button 
                  onClick={() => setIsStatsOpen(!isStatsOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-sm text-xs font-mono font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider shadow-sm active:translate-y-px transition-all"
              >
                  {isStatsOpen ? 'Hide' : 'Show'}
                  {isStatsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
          </div>
          
          <div className={`
              ${isStatsOpen ? 'flex' : 'hidden'} 
              flex-col gap-4
              sm:grid sm:grid-cols-3
              transition-all duration-300 ease-in-out
          `}>
            <StatCard
              title="Active Hooks"
              value={subscriptions.filter(s => s.isActive).length.toString()}
              icon={<Activity className="w-5 h-5" />}
            />
            <StatCard
              title="Total Events"
              value={totalLogs.toString()}
              icon={<Inbox className="w-5 h-5" />}
            />
            <StatCard
              title="Success Rate"
              value={`${logs.length > 0 ? Math.round((logs.filter(l => l.responseStatusCode >= 200 && l.responseStatusCode < 300).length / logs.length) * 100) : 0}%`}
              icon={<RefreshCw className="w-5 h-5" />}
            />
          </div>
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
              <div className="lg:col-span-2 space-y-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm p-6"> 
                {/* Header */}
                <div className="flex justify-between items-center pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-zinc-400" />
                    Active_Subscriptions
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
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-sm
                            ${setupStatus?.isConfigured
                                ? 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200'
                                : 'bg-zinc-200 text-zinc-500 cursor-not-allowed dark:bg-zinc-800'
                            }
                        `}
                        title={!setupStatus?.isConfigured ? 'Click to configure API' : ''}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        {setupStatus?.isConfigured ? 'New_Subscription' : 'Configure_API'}
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
                  <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                    Showing {filteredSubscriptions.length} of {subscriptions.length} node{subscriptions.length !== 1 ? 's' : ''}
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
                  <div className="flex flex-col items-center justify-center p-12 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-sm bg-zinc-50/50 dark:bg-black/20">
                    <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-full mb-4">
                        <FilterX className="w-8 h-8 text-zinc-400" />
                    </div>
                    <h3 className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">No matching nodes</h3>
                    <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-2 mb-6 text-center max-w-sm">
                        ADJUST_SEARCH_PARAMETERS_OR_RESET_FILTERS
                    </p>
                    <button 
                        onClick={clearFilters}
                        className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 underline decoration-dotted underline-offset-4"
                    >
                        RESET_ALL_FILTERS
                    </button>
                  </div>
                ) : (
                  <div className="bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-sm p-4">
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
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm flex flex-col h-full max-h-[700px]">
                  <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
                    <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Live_Logs</h2>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Realtime</span>
                    </div>
                  </div>
                  
                  {/* Logs Container */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-50/50 dark:bg-black/20">
                    <LogViewer logs={logs || []} subscriptions={subscriptions || []} />
                  </div>

                  {/* Pagination Footer */}
                  <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-zinc-900 rounded-b-lg">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                        Page {logPage + 1} / {Math.ceil(totalLogs / LOGS_PER_PAGE)}
                    </span>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => handlePageChange(logPage - 1)}
                            disabled={logPage === 0}
                            className="p-1 rounded-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                        </button>
                        <button 
                            onClick={() => handlePageChange(logPage + 1)}
                            disabled={(logPage + 1) * LOGS_PER_PAGE >= totalLogs}
                            className="p-1 rounded-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      </div>
      

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