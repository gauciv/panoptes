import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSubscription, getSubscriptionLogs, updateSubscription, deleteSubscription, triggerTestEvent, toggleSubscriptionActive, resetSubscription } from '../services/api';
import { WebhookSubscription, DeliveryLog } from '../types';
import DeliveryLogsTable from '../components/DeliveryLogsTable';
import EditSubscriptionModal from '../components/EditSubscriptionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SubscriptionDetailSkeleton from '../components/SubscriptionDetailSkeleton';
import Pagination from '../components/Pagination';

const SubscriptionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [subscription, setSubscription] = useState<WebhookSubscription | null>(null);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchSubscription = async () => {
    if (!id) return;
    console.log('[SubscriptionDetail] Fetching subscription with id:', id);
    try {
      const data = await getSubscription(id);
      console.log('[SubscriptionDetail] Subscription data:', data);
      console.log('[SubscriptionDetail] TargetAddress:', data.targetAddress);
      console.log('[SubscriptionDetail] PolicyId:', data.policyId);
      console.log('[SubscriptionDetail] TargetUrl:', data.targetUrl);
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
    console.log('[SubscriptionDetail] Fetching logs for subscription:', id, 'page:', currentPage);
    try {
      const skip = (currentPage - 1) * itemsPerPage;
      const logsData = await getSubscriptionLogs(id, skip, itemsPerPage);
      console.log('[SubscriptionDetail] Logs data:', logsData);
      
      // Backend now consistently returns { logs, totalCount }
      setLogs(logsData.logs || []);
      setTotalLogs(logsData.totalCount || 0);
      setError(null);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
      const errorMsg = error.response?.data || error.message || "Failed to fetch delivery logs.";
      setError(`API Error: ${errorMsg}`);
      // Keep logs as empty array on error
      setLogs([]);
      setTotalLogs(0);
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
  }, [id, currentPage]); // Refetch when page changes

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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

  const handleToggleActive = async () => {
    if (!id) return;
    try {
      await toggleSubscriptionActive(id);
      fetchSubscription();
      setError(null);
    } catch (error: any) {
      console.error("Error toggling subscription:", error);
      const errorMsg = error.response?.data || error.message || "Failed to toggle subscription.";
      setError(`Toggle Failed: ${errorMsg}`);
    }
  };

  const handleReset = async () => {
    if (!id) return;
    try {
      await resetSubscription(id);
      fetchSubscription();
      setError(null);
    } catch (error: any) {
      console.error("Error resetting subscription:", error);
      const errorMsg = error.response?.data || error.message || "Failed to reset subscription.";
      setError(`Reset Failed: ${errorMsg}`);
    }
  };

  const calculateSuccessRate = () => {
    if (!logs || logs.length === 0) return 0;
    // Exclude 429 (rate limit) from both success and failure counts - they're retriable
    const relevantLogs = logs.filter(l => l.responseStatusCode !== 429);
    if (relevantLogs.length === 0) return 0;
    const successCount = relevantLogs.filter(l => l.responseStatusCode >= 200 && l.responseStatusCode < 300).length;
    return Math.round((successCount / relevantLogs.length) * 100);
  };

  const calculateAvgLatency = () => {
    if (!logs || logs.length === 0) return 0;
    const totalLatency = logs.reduce((sum, log) => sum + log.latencyMs, 0);
    return Math.round(totalLatency / logs.length);
  };

  if (loading) {
    return <SubscriptionDetailSkeleton />;
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
              {/* Toggle Active/Paused Button */}
              {(() => {
                const isDisabled = subscription.isRateLimited || subscription.isCircuitBroken;
                if (isDisabled) {
                  return (
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 flex items-center gap-2"
                      title="Click to reset - clears rate limit and circuit breaker"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                      </svg>
                      Disabled - Click to Reset
                    </button>
                  );
                }
                return subscription.isActive ? (
                  <button
                    onClick={handleToggleActive}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-md text-sm font-medium hover:bg-green-200 flex items-center gap-2"
                    title="Click to pause - webhooks will stop, events will be queued"
                  >
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Active
                  </button>
                ) : (
                  <button
                    onClick={handleToggleActive}
                    className="px-4 py-2 bg-amber-100 text-amber-700 rounded-md text-sm font-medium hover:bg-amber-200 flex items-center gap-2"
                    title="Click to resume - queued events will be delivered"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Paused
                  </button>
                );
              })()}
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
                <dd className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                  {(() => {
                    const isDisabled = subscription.isRateLimited || subscription.isCircuitBroken;
                    if (isDisabled) {
                      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">🚫 Disabled</span>;
                    }
                    return subscription.isActive ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">⏸️ Paused</span>
                    );
                  })()}
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
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Wallet Address Filter</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {subscription.walletAddresses && subscription.walletAddresses.length > 0 ? (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500 mb-1">
                        Listening to {subscription.walletAddresses.length} address(es)
                      </div>
                      <div className="max-h-32 overflow-y-auto bg-gray-50 rounded p-2">
                        {subscription.walletAddresses.map((addr, idx) => (
                          <div key={idx} className="font-mono text-xs text-gray-700 break-all">
                            {addr}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-500 italic">All addresses (no filter)</span>
                  )}
                </dd>
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

        {/* Paused Banner */}
        {subscription.isPaused && (
          <div className="mb-6 bg-amber-50 border border-amber-300 rounded-md p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <svg className="h-6 w-6 text-amber-600 mr-3 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                </svg>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-amber-900">⏸️ Subscription Paused - Webhook Deliveries Halted</span>
                  <p className="text-sm text-amber-800 mt-2">
                    This subscription is currently paused. Events are still being recorded, but webhooks are not being sent to your endpoint.
                    When you resume this subscription, all pending events will be delivered.
                  </p>
                  {subscription.pausedAt && (
                    <p className="text-xs text-amber-700 mt-2">
                      <strong>Paused since:</strong> {new Date(subscription.pausedAt).toLocaleString()}
                    </p>
                  )}
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

        {/* Circuit Breaker Banner */}
        {subscription.isCircuitBroken && (
          <div className="mb-6 bg-orange-50 border border-orange-300 rounded-md p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <svg className="h-6 w-6 text-orange-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-orange-900">⚡ Circuit Breaker Triggered - Subscription Disabled</span>
                  <p className="text-sm text-orange-800 mt-2">
                    {subscription.circuitBrokenReason || "Your webhook endpoint has failed too many times and has been automatically disabled to prevent further issues."}
                  </p>
                  <p className="text-xs text-orange-700 mt-2">
                    <strong>Consecutive failures:</strong> {subscription.consecutiveFailures || 0}
                    {subscription.lastFailureAt && (
                      <> • <strong>Last failure:</strong> {new Date(subscription.lastFailureAt).toLocaleString()}</>
                    )}
                  </p>
                  <div className="mt-3 text-xs text-orange-700">
                    <strong>What to do:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Check your webhook endpoint is running and accessible</li>
                      <li>Verify your server can handle the request volume</li>
                      <li>Check for rate limiting on your endpoint</li>
                      <li>Once fixed, click "Resume Subscription" below to re-enable</li>
                    </ul>
                  </div>
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await fetch(`http://localhost:5186/subscriptions/${id}/resume`, { method: 'POST' });
                    await fetchSubscription();
                    setError(null);
                  } catch (err: any) {
                    setError(`Failed to resume: ${err.message}`);
                  }
                }}
                className="ml-4 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 whitespace-nowrap"
              >
                Resume Subscription
              </button>
            </div>
          </div>
        )}

        {/* Sync Status Banner */}
        {subscription.isSyncing && !subscription.isCircuitBroken && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 text-yellow-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div>
                <span className="text-sm font-medium text-yellow-800">Syncing with Blockchain</span>
                <p className="text-xs text-yellow-700 mt-1">
                  This subscription is still catching up to the latest block. Webhooks will start arriving once sync is complete. This usually takes a few seconds after creating a new subscription.
                </p>
              </div>
            </div>
          </div>
        )}

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
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalLogs}</dd>
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
              logs={logs || []} 
              showSubscriptionId={false}
              totalCount={totalLogs}
              currentPage={currentPage}
              pageSize={itemsPerPage}
            />
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={totalLogs}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
          />
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
