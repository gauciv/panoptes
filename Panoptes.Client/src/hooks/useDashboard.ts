import { useState, useEffect, useCallback } from 'react';
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
import toast from 'react-hot-toast';

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

const LOGS_PER_PAGE = 10;

export function useDashboard() {
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isConnected, setIsConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logPage, setLogPage] = useState(0);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const data = await getSubscriptions();
      setSubscriptions(data);
      setError(null);
      setIsConnected(true);
    } catch (err: any) {
      const msg = err.response?.data || err.message || 'Failed to fetch subscriptions.';
      setError(`API Error: ${msg}`);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await getLogs(logPage * LOGS_PER_PAGE, LOGS_PER_PAGE);
      setLogs(data.logs);
      setTotalLogs(data.totalCount);
      setError(null);
      setIsConnected(true);
    } catch (err: any) {
      const msg = err.response?.data || err.message || 'Failed to fetch logs.';
      setError(`API Error: ${msg}`);
      setIsConnected(false);
    }
  }, [logPage]);

  const fetchSystemInfo = useCallback(async () => {
    try {
      const response = await fetch('/health/system-info');
      const data = await response.json();
      setSystemInfo(data);
    } catch (err) {
      console.error('Error fetching system info:', err);
    }
  }, []);

  const fetchSetupStatus = useCallback(async () => {
    try {
      const response = await fetch('/setup/status');
      const data = await response.json();
      setSetupStatus(data);
    } catch (err) {
      console.error('Error fetching setup status:', err);
    }
  }, []);

  useEffect(() => {
    fetchSetupStatus();
    fetchSubscriptions();
    fetchLogs();
    fetchSystemInfo();

    const logInterval = setInterval(fetchLogs, 3000);
    const subInterval = setInterval(fetchSubscriptions, 10000);

    return () => {
      clearInterval(logInterval);
      clearInterval(subInterval);
    };
  }, [fetchLogs, fetchSubscriptions, fetchSystemInfo, fetchSetupStatus]);

  const handleTest = async (id: string) => {
    try {
      await triggerTestEvent(id);
      fetchLogs();
      setError(null);
      toast.success('Test event triggered successfully!');
    } catch (err: any) {
      const msg = err.response?.data || err.message || 'Failed to trigger test.';
      toast.error(`Test Failed: ${msg}`);
    }
  };

  const handleCreate = async (data: {
    name: string;
    targetUrl: string;
    eventType: string;
    walletAddresses?: string[];
    customHeaders?: Record<string, string>;
  }) => {
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
        walletAddresses: data.walletAddresses || null,
        customHeaders: data.customHeaders ? JSON.stringify(data.customHeaders) : undefined,
      });
      fetchSubscriptions();
      setError(null);
      toast.success('Subscription created successfully!');
      return true;
    } catch (err: any) {
      const msg = err.response?.data || err.message || 'Failed to create subscription.';
      toast.error(msg);
      return false;
    }
  };

  const handleUpdate = async (id: string, data: Partial<WebhookSubscription>) => {
    try {
      await updateSubscription(id, data);
      fetchSubscriptions();
      setError(null);
      toast.success('Subscription updated successfully!');
      return true;
    } catch (err: any) {
      const msg = err.response?.data || err.message || 'Failed to update subscription.';
      toast.error(msg);
      return false;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSubscription(id);
      fetchSubscriptions();
      setError(null);
      toast.success('Subscription deleted.');
      return true;
    } catch (err: any) {
      const msg = err.response?.data || err.message || 'Failed to delete subscription.';
      toast.error(msg);
      return false;
    }
  };

  const handleToggleActive = async (id: string): Promise<void> => {
    try {
      await toggleSubscriptionActive(id);
      fetchSubscriptions();
      setError(null);
    } catch (err: any) {
      const msg = err.response?.data || err.message || 'Failed to toggle subscription.';
      setError(`Toggle Failed: ${msg}`);
    }
  };

  const handleReset = async (id: string): Promise<void> => {
    try {
      await resetSubscription(id);
      fetchSubscriptions();
      setError(null);
    } catch (err: any) {
      const msg = err.response?.data || err.message || 'Failed to reset subscription.';
      setError(`Reset Failed: ${msg}`);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage * LOGS_PER_PAGE < totalLogs) {
      setLogPage(newPage);
    }
  };

  const refreshAll = () => {
    fetchSetupStatus();
    fetchSystemInfo();
    fetchSubscriptions();
    window.dispatchEvent(new Event('network_config_updated'));
  };

  return {
    subscriptions,
    logs,
    totalLogs,
    isConnected,
    loading,
    error,
    logPage,
    logsPerPage: LOGS_PER_PAGE,
    systemInfo,
    setupStatus,
    handleTest,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleToggleActive,
    handleReset,
    handlePageChange,
    refreshAll,
  };
}
