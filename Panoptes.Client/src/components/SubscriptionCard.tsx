import React from 'react';
import { WebhookSubscription } from '../types';


interface SubscriptionCardProps {
  subscription: WebhookSubscription; // Now this refers to the imported type
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onSelect: () => void;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onEdit,
  onDelete,
  onTest,
  onSelect
}) => {

  // --- STATUS LOGIC ---
  let currentStatus = 'inactive';
  if (subscription.isRateLimited) {
    currentStatus = 'rate_limited';
  } else if (subscription.isActive) {
    currentStatus = 'active';
  }

  // --- DATA MAPPING ---
  const limits = {
    minute: subscription.webhooksInLastMinute || 0,
    minuteLimit: subscription.maxWebhooksPerMinute || 60,
    hour: subscription.webhooksInLastHour || 0,
    hourLimit: subscription.maxWebhooksPerHour || 1000
  };

  const formatPercentage = (current: number, max: number) => {
    if (max === 0) return '0%';
    const percent = Math.round((current / max) * 100);
    return `${percent}%`;
  };

  // --- STYLING HELPERS ---
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active':
        return {
          gradient: 'bg-gradient-to-r from-green-50 to-green-100 border-green-200',
          textColor: 'text-green-700',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-green-600 animate-pulse">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          )
        };
      case 'rate_limited':
        return {
          gradient: 'bg-gradient-to-r from-red-50 to-red-100 border-red-200',
          textColor: 'text-red-700',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-600">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )
        };
      default: // inactive
        return {
          gradient: 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200',
          textColor: 'text-gray-600',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-500">
              <circle cx="12" cy="12" r="10" /><line x1="10" y1="15" x2="10" y2="9" /><line x1="14" y1="15" x2="14" y2="9" />
            </svg>
          )
        };
    }
  };

  const getProgressColor = (current: number, max: number) => {
    if (max === 0) return 'bg-green-500';
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const styles = getStatusStyles(currentStatus);

  return (
    <div
      onClick={onSelect}
      className={`
        group relative rounded-xl border p-4
        transition-all duration-200 ease-in-out
        shadow-sm hover:scale-[1.005] hover:shadow-md cursor-pointer
        ${styles.gradient}
        grid grid-cols-12 gap-4 items-center
      `}
    >
      {/* --- COL 1: NAME, TYPE & URL --- */}
      <div className="col-span-12 md:col-span-4 flex flex-col min-w-0">
        <h3 className="font-bold text-gray-800 truncate text-base mb-1">{subscription.name}</h3>
        <div className="flex items-center gap-2">
          <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase border border-indigo-100 tracking-wide">
            {subscription.eventType}
          </span>
          <span className="text-xs text-gray-500 truncate font-mono opacity-80" title={subscription.targetUrl}>
            {subscription.targetUrl}
          </span>
        </div>
      </div>

      {/* --- COL 2: STATUS --- */}
      <div className="col-span-6 md:col-span-2 flex items-center">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/60 ${styles.textColor} border border-white/50 shadow-sm`}>
          {styles.icon}
          <span className="text-[10px] font-bold uppercase tracking-wider">{currentStatus.replace('_', ' ')}</span>
        </div>
      </div>

      {/* --- COL 3: USAGE --- */}
      <div className="col-span-6 md:col-span-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase text-gray-500 font-semibold w-8">Min</span>
          <div className="flex-1 h-1.5 bg-white/50 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getProgressColor(limits.minute, limits.minuteLimit)}`}
              style={{ width: `${Math.min(100, (limits.minute / limits.minuteLimit) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-600 font-mono w-8 text-right">{formatPercentage(limits.minute, limits.minuteLimit)}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase text-gray-500 font-semibold w-8">Hour</span>
          <div className="flex-1 h-1.5 bg-white/50 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getProgressColor(limits.hour, limits.hourLimit)}`}
              style={{ width: `${Math.min(100, (limits.hour / limits.hourLimit) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-600 font-mono w-8 text-right">{formatPercentage(limits.hour, limits.hourLimit)}</span>
        </div>
      </div>

      {/* --- COL 4: ACTIONS --- */}
      <div className="col-span-12 md:col-span-2 flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={(e) => { e.stopPropagation(); onTest(subscription.id); }}
          className="p-2 bg-white/80 hover:bg-white text-indigo-600 rounded-lg shadow-sm hover:shadow transition-colors"
          title="Test"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(subscription.id); }}
          className="p-2 bg-white/80 hover:bg-white text-gray-700 rounded-lg shadow-sm hover:shadow transition-colors"
          title="Edit"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(subscription.id); }}
          className="p-2 bg-white/80 hover:bg-red-50 text-red-500 rounded-lg shadow-sm hover:shadow transition-colors"
          title="Delete"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
        </button>
      </div>
    </div>
  );
};