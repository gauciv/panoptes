import React, { useState } from 'react';
import { DeliveryLog, WebhookSubscription } from '../types';

interface LogViewerProps {
    logs: DeliveryLog[];
    subscriptions?: WebhookSubscription[];
}

const LogViewer: React.FC<LogViewerProps> = ({ logs, subscriptions = [] }) => {
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedLogId(expandedLogId === id ? null : id);
    };

    const getSubscriptionName = (subscriptionId: string) => {
        const sub = subscriptions.find(s => s.id === subscriptionId);
        return sub?.name || `ID: ${subscriptionId.substring(0, 8)}...`;
    };

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col h-full">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Delivery Logs</h3>
            </div>
            <div className="overflow-y-auto flex-1 p-0 max-h-[600px]">
                <ul className="divide-y divide-gray-200">
                    {logs.map((log) => {
                        const isSuccess = log.responseStatusCode >= 200 && log.responseStatusCode < 300;
                        const isExpanded = expandedLogId === log.id;

                        return (
                            <li key={log.id} className="hover:bg-gray-50 transition-colors">
                                <div 
                                    className="px-6 py-4 cursor-pointer"
                                    onClick={() => toggleExpand(log.id)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-3">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                                {log.responseStatusCode}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                {new Date(log.attemptedAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {log.latencyMs.toFixed(0)}ms
                                        </div>
                                    </div>
                                    {subscriptions.length > 0 && (
                                        <div className="text-xs text-gray-600 pl-1">
                                            📌 {getSubscriptionName(log.subscriptionId)}
                                        </div>
                                    )}
                                </div>
                                {isExpanded && (
                                    <div className="px-6 pb-4 bg-gray-50 border-t border-gray-100">
                                        <div className="mt-2">
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Payload</p>
                                            <pre className="bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                                                {(() => {
                                                    try {
                                                        return JSON.stringify(JSON.parse(log.payloadJson || '{}'), null, 2);
                                                    } catch {
                                                        return log.payloadJson;
                                                    }
                                                })()}
                                            </pre>
                                        </div>
                                        <div className="mt-2">
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Response</p>
                                            <pre className="bg-gray-100 text-gray-700 p-3 rounded text-xs overflow-x-auto border border-gray-200">
                                                {log.responseBody}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};

export default LogViewer;
