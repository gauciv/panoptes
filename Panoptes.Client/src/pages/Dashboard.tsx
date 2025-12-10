import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getSubscriptions, getLogs, createSubscription, triggerTestEvent, updateSubscription, deleteSubscription, toggleSubscriptionActive, resetSubscription } from '../services/api';
import { WebhookSubscription, DeliveryLog } from '../types';
// MERGE: Branch added 'Inbox' icon for empty state
import { Inbox } from 'lucide-react';

// --- COMPONENTS ---
import StatCard from '../components/StatCard';
import { SubscriptionGrid } from '../components/SubscriptionGrid';
import SubscriptionDetail from '../pages/SubscriptionDetail';
import SubscriptionFilters from '../components/SubscriptionFilters';
import LogViewer from '../components/LogViewer';
import CreateSubscriptionModal from '../components/CreateSubscriptionModal';
import EditSubscriptionModal from '../components/EditSubscriptionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import StatsDashboard from '../components/StatsDashboard';
import { SetupWizard } from '../components/SetupWizard';
// MERGE: Branch added EmptyState and OnboardingTour
import { EmptyState } from '../components/EmptyState';
import { OnboardingTour } from '../components/OnboardingTour';

// --- HOOKS ---
import { useSubscriptionFilters } from '../hooks/useSubscriptionFilters';
// MERGE: Branch added SUBSCRIPTION_TEMPLATES
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
  const activeView = location.pathname === '/analytics' ? 'analytics' : 'overview';
  
  // --- STATE ---
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true); 

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Selection State
  const [selectedSubscription, setSelectedSubscription] = useState<WebhookSubscription | null>(null); 
  const [viewingSubscription, setViewingSubscription] = useState<WebhookSubscription | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  
  // System Info
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  // MERGE: Branch added initialModalValues state for templates
  const [initialModalValues, setInitialModalValues] = useState<{ name?: string; eventType?: string } | undefined>(undefined);

  // --- FILTERS ---
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
      const logsData = await getLogs(0, 10);
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
      // MERGE: We keep the logic from 'main' to show the setup wizard
      // if (!data.isConfigured) {
      //   setShowSetupWizard(true);
      // }
      // The branch logic relies on 'handleTourFinish' to show the wizard, which is better
      // for the onboarding flow. We'll rely on the onboarding tour logic in the component.
    } catch (error) {
      console.error("Error fetching setup status:", error);
    }
  };

  const handleSetupComplete = () => {
    setShowSetupWizard(false);
    fetchSetupStatus();
    fetchSystemInfo();
    fetchSubscriptions();
    toast.success('System configured successfully!');
  };

  useEffect(() => {
    fetchSetupStatus();
    fetchSubscriptions();
    fetchLogs();
    fetchSystemInfo();

    const logInterval = setInterval(fetchLogs, 2000);
    const subInterval = setInterval(fetchSubscriptions, 10000);

    return () => {
      clearInterval(logInterval);
      clearInterval(subInterval);
    };
  }, []);

  // --- ACTION HANDLERS ---

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
      // MERGE: Reset initial values after successful creation if they were used
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

  // MERGE: Function to set initial modal values from a template
  const handleTemplateSelect = (template: SubscriptionTemplate) => {
    setInitialModalValues({
      name: template.title,
      eventType: template.eventType,
    });
    setIsModalOpen(true);
  };

  // MERGE: Logic for handling the Onboarding Tour
  const SETUP_WIZARD_SHOWN_KEY = 'panoptes_setup_wizard_shown';

  const handleTourFinish = () => {
    console.log("Tour finished");
    // Only show the setup wizard once after onboarding
    const alreadyShown = localStorage.getItem(SETUP_WIZARD_SHOWN_KEY);
    // If the system is not configured AND the wizard hasn't been shown yet
    if (!setupStatus?.isConfigured && !alreadyShown) {
      console.log("Showing setup wizard for the first time");
      setShowSetupWizard(true);
      localStorage.setItem(SETUP_WIZARD_SHOWN_KEY, 'true');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* MERGE: Add OnboardingTour component */}
      <OnboardingTour enabled={true} onFinish={handleTourFinish} />
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


        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-4">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Connection Error</h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Offline Banner */}
        {!isConnected && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
             <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Backend Disconnected - Displaying cached data</span>
          </div>
        )}

        {/* Stats - Shown on both views */}
        {/* MERGE: Add data-tour attribute to StatCard wrapper */}
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

        {/* --- ANALYTICS VIEW --- */}
        {activeView === 'analytics' && (
          <StatsDashboard subscriptions={subscriptions} />
        )}

        {/* --- OVERVIEW VIEW --- */}
        {activeView === 'overview' && (
          <>
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
  <div className="lg:col-span-2 space-y-6">

    {/* Header */}
    <div className="flex justify-between items-center">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white">
        Subscriptions
      </h2>

      {/* MERGE: Button logic from the branch is more complex and allows triggering setup */}
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
            : 'bg-gray-400 hover:bg-gray-500' // Changed to branch's hover for the unconfigured state
        } text-white`}
        style={{ color: '#ffffff' }}
        title={!setupStatus?.isConfigured ? 'Click to configure API' : ''}
      >
        {setupStatus?.isConfigured ? 'New Subscription' : 'Configure API'}
      </button>
    </div>

    {/* Filters */}
    {/* MERGE: Added data-tour attribute to Filters wrapper */}
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

    {/* Filter Counter */}
    {subscriptions.length > 0 && (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing {filteredSubscriptions.length} of {subscriptions.length} subscription
        {subscriptions.length !== 1 ? 's' : ''}
        {activeFilterCount > 0 && ' (filtered)'}
      </div>
    )}

    {/* Grid or Empty State */}
    {/* MERGE: Adopt the EmptyState logic from the branch */}
    {subscriptions.length === 0 && !loading ? (
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
    ) : (
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
    )}
  </div>

  {/* Right Column: Recent Logs (1/3 width) */}
  {/* MERGE: Added data-tour attribute to Recent Logs wrapper */}
  <div className="lg:col-span-1" data-tour="recent-logs">
    <div className="bg-card shadow rounded-lg">
      <div className="px-6 py-5 border-b border-border flex justify-between items-center">
        <h2 className="text-lg font-medium text-foreground">Recent Logs</h2>
        {totalLogs > 0 && (
          <span className="text-xs text-muted-foreground">
            Showing {Math.min(10, logs.length)} of {totalLogs}
          </span>
        )}
      </div>
      <div className="px-6 py-5 max-h-[600px] overflow-y-auto">
        <LogViewer logs={logs || []} subscriptions={subscriptions || []} />
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
            // MERGE: Added reset of initialModalValues on close
            setInitialModalValues(undefined);
          }}
          onCreate={handleCreate}
          // MERGE: Added initialValues prop to CreateSubscriptionModal
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
          <SetupWizard onComplete={handleSetupComplete} />
        )}
    </div>
  );
};

export default Dashboard;