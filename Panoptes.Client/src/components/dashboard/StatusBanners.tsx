import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  error: string | null;
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  if (!error) return null;

  return (
    <div className="mb-6 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-red-800 dark:text-red-400">
            Connection Error
          </h3>
          <p className="mt-1 text-sm font-mono text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    </div>
  );
}

interface OfflineBannerProps {
  isConnected: boolean;
}

export function OfflineBanner({ isConnected }: OfflineBannerProps) {
  if (isConnected) return null;

  return (
    <div className="mb-6 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
        <span className="text-sm font-mono font-bold uppercase text-amber-700 dark:text-amber-400">
          Backend Disconnected - Displaying Cached Data
        </span>
      </div>
    </div>
  );
}
