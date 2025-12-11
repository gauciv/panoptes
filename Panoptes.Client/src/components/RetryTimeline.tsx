import React from 'react';

// Define a type for a single attempt history item
// You can move this to your main types file later
export interface RetryAttempt {
  id: string;
  attemptNumber: number;
  status: 'success' | 'failure' | 'pending';
  statusCode: number;
  timestamp: string;
  latencyMs: number;
  error?: string;
}

interface RetryTimelineProps {
  attempts: RetryAttempt[];
}

const RetryTimeline: React.FC<RetryTimelineProps> = ({ attempts }) => {
  return (
    <div className="relative pl-4 border-l-2 border-gray-200 dark:border-gray-700 ml-2 space-y-6 my-4">
      {attempts.map((attempt, index) => {
        const isSuccess = attempt.status === 'success';

        return (
          <div key={attempt.id} className="relative animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
            {/* Status Dot */}
            <span
              className={`absolute -left-[21px] top-1 h-4 w-4 rounded-full border-2 border-white dark:border-gray-900 ${
                isSuccess ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></span>

            {/* Content Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-100 dark:border-gray-700 shadow-sm">
              
              {/* Left Side: Status & Time */}
              <div className="mb-2 sm:mb-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase ${isSuccess ? 'text-green-700' : 'text-red-700'}`}>
                    Attempt #{attempt.attemptNumber}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {attempt.statusCode}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(attempt.timestamp).toLocaleString()}
                </p>
              </div>

              {/* Right Side: Latency & Error */}
              <div className="text-right">
                 <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                    {attempt.latencyMs}ms
                 </p>
                 {!isSuccess && attempt.error && (
                   <p className="text-xs text-red-600 mt-1 max-w-[200px] truncate" title={attempt.error}>
                     {attempt.error}
                   </p>
                 )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RetryTimeline;