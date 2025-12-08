import React, { useEffect, useState } from 'react';
import { getSubscriptions, getLogs, createSubscription, triggerTestEvent, updateSubscription, deleteSubscription } from '../services/api';
import { WebhookSubscription, DeliveryLog } from '../types';
import StatCard from '../components/StatCard';
import SubscriptionTable from '../components/SubscriptionTable';
import SubscriptionFilters from '../components/SubscriptionFilters';
import LogViewer from '../components/LogViewer';
import CreateSubscriptionModal from '../components/CreateSubscriptionModal';
import EditSubscriptionModal from '../components/EditSubscriptionModal';
import ConfirmationModal from '../components/ConfirmationModal';

import StatsDashboard from '../components/StatsDashboard';
import { useSubscriptionFilters } from '../hooks/useSubscriptionFilters';

type DashboardView = 'overview' | 'analytics';

import { SetupWizard } from '../components/SetupWizard';

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
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<WebhookSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<DashboardView>('overview');

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);


  // Subscription filters
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

  const fetchSubscriptions = async () => {
    try {
      const subsData = await getSubscriptions();
      setSubscriptions(subsData);
      setError(null);
      setIsConnected(true);
    } catch (error: any) {
      console.error("Error fetching subscriptions:", error);
      const errorMsg = error.response?.data || error.message || "Failed to fetch subscriptions. Please check if the API server is running.";
      setError(`API Error: ${errorMsg}`);
      setIsConnected(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const logsData = await getLogs(0, 10); // Limit to 10 most recent logs for dashboard
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
      
      // Show setup wizard if not configured
      if (!data.isConfigured) {
        setShowSetupWizard(true);
      }
    } catch (error) {
      console.error("Error fetching setup status:", error);
    }
  };

  const handleSetupComplete = () => {
    setShowSetupWizard(false);
    fetchSetupStatus();
    fetchSystemInfo();
    fetchSubscriptions();
  };

  useEffect(() => {
    fetchSetupStatus();
    fetchSubscriptions();
    fetchLogs();
    fetchSystemInfo();

    // Refresh logs every 2 seconds for real-time feel
    const logInterval = setInterval(fetchLogs, 2000);
    
    // Refresh subscriptions less frequently (e.g., every 10 seconds)
    const subInterval = setInterval(fetchSubscriptions, 10000);

    return () => {
      clearInterval(logInterval);
      clearInterval(subInterval);
    };
  }, []);

  const handleTest = async (id: string) => {
    try {
      await triggerTestEvent(id);
      fetchLogs();
      setError(null);
    } catch (error: any) {
      console.error("Error triggering test:", error);
      const errorMsg = error.response?.data || error.message || "Failed to trigger test webhook.";
      setError(`Test Failed: ${errorMsg}`);
    }
  };

  const handleCreate = async (data: { name: string; targetUrl: string; eventType: string; walletAddresses?: string[] }) => {
    try {
      await createSubscription({
        name: data.name,
        targetUrl: data.targetUrl,
        secretKey: '', // Backend will auto-generate this
        eventType: data.eventType,
        isActive: true,
        targetAddress: null,
        policyId: null,
        maxWebhooksPerMinute: 60,
        maxWebhooksPerHour: 1000,
        enableBatching: false,
        batchWindowSeconds: 10,
        walletAddresses: data.walletAddresses || null
      });
      setIsModalOpen(false);
      fetchSubscriptions();
      setError(null);
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      const errorMsg = error.response?.data || error.message || "Failed to create subscription. Check if the webhook URL is valid.";
      setError(`Create Failed: ${errorMsg}`);
      // Keep modal open so user can fix the error
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
    } catch (error: any) {
      console.error("Error updating subscription:", error);
      const errorMsg = error.response?.data || error.message || "Failed to update subscription.";
      setError(`Update Failed: ${errorMsg}`);
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
    } catch (error: any) {
      console.error("Error deleting subscription:", error);
      const errorMsg = error.response?.data || error.message || "Failed to delete subscription.";
      setError(`Delete Failed: ${errorMsg}`);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Panoptes Mission Control</h1>
              </div>
              {systemInfo && (
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    systemInfo.network === 'Mainnet' 
                      ? 'bg-green-100 text-green-800' 
                      : systemInfo.network === 'Preprod'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {systemInfo.network}
                  </span>
                  {!systemInfo.hasApiKey && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                      ⚠️ No API Key
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center">
              <a
                href="/settings"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                ⚙️ Settings
              </a>
            </div>
          </div>
          {/* Navigation Tabs */}
          <div className="flex gap-1 -mb-px">
            <button
              onClick={() => setActiveView('overview')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeView === 'overview'
                  ? 'border-sentinel text-sentinel'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4 inline-block mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Overview
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeView === 'analytics'
                  ? 'border-sentinel text-sentinel'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4 inline-block mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </button>
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
                <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <p className="mt-2 text-xs text-red-600">
                  Make sure the API server is running on port 5033. Try: <code className="bg-red-100 px-1 py-0.5 rounded">dotnet run --project Panoptes.Api</code>
                </p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex text-red-400 hover:text-red-600"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Connection Status Banner */}
        {!isConnected && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-yellow-800">Backend Disconnected - Displaying cached data</span>
            </div>
          </div>
        )}
        
        {/* Analytics View */}
        {activeView === 'analytics' && (
          <StatsDashboard subscriptions={subscriptions} />
        )}

        {/* Overview View */}
        {activeView === 'overview' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Subscriptions (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Subscriptions</h2>
              <button 
                onClick={() => setIsModalOpen(true)}
                disabled={!setupStatus?.isConfigured}
                className={`px-4 py-2 rounded-tech text-sm font-medium transition-colors ${
                  setupStatus?.isConfigured
                    ? 'bg-sentinel text-white hover:bg-sentinel-hover'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={!setupStatus?.isConfigured ? 'Complete setup first' : ''}
              >
                New Subscription
              </button>
            </div>
            
            {/* Filter Bar */}
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
            
            {/* Results count */}
            {subscriptions.length > 0 && (
              <div className="text-sm text-gray-500">
                Showing {filteredSubscriptions.length} of {subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''}
                {activeFilterCount > 0 && ' (filtered)'}
              </div>
            )}
            
            <SubscriptionTable 
              subscriptions={filteredSubscriptions}
              onTest={handleTest} 
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              hasActiveFilters={activeFilterCount > 0}
            />
          </div>

          {/* Right Column: All Delivery Logs (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Recent Logs</h2>
                {totalLogs > 0 && (
                  <span className="text-xs text-gray-500">
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
          </>
        )}
      </main>

      {/* Create Subscription Modal */}
      <CreateSubscriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
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
