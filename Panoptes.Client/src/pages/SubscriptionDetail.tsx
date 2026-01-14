import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WebhookSubscription } from '../types';
import { useSubscriptionDetail } from '../hooks/useSubscriptionDetail';
import {
  DetailHeader,
  ConfigurationCard,
  StatsRow,
  DeliveryLogsCard
} from '../components/subscription-detail';
import EditSubscriptionModal from '../components/EditSubscriptionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SubscriptionDetailSkeleton from '../components/SubscriptionDetailSkeleton';
import AdvancedOptionsModal from '../components/AdvancedOptionsModal';
import { WebhookTester } from '../components/WebhookTester';

interface SubscriptionDetailProps {
  subscription?: WebhookSubscription | null;
  onBack?: () => void;
}

const SubscriptionDetail: React.FC<SubscriptionDetailProps> = ({ subscription: propSubscription, onBack }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate('/');
  };

  const {
    subscription,
    logs,
    totalLogs,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    loading,
    error,
    deliverLatestOnly,
    handleDeliverLatestOnlyChange,
    handleUpdate,
    handleDelete,
    handleToggleActive,
    handleExportLogs,
    usageLastMinute,
    calculateSuccessRate,
    calculateAvgLatency
  } = useSubscriptionDetail({
    subscriptionId: paramId,
    initialSubscription: propSubscription,
    onDeleted: handleBack
  });

  const [showTester, setShowTester] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(false);

  const handleEditSave = async (data: Partial<WebhookSubscription>) => {
    const success = await handleUpdate(data);
    if (success) setIsEditModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    await handleDelete();
  };

  if (loading && !subscription) return <SubscriptionDetailSkeleton />;

  if (!subscription) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="text-red-600 font-mono">ERR: SUBSCRIPTION_NOT_FOUND</div>
        <button onClick={handleBack} className="ml-4 text-zinc-500 hover:text-zinc-900 underline font-mono">
          GO_BACK
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300 relative max-w-7xl mx-auto">
      <DetailHeader
        subscription={subscription}
        onBack={handleBack}
        onTest={() => setShowTester(true)}
        onEdit={() => setIsEditModalOpen(true)}
        onToggleActive={handleToggleActive}
        onConfig={() => setIsAdvancedOptionsOpen(true)}
        onDelete={() => setIsDeleteModalOpen(true)}
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 p-4 font-mono text-sm shadow-sm">
          <div className="flex items-start">
            <span className="mr-3 font-bold text-red-600">ERR:</span>
            <span className="text-red-800 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      <ConfigurationCard subscription={subscription} />

      <StatsRow
        totalLogs={totalLogs}
        successRate={calculateSuccessRate()}
        avgLatency={calculateAvgLatency()}
        usageLastMinute={usageLastMinute}
        subscription={subscription}
      />

      <DeliveryLogsCard
        logs={logs}
        totalLogs={totalLogs}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        loading={loading}
        onPageChange={setCurrentPage}
        onExport={handleExportLogs}
      />

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

      <WebhookTester
        isOpen={showTester}
        onClose={() => setShowTester(false)}
        subscription={subscription}
      />
    </div>
  );
};

export default SubscriptionDetail;
