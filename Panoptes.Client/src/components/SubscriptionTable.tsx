import React from 'react';
import { WebhookSubscription } from '../types';
import SubscriptionTableSkeleton from './SubscriptionTableSkeleton';

interface SubscriptionTableProps {
    subscriptions: WebhookSubscription[];
    onTest: (id: string) => void;
    onEdit: (subscription: WebhookSubscription) => void;
    onDelete: (subscription: WebhookSubscription) => void;
    hasActiveFilters?: boolean;
    isLoading?: boolean;
}

const SubscriptionTable: React.FC<SubscriptionTableProps> = ({ subscriptions, onTest, onEdit, onDelete, hasActiveFilters = false, isLoading = false }) => {
    if (isLoading) {
        return <SubscriptionTableSkeleton />;
    }

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-[200px]">Target URL</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Type</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate Limit</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {subscriptions.map((sub) => (
                            <tr key={sub.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/subscriptions/${sub.id}`}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 max-w-[120px] truncate" title={sub.name}>{sub.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px]">
                                    <span className="block truncate" title={sub.targetUrl}>{sub.targetUrl}</span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                        {sub.eventType}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                    <div className="flex flex-col gap-1">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            sub.isActive 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {sub.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                        {sub.isCircuitBroken && (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800" title={sub.circuitBrokenReason || "Circuit breaker triggered"}>
                                                ⚡ Circuit Broken
                                            </span>
                                        )}
                                        {sub.isSyncing && !sub.isCircuitBroken && (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 animate-pulse" title="Syncing with blockchain">
                                                🔄 Syncing
                                            </span>
                                        )}
                                        {sub.isRateLimited && !sub.isCircuitBroken && (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800" title="Rate limit exceeded">
                                                🚫 Limited
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600">Min:</span>
                                            <span className={`font-mono ${
                                                (sub.webhooksInLastMinute || 0) >= sub.maxWebhooksPerMinute 
                                                    ? 'text-red-600 font-bold' 
                                                    : (sub.webhooksInLastMinute || 0) >= sub.maxWebhooksPerMinute * 0.8 
                                                    ? 'text-yellow-600' 
                                                    : 'text-green-600'
                                            }`}>
                                                {sub.webhooksInLastMinute || 0}/{sub.maxWebhooksPerMinute}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600">Hour:</span>
                                            <span className={`font-mono ${
                                                (sub.webhooksInLastHour || 0) >= sub.maxWebhooksPerHour 
                                                    ? 'text-red-600 font-bold' 
                                                    : (sub.webhooksInLastHour || 0) >= sub.maxWebhooksPerHour * 0.8 
                                                    ? 'text-yellow-600' 
                                                    : 'text-green-600'
                                            }`}>
                                                {sub.webhooksInLastHour || 0}/{sub.maxWebhooksPerHour}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => onTest(sub.id)}
                                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-2 py-1 rounded text-xs transition-colors"
                                            title="Send test webhook"
                                        >
                                            Test
                                        </button>
                                        <button
                                            onClick={() => onEdit(sub)}
                                            className="text-amber-600 hover:text-amber-900 bg-amber-50 px-2 py-1 rounded text-xs transition-colors"
                                            title="Edit subscription"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => onDelete(sub)}
                                            className="text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded text-xs transition-colors"
                                            title="Delete subscription"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {subscriptions.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    {hasActiveFilters ? (
                        <>
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p className="mt-2">No subscriptions match your filters.</p>
                            <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters.</p>
                        </>
                    ) : (
                        <>
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <p className="mt-2">No subscriptions yet. Create one to get started!</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default SubscriptionTable;
