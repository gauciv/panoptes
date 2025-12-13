import React from 'react';
import { SubscriptionCard } from './SubscriptionCard';
import { WebhookSubscription } from '../types'; 

interface SubscriptionGridProps {
  subscriptions: WebhookSubscription[];
  loading?: boolean;
  onSelectSubscription: (sub: WebhookSubscription) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onToggleActive: (id: string) => Promise<void>;
  onReset?: (id: string) => Promise<void>;
}

export const SubscriptionGrid: React.FC<SubscriptionGridProps> = ({ 
  subscriptions, 
  loading,
  onSelectSubscription,
  onEdit, 
  onDelete, 
  onTest,
  onToggleActive,
  onReset
}) => {
  
  // --- LOADING STATE ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
         <svg className="animate-spin h-8 w-8 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
         </svg>
         <div className="text-gray-500 font-medium">Loading subscriptions...</div>
      </div>
    );
  }

  // --- EMPTY STATE ---
  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-white/5">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No subscriptions yet</h3>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">
          Create your first webhook subscription to start monitoring events.
        </p>
      </div>
    );
  }

  // --- LIST STATE ---
  return (
    // ADDED: border, subtle background tint, rounded corners, and shadow
    <div className="grid grid-cols-1 gap-3 p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm">
      {subscriptions.map((sub) => (
        <SubscriptionCard 
          key={sub.id} 
          subscription={sub}
          onSelect={() => onSelectSubscription(sub)}
          onEdit={onEdit}
          onDelete={onDelete}
          onTest={onTest}
          onToggleActive={onToggleActive}
          onReset={onReset}
        />
      ))}
    </div>
  );
};

export default SubscriptionGrid;