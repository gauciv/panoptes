import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

interface SetupStatus {
  isConfigured: boolean;
  activeNetwork?: string;
  activeEndpoint?: string;
  configuredNetworks: string[];
}

export function useNetworkConfig() {
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/setup/status?_t=${Date.now()}`);
      const data = await response.json();
      setSetupStatus(data);
    } catch (err) {
      toast.error('Failed to load system status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const switchNetwork = async (targetNetwork: string) => {
    if (isSwitching) return false;

    setIsSwitching(targetNetwork);
    const toastId = toast.loading(`Switching to ${targetNetwork}...`);

    try {
      const response = await fetch('/setup/switch-network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network: targetNetwork }),
      });

      if (!response.ok) throw new Error('Switch failed');

      toast.success(`Active Network: ${targetNetwork}`, { id: toastId });
      localStorage.setItem('panoptes-network', targetNetwork);
      window.dispatchEvent(new Event('network_config_updated'));
      fetchStatus();
      return true;
    } catch (e) {
      toast.error('Failed to switch network', { id: toastId });
      return false;
    } finally {
      setIsSwitching(null);
    }
  };

  const clearCredentials = async () => {
    try {
      await fetch('/setup/clear-credentials', { method: 'DELETE' });
      window.dispatchEvent(new Event('network_config_updated'));
      toast.success('System reset successful');
      fetchStatus();
      return true;
    } catch (err) {
      toast.error('Reset failed');
      return false;
    }
  };

  const notifyConfigUpdate = () => {
    window.dispatchEvent(new Event('network_config_updated'));
    fetchStatus();
  };

  return {
    setupStatus,
    isLoading,
    isSwitching,
    switchNetwork,
    clearCredentials,
    notifyConfigUpdate,
    refetch: fetchStatus,
  };
}
