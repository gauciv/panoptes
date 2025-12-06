import React, { useEffect, useState } from 'react';
import { getSubscriptions, getLogs, createSubscription, triggerTestEvent } from '../services/api';
import { WebhookSubscription, DeliveryLog } from '../types';
import StatCard from '../components/StatCard';
import SubscriptionTable from '../components/SubscriptionTable';
import LogViewer from '../components/LogViewer';

const Dashboard: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);

  const fetchSubscriptions = async () => {
    try {
      const subsData = await getSubscriptions();
      setSubscriptions(subsData);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    }
  };

  const fetchLogs = async () => {
    try {
      const logsData = await getLogs();
      setLogs(logsData);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchLogs();

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
    } catch (error) {
      console.error("Error triggering test:", error);
    }
  };

  const handleCreate = async () => {
    const name = prompt("Enter subscription name:");
    if (!name) return;
    const url = prompt("Enter target URL:");
    if (!url) return;
    const secret = prompt("Enter secret key:");
    if (!secret) return;

    try {
      await createSubscription({
        name,
        targetUrl: url,
        secretKey: secret,
        eventType: "transaction",
        isActive: true,
        targetAddress: null,
        policyId: null
      });
      fetchSubscriptions();
    } catch (error) {
      console.error("Error creating subscription:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Panoptes Mission Control</h1>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          <StatCard 
            title="Active Hooks" 
            value={subscriptions.filter(s => s.isActive).length}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
          />
          <StatCard 
            title="Total Events" 
            value={logs.length}
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
                onClick={handleCreate}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                New Subscription
              </button>
            </div>
            <SubscriptionTable subscriptions={subscriptions} onTest={handleTest} />
          </div>

          {/* Right Column: Logs (1/3 width) */}
          <div className="lg:col-span-1 h-[600px]">
            <LogViewer logs={logs} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
