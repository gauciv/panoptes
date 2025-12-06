import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSubscription, getSubscriptionLogs, updateSubscription, deleteSubscription, triggerTestEvent } from '../services/api';
import { WebhookSubscription, DeliveryLog } from '../types';
import DeliveryLogsTable from '../components/DeliveryLogsTable';
import EditSubscriptionModal from '../components/EditSubscriptionModal';
import ConfirmationModal from '../components/ConfirmationModal';

const SubscriptionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [subscription, setSubscription] = useState<WebhookSubscription | null>(null);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchSubscription = async () => {
    if (!id) return;
    try {
      const data = await getSubscription(id);
      setSubscription(data);
      setError(null);
    } catch (error: any) {
      console.error("Error fetching subscription:", error);
      const errorMsg = error.response?.data || error.message || "Failed to fetch subscription details.";
      setError(`API Error: ${errorMsg}`);
    }
  };

  const fetchLogs = async () => {
    if (!id) return;
    try {
      const logsData = await getSubscriptionLogs(id, 0, 100);
      setLogs(logsData.logs);
      setTotalLogs(logsData.totalCount);
      setError(null);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
      const errorMsg = error.response?.data || error.message || "Failed to fetch delivery logs.";
      setError(`API Error: ${errorMsg}`);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchSubscription();
      await fetchLogs();
      setLoading(false);
    };

    loadData();

    // Refresh logs every 3 seconds
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const handleTest = async () => {
    if (!id) return;
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

  const handleEditSave = async (data: Partial<WebhookSubscription>) => {
    if (!id) return;
    try {
      await updateSubscription(id, data);
      setIsEditModalOpen(false);
      fetchSubscription();
      setError(null);
    } catch (error: any) {
      console.error("Error updating subscription:", error);
      const errorMsg = error.response?.data || error.message || "Failed to update subscription.";
      setError(`Update Failed: ${errorMsg}`);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!id) return;
    try {
      await deleteSubscription(id);
      navigate('/');
    } catch (error: any) {
      console.error("Error deleting subscription:", error);
      const errorMsg = error.response?.data || error.message || "Failed to delete subscription.";
      setError(`Delete Failed: ${errorMsg}`);
      setIsDeleteModalOpen(false);
    }
  };

  const calculateSuccessRate = () => {
    if (logs.length === 0) return 0;
    const successCount = logs.filter(l => l.responseStatusCode >= 200 && l.responseStatusCode < 300).length;
    return Math.round((successCount / logs.length) * 100);
  };

  const calculateAvgLatency = () => {
    if (logs.length === 0) return 0;
    const totalLatency = logs.reduce((sum, log) => sum + log.latencyMs, 0);
    return Math.round(totalLatency / logs.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-red-600">Subscription not found</div>
      </div>
    );
  }

  return (
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
                <dd className="mt-1 text-sm text-gray-900">
                  {subscription.isActive ? (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Inactive</span>
                  )}
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

        {/* Rate Limit Warning Banner */}
        {subscription.isRateLimited && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <span className="text-sm font-medium text-red-800">Rate Limit Exceeded</span>
                <p className="text-xs text-red-700 mt-1">
                  This subscription has hit its rate limit. New webhooks will resume after the limit window resets.
                  Current usage: {subscription.webhooksInLastMinute}/{subscription.maxWebhooksPerMinute} per minute, 
                  {subscription.webhooksInLastHour}/{subscription.maxWebhooksPerHour} per hour.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Deliveries</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{logs.length}</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Success Rate</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{calculateSuccessRate()}%</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Avg Latency</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{calculateAvgLatency()}ms</dd>
            </div>
          </div>
          <div className={`overflow-hidden shadow rounded-lg ${subscription.isRateLimited ? 'bg-red-50' : 'bg-white'}`}>
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Rate Usage</dt>
              <dd className="mt-1 space-y-1">
                <div className={`text-lg font-semibold ${
                  (subscription.webhooksInLastMinute || 0) >= subscription.maxWebhooksPerMinute 
                    ? 'text-red-600' 
                    : (subscription.webhooksInLastMinute || 0) >= subscription.maxWebhooksPerMinute * 0.8 
                    ? 'text-yellow-600' 
                    : 'text-green-600'
                }`}>
                  {subscription.webhooksInLastMinute || 0}/{subscription.maxWebhooksPerMinute} min
                </div>
                <div className={`text-sm ${
                  (subscription.webhooksInLastHour || 0) >= subscription.maxWebhooksPerHour 
                    ? 'text-red-600' 
                    : (subscription.webhooksInLastHour || 0) >= subscription.maxWebhooksPerHour * 0.8 
                    ? 'text-yellow-600' 
                    : 'text-gray-600'
                }`}>
                  {subscription.webhooksInLastHour || 0}/{subscription.maxWebhooksPerHour} hour
                </div>
              </dd>
            </div>
          </div>
        </div>

        {/* Delivery Logs */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Delivery Logs</h2>
          </div>
          <div className="px-6 py-5">
            <DeliveryLogsTable 
              logs={logs} 
              showSubscriptionId={false}
              totalCount={totalLogs}
              currentPage={1}
              pageSize={100}
            />
          </div>
        </div>
      </main>

      {/* Edit Subscription Modal */}
      <EditSubscriptionModal
        isOpen={isEditModalOpen}
        subscription={subscription}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditSave}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Subscription"
        message={`Are you sure you want to delete "${subscription.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};

export default SubscriptionDetail;
