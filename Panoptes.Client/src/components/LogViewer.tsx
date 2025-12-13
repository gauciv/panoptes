import React, { useState } from 'react';
import { DeliveryLog, WebhookSubscription } from '../types';
import { Clock, CheckCircle, Terminal, RefreshCw, XCircle } from 'lucide-react';

interface LogViewerProps {
    logs: DeliveryLog[];
    subscriptions?: WebhookSubscription[];
}

const LogViewer: React.FC<LogViewerProps> = ({ logs, subscriptions }) => {
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const safeLogs = logs || [];
    const safeSubscriptions = subscriptions || [];

    const toggleExpand = (id: string) => {
        setExpandedLogId(expandedLogId === id ? null : id);
    };

    const getSubscriptionName = (subscriptionId: string) => {
        const sub = safeSubscriptions.find(s => s.id === subscriptionId);
        return sub?.name || `ID: ${subscriptionId.substring(0, 8)}...`;
    };

    // Helper for Status UI
    const getStatusConfig = (statusCode: number) => {
        if (statusCode >= 200 && statusCode < 300) {
            return {
                icon: CheckCircle,
                color: 'text-green-500',
                bg: 'bg-green-500/10',
                border: 'border-green-500/20',
                label: 'Success'
            };
        }
        if (statusCode === 429) {
            return {
                icon: RefreshCw,
                color: 'text-yellow-500',
                bg: 'bg-yellow-500/10',
                border: 'border-yellow-500/20',
                label: 'Throttled'
            };
        }
        return {
            icon: XCircle,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
            label: 'Failed'
        };
    };

    const formatJson = (jsonString: string) => {
        try {
            return JSON.stringify(JSON.parse(jsonString || '{}'), null, 2);
        } catch {
            return jsonString || '{}';
        }
    };

    if (safeLogs.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 space-y-3 py-10">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <Terminal className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium">Waiting for events...</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {safeLogs.map((log) => {
                const status = getStatusConfig(log.responseStatusCode);
                const isExpanded = expandedLogId === log.id;
                const subName = getSubscriptionName(log.subscriptionId);

                return (
                    <div 
                        key={log.id} 
                        className={`
                            group relative rounded-lg border transition-all duration-200 overflow-hidden
                            ${isExpanded 
                                ? 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 shadow-md scale-[1.01]' 
                                : 'bg-white dark:bg-black border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 cursor-pointer'}
                        `}
                        onClick={() => toggleExpand(log.id)}
                    >
                        {/* Status Stripe (Left Border) */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${status.bg.replace('/10', '')}`} />

                        {/* Main Card Content */}
                        <div className="pl-4 pr-4 py-3">
                            <div className="flex items-center justify-between mb-1.5">
                                {/* Status Badge */}
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.color} border ${status.border}`}>
                                    <status.icon className="w-3 h-3" />
                                    <span>{log.responseStatusCode}</span>
                                </div>
                                
                                {/* Timestamp */}
                                <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                    <Clock className="w-3 h-3" />
                                    {new Date(log.attemptedAt).toLocaleTimeString()}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                {/* Subscription Name */}
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[140px]" title={subName}>
                                        {subName}
                                    </span>
                                </div>

                                {/* Latency */}
                                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                                    {log.latencyMs.toFixed(0)}ms
                                </span>
                            </div>
                        </div>

                        {/* Expanded Details Panel */}
                        {isExpanded && (
                            <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 animate-in slide-in-from-top-1">
                                <div className="grid gap-3">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payload</span>
                                            <button 
                                                className="text-[10px] text-indigo-500 hover:text-indigo-400"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(formatJson(log.payloadJson));
                                                    // Simple toast or feedback could go here
                                                }}
                                            >
                                                Copy
                                            </button>
                                        </div>
                                        <div className="relative group/code">
                                            <pre className="text-[10px] font-mono bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded p-2 overflow-x-auto text-gray-600 dark:text-gray-400 max-h-32 custom-scrollbar">
                                                {formatJson(log.payloadJson)}
                                            </pre>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Response</span>
                                        <div className="text-[10px] font-mono bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded p-2 text-gray-600 dark:text-gray-400 break-all">
                                            {log.responseBody || '(No content)'}
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-1">
                                        <span className="text-[10px] text-gray-400 font-mono">
                                            ID: {log.id.split('-')[0]}...
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default LogViewer;