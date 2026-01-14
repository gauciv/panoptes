import { useState, useEffect, useCallback } from 'react';
import {
  getSubscription,
  getSubscriptionLogs,
  updateSubscription,
  deleteSubscription,
  toggleSubscriptionActive
} from '../services/api';
import { WebhookSubscription, DeliveryLog } from '../types';
import { convertToCSV, downloadFile, generateFilename } from '../utils/exportUtils';

interface UseSubscriptionDetailOptions {
  subscriptionId?: string;
  initialSubscription?: WebhookSubscription | null;
  onDeleted?: () => void;
}

export function useSubscriptionDetail({
  subscriptionId,
  initialSubscription,
  onDeleted
}: UseSubscriptionDetailOptions) {
  const activeId = initialSubscription?.id || subscriptionId;

  const [subscription, setSubscription] = useState<WebhookSubscription | null>(initialSubscription || null);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [loading, setLoading] = useState(!initialSubscription);
  const [error, setError] = useState<string | null>(null);

  const [deliverLatestOnly, setDeliverLatestOnly] = useState(() => {
    if (activeId) {
      const stored = localStorage.getItem(`deliverLatestOnly_${activeId}`);
      return stored === 'true';
    }
    return false;
  });

  const fetchSubscription = useCallback(async (forceRefresh = false) => {
    if (initialSubscription && !forceRefresh) {
      setSubscription(initialSubscription);
      return;
    }
    if (!activeId) return;
    try {
      const data = await getSubscription(activeId);
      setSubscription(data);
      setError(null);
    } catch (err: any) {
      setError(`API Error: ${err.response?.data || err.message}`);
    }
  }, [activeId, initialSubscription]);

  const fetchLogs = useCallback(async () => {
    if (!activeId) return;
    try {
      const skip = (currentPage - 1) * itemsPerPage;
      const data = await getSubscriptionLogs(activeId, skip, itemsPerPage);
      setLogs(data.logs || []);
      setTotalLogs(data.totalCount || 0);
    } catch (err: any) {
      console.error('Error fetching logs:', err);
      setLogs([]);
    }
  }, [activeId, currentPage, itemsPerPage]);

  useEffect(() => {
    if (initialSubscription) {
      setSubscription(initialSubscription);
      setLoading(false);
    } else {
      setLoading(true);
      fetchSubscription().then(() => setLoading(false));
    }
  }, [activeId, initialSubscription, fetchSubscription]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  useEffect(() => {
    const interval = setInterval(() => fetchSubscription(true), 3000);
    return () => clearInterval(interval);
  }, [fetchSubscription]);

  const handleDeliverLatestOnlyChange = (value: boolean) => {
    setDeliverLatestOnly(value);
    if (activeId) localStorage.setItem(`deliverLatestOnly_${activeId}`, String(value));
  };

  const handleUpdate = async (data: Partial<WebhookSubscription>) => {
    if (!activeId) return false;
    try {
      await updateSubscription(activeId, data);
      if (!initialSubscription) await fetchSubscription();
      return true;
    } catch (err: any) {
      alert(`Update Failed: ${err.message}`);
      return false;
    }
  };

  const handleDelete = async () => {
    if (!activeId) return false;
    try {
      await deleteSubscription(activeId);
      onDeleted?.();
      return true;
    } catch (err: any) {
      alert(`Delete Failed: ${err.message}`);
      return false;
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

  const handleExportLogs = async (format: 'csv' | 'json') => {
    if (!activeId || !subscription) return;
    try {
      const data = await getSubscriptionLogs(activeId, 0, 1000);
      const logsToExport = data.logs || [];

      if (logsToExport.length === 0) {
        alert('No logs available to export.');
        return;
      }

      const filename = generateFilename(subscription.name, format);

      if (format === 'json') {
        downloadFile(JSON.stringify(logsToExport, null, 2), filename, 'application/json');
      } else {
        downloadFile(convertToCSV(logsToExport), filename, 'text/csv');
      }
    } catch (err) {
      alert('Failed to export logs.');
    }
  };

  const usageLastMinute = logs.filter(l => {
    const logTime = new Date(l.attemptedAt).getTime();
    return logTime > Date.now() - 60000;
  }).length;

  const calculateSuccessRate = () => {
    if (totalLogs === 0) return '-';
    const successCount = logs.filter(l => l.responseStatusCode >= 200 && l.responseStatusCode < 300).length;
    if (successCount === 0) return '0%';
    return Math.round((successCount / totalLogs) * 100) + '%';
  };

  const calculateAvgLatency = () => {
    if (totalLogs === 0) return '0ms';
    const totalLatency = logs.reduce((sum, log) => sum + log.latencyMs, 0);
    return Math.round(totalLatency / logs.length) + 'ms';
  };

  return {
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
    calculateAvgLatency,
  };
}
