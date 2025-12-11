import React, { useEffect, useState } from 'react';
import RetryTimeline, { RetryAttempt } from './RetryTimeline';
// Make sure to add these functions to your API service
import { getRetryAttempts, triggerManualRetry } from '../services/api.ts'; 

interface RetryHistoryProps {
  logId: string;
}

const RetryHistory: React.FC<RetryHistoryProps> = ({ logId }) => {
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<RetryAttempt[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!logId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getRetryAttempts(logId);
      setAttempts(data || []);
    } catch (err: any) {
      console.error("Failed to fetch retry history:", err);
      setError("Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [logId]);

  const handleManualRetry = async () => {
    if (!logId) return;

    setIsRetrying(true);
    try {
      await triggerManualRetry(logId);
      // Refresh history after a successful retry trigger
      // You might want a small delay here if the backend is async
      setTimeout(fetchHistory, 1000); 
    } catch (err: any) {
      console.error("Manual retry failed:", err);
      alert("Failed to trigger retry.");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Retry History
        </h4>
        <button
            onClick={handleManualRetry}
            disabled={isRetrying}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
            {isRetrying ? (
                <>
                 <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 Retrying...
                </>
            ) : (
                <>
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                 Retry Now
                </>
            )}
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-500 mb-4 ml-4">
            {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4 ml-4 pl-4 border-l-2 border-gray-100 dark:border-gray-800">
            {[1, 2].map(i => (
                <div key={i} className="h-16 bg-gray-50 dark:bg-gray-800 rounded animate-pulse w-full max-w-md"></div>
            ))}
        </div>
      ) : attempts.length === 0 ? (
          <div className="ml-4 text-xs text-gray-400 italic">No retry attempts recorded.</div>
      ) : (
        <RetryTimeline attempts={attempts} />
      )}
    </div>
  );
};

export default RetryHistory;