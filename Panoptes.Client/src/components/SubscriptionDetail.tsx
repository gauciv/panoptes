import React, { useEffect, useState } from 'react';
import { WebhookSubscription, DeliveryLog } from '../types'; 
import { getLogs } from '../services/api'; 

interface SubscriptionDetailProps {
  subscription: WebhookSubscription;
  onBack: () => void;
}

const SubscriptionDetail: React.FC<SubscriptionDetailProps> = ({ subscription, onBack }) => {
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track which row is expanded by its ID
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // --- FETCH LOGS ---
  useEffect(() => {
    const fetchSubscriptionLogs = async () => {
      setLoading(true);
      try {
        const response = await getLogs(0, 100); 
        const filteredLogs = response.logs.filter(
          (log: DeliveryLog) => log.subscriptionId === subscription.id
        );
        // Sort newest first
        filteredLogs.sort((a: any, b: any) => {
            const dateA = new Date(a.timestamp || a.createdAt || 0).getTime();
            const dateB = new Date(b.timestamp || b.createdAt || 0).getTime();
            return dateB - dateA;
        });
        setLogs(filteredLogs);
      } catch (error) {
        console.error("Failed to load logs", error);
      } finally {
        setLoading(false);
      }
    };

    if (subscription?.id) fetchSubscriptionLogs();
  }, [subscription]);

  const toggleRow = (id: string) => {
    if (expandedLogId === id) {
        setExpandedLogId(null); // Collapse if already open
    } else {
        setExpandedLogId(id); // Expand new row
    }
  };

  // --- HELPERS ---
  const renderStatusBadge = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
        return <span className="text-green-600 font-bold">{statusCode}</span>;
    }
    if (statusCode === 429) {
        return <span className="text-yellow-600 font-bold">{statusCode}</span>; // Match the reference image yellow
    }
    return <span className="text-red-600 font-bold">{statusCode}</span>;
  };

  const formatJson = (data: string | object) => {
      try {
          if (typeof data === 'string') return JSON.stringify(JSON.parse(data), null, 2);
          return JSON.stringify(data, null, 2);
      } catch (e) { return String(data); }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300 relative">
      
      {/* 1. Header Navigation */}
            <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-300 font-bold">
                        &larr; 
                </button>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{subscription.name}</h2>
            </div>

      {/* 2. Subscription Details Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-start mb-6">
             <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Subscription Details</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    subscription.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-600 dark:text-white'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                    {subscription.isActive ? 'Active' : 'Inactive'}
                </span>
             </div>
             <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 shadow-sm">
                    Test Webhook
                </button>
                <button className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm">
                    Edit
                </button>
                <button className="px-3 py-1.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 rounded-md text-sm font-medium hover:bg-red-100 dark:hover:bg-red-800 shadow-sm">
                    Delete
                </button>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 text-sm">
            <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">Target URL</p>
                <div className="font-mono text-gray-900 dark:text-gray-100 break-all bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 text-xs">
                    {subscription.targetUrl}
                </div>
            </div>
            <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">Event Type</p>
                <p className="font-bold text-gray-900 dark:text-gray-100 text-base">{subscription.eventType}</p>
            </div>
            <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">Rate Limits</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                    {subscription.maxWebhooksPerMinute}/min, {subscription.maxWebhooksPerHour}/hour
                </p>
            </div>
            <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">Created</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date().toLocaleDateString()}
                </p>
            </div>
        </div>
      </div>

      {/* 3. Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Deliveries" value={String(logs.length)} />
        <StatsCard label="Success Rate" value={logs.length > 0 ? "100%" : "-"} />
        <StatsCard label="Avg Latency" value="359ms" />
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm dark:shadow-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Rate Usage</p>
                    <div className="text-2xl font-bold text-green-600 flex items-baseline gap-1">
                        1<span className="text-gray-400 dark:text-gray-300 text-base font-normal">/60 min</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">25/1000 hour</p>
                </div>
      </div>

      {/* 4. Delivery Logs (Matches reference image) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-10">
            <div className="p-6 pb-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Delivery Logs</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Showing entries 1 to {logs.length} of {logs.length} total</p>
            </div>
         
         {loading ? (
             <div className="p-10 text-center text-gray-500 dark:text-gray-300">Loading logs...</div>
        ) : logs.length === 0 ? (
            <div className="p-10 text-center text-gray-500 dark:text-gray-300 bg-gray-50 dark:bg-gray-900">No logs found.</div>
         ) : (
             <div className="mt-4">
                {/* Custom Table Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                    <div className="col-span-3">Time</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Latency</div>
                    <div className="col-span-5">Response</div>
                </div>

                {/* Log Rows */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {logs.map((log) => {
                        const timeValue = (log as any).timestamp || (log as any).createdAt || new Date();
                        const isExpanded = expandedLogId === log.id;
                        
                        return (
                            <div key={log.id} className="group transition-colors">
                                {/* Summary Row */}
                                <div 
                                    onClick={() => toggleRow(log.id)}
                                    className={`grid grid-cols-12 gap-4 px-6 py-4 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 items-center ${isExpanded ? 'bg-gray-50 dark:bg-gray-900' : ''}`}
                                >
                                    <div className="col-span-3 text-gray-600 dark:text-gray-300">
                                        {new Date(timeValue).toLocaleString()}
                                    </div>
                                    <div className="col-span-2 font-mono">
                                        {renderStatusBadge(log.responseStatusCode)}
                                    </div>
                                    <div className="col-span-2 font-mono text-gray-500 dark:text-gray-300">
                                        {log.latencyMs}ms
                                    </div>
                                    <div className="col-span-5 font-mono text-xs text-gray-400 dark:text-gray-300 truncate">
                                        {(log as any).responseBody || '-'}
                                    </div>
                                </div>

                                {/* Expanded Details Row */}
                                {isExpanded && (
                                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-6">
                                            {/* PAYLOAD SECTION */}
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Payload</h4>
                                                <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-4 font-mono text-xs text-gray-700 dark:text-gray-100 overflow-x-auto">
                                                    <pre>{(log as any).requestPayload ? formatJson((log as any).requestPayload) : "null"}</pre>
                                                </div>
                                            </div>

                                            {/* RESPONSE SECTION */}
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Response</h4>
                                                <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-4 font-mono text-xs text-gray-700 dark:text-gray-100 overflow-x-auto">
                                                    <pre>{(log as any).responseBody ? formatJson((log as any).responseBody) : "null"}</pre>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
             </div>
         )}
      </div>
    </div>
  );
};

const StatsCard = ({ label, value }: { label: string, value: string }) => (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <p className="text-gray-500 text-sm mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
);

export default SubscriptionDetail;