import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { WebhookSubscription } from '../types';
import { useDashboard } from '../hooks/useDashboard';
import { useSubscriptionFilters, StatusFilter, SortOption } from '../hooks/useSubscriptionFilters';
import { SubscriptionTemplate } from '../config/templates';

import {
  ErrorBanner,
  OfflineBanner,
  DashboardHeader,
  StatsOverview,
  LiveLogsPanel,
  SubscriptionsPanel
} from '../components/dashboard';

import SubscriptionDetail from './SubscriptionDetail';
import AnalyticsPage from './Analytics';
import CreateSubscriptionModal from '../components/CreateSubscriptionModal';
import EditSubscriptionModal from '../components/EditSubscriptionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { SetupWizard } from '../components/SetupWizard';
import { OnboardingTour } from '../components/OnboardingTour';

const SETUP_WIZARD_SHOWN_KEY = 'panoptes_setup_wizard_shown';

const Dashboard: React.FC = () => {
  const location = useLocation();
  const activeView = location.pathname === '/dashboard/analytics' ? 'analytics' : 'overview';

  const {
    subscriptions,
    logs,
    totalLogs,
    isConnected,
    loading,
    error,
    logPage,
    logsPerPage,
    systemInfo,
    setupStatus,
    handleTest,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleToggleActive,
    handleReset,
    handlePageChange,
    refreshAll
  } = useDashboard();

  const filterState = useSubscriptionFilters(subscriptions);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<WebhookSubscription | null>(null);
  const [viewingSubscription, setViewingSubscription] = useState<WebhookSubscription | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [initialModalValues, setInitialModalValues] = useState<{ name?: string; eventType?: string } | undefined>();

  useEffect(() => {
    const tourCompleted = localStorage.getItem('panoptes_onboarding_completed');
    if (!tourCompleted) setIsTourActive(true);
  }, []);

  const handleSetupComplete = () => {
    setShowSetupWizard(false);
    refreshAll();
    toast.success('System configured successfully!');
  };

  const handleCreateSubmit = async (data: {
    name: string;
    targetUrl: string;
    eventType: string;
    walletAddresses?: string[];
    customHeaders?: Record<string, string>;
  }) => {
    const success = await handleCreate(data);
    if (success) {
      setIsModalOpen(false);
      setInitialModalValues(undefined);
    }
  };

  const handleEditSave = async (data: Partial<WebhookSubscription>) => {
    if (!selectedSubscription) return;
    const success = await handleUpdate(selectedSubscription.id, data);
    if (success) {
      setIsEditModalOpen(false);
      setSelectedSubscription(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSubscription) return;
    const success = await handleDelete(selectedSubscription.id);
    if (success) {
      setIsDeleteModalOpen(false);
      if (viewingSubscription?.id === selectedSubscription.id) {
        setViewingSubscription(null);
      }
      setSelectedSubscription(null);
    } else {
      setIsDeleteModalOpen(false);
    }
  };

  const handleTemplateSelect = (template: SubscriptionTemplate) => {
    setInitialModalValues({ name: template.title, eventType: template.eventType });
    setIsModalOpen(true);
  };

  const handleTourFinish = () => {
    setIsTourActive(false);
    localStorage.setItem(SETUP_WIZARD_SHOWN_KEY, 'true');
  };

  const openCreateModal = () => {
    if (!setupStatus?.isConfigured && !isTourActive) {
      setShowSetupWizard(true);
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-zinc-900 dark:text-zinc-100 pb-20">
      <OnboardingTour enabled={true} onFinish={handleTourFinish} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <ErrorBanner error={error} />
        <OfflineBanner isConnected={isConnected} />

        {activeView === 'analytics' && <AnalyticsPage subscriptions={subscriptions} />}

        {activeView === 'overview' && (
          <>
            <DashboardHeader systemInfo={systemInfo} />

            <StatsOverview
              activeCount={subscriptions.filter(s => s.isActive).length}
              totalLogs={totalLogs}
              logs={logs}
            />

            {viewingSubscription ? (
              <SubscriptionDetail
                subscription={viewingSubscription}
                onBack={() => setViewingSubscription(null)}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <SubscriptionsPanel
                  subscriptions={subscriptions}
                  filteredSubscriptions={filterState.filteredSubscriptions}
                  loading={loading}
                  isConfigured={setupStatus?.isConfigured ?? false}
                  isTourActive={isTourActive}
                  filterProps={{
                    searchQuery: filterState.searchQuery,
                    statusFilter: filterState.statusFilter,
                    eventTypeFilter: filterState.eventTypeFilter,
                    sortBy: filterState.sortBy,
                    activeFilterCount: filterState.activeFilterCount,
                    availableEventTypes: filterState.availableEventTypes,
                    onSearchChange: filterState.setSearchQuery,
                    onStatusChange: (value: StatusFilter) => filterState.setStatusFilter(value),
                    onEventTypeChange: filterState.setEventTypeFilter,
                    onSortChange: (value: SortOption) => filterState.setSortBy(value),
                    onClearFilters: filterState.clearFilters
                  }}
                  onCreateClick={openCreateModal}
                  onConfigureClick={() => setShowSetupWizard(true)}
                  onSelectSubscription={setViewingSubscription}
                  onTest={handleTest}
                  onEdit={(id) => {
                    const sub = subscriptions.find(s => s.id === id);
                    if (sub) {
                      setSelectedSubscription(sub);
                      setIsEditModalOpen(true);
                    }
                  }}
                  onDelete={(id) => {
                    const sub = subscriptions.find(s => s.id === id);
                    if (sub) {
                      setSelectedSubscription(sub);
                      setIsDeleteModalOpen(true);
                    }
                  }}
                  onToggleActive={handleToggleActive}
                  onReset={handleReset}
                  onTemplateSelect={handleTemplateSelect}
                />

                <LiveLogsPanel
                  logs={logs}
                  subscriptions={subscriptions}
                  currentPage={logPage}
                  totalLogs={totalLogs}
                  logsPerPage={logsPerPage}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>

      <CreateSubscriptionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setInitialModalValues(undefined);
        }}
        onCreate={handleCreateSubmit}
        initialValues={initialModalValues}
      />

      <EditSubscriptionModal
        isOpen={isEditModalOpen}
        subscription={selectedSubscription}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSubscription(null);
        }}
        onSave={handleEditSave}
      />

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

      {showSetupWizard && (
        <SetupWizard onComplete={handleSetupComplete} onClose={() => setShowSetupWizard(false)} />
      )}
    </div>
  );
};

export default Dashboard;
