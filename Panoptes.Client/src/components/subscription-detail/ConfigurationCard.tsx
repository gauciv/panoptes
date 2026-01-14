import { useState } from 'react';
import { Copy, Check, Eye, EyeOff } from 'lucide-react';
import { WebhookSubscription } from '../../types';

interface ConfigurationCardProps {
  subscription: WebhookSubscription;
}

export function ConfigurationCard({ subscription }: ConfigurationCardProps) {
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(subscription.targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-sm border border-zinc-300 dark:border-zinc-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)]">
      <Header
        secretKey={subscription.secretKey}
        showSecretKey={showSecretKey}
        onToggleSecret={() => setShowSecretKey(!showSecretKey)}
      />
      <ConfigFields
        subscription={subscription}
        copied={copied}
        onCopyUrl={handleCopyUrl}
      />
    </div>
  );
}

interface HeaderProps {
  secretKey: string;
  showSecretKey: boolean;
  onToggleSecret: () => void;
}

function Header({ secretKey, showSecretKey, onToggleSecret }: HeaderProps) {
  return (
    <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
      <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest">
        System Configuration
      </h3>

      <div className="flex items-center gap-3 self-start sm:self-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-sm">
        <span className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider">
          Secret:
        </span>
        <code className="text-xs font-mono text-zinc-700 dark:text-zinc-300 tracking-wide">
          {showSecretKey ? secretKey : '••••••••••••••••'}
        </code>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSecret();
          }}
          className="p-2 -mr-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors relative z-10"
          aria-label="Toggle Secret Visibility"
        >
          {showSecretKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

interface ConfigFieldsProps {
  subscription: WebhookSubscription;
  copied: boolean;
  onCopyUrl: () => void;
}

function ConfigFields({ subscription, copied, onCopyUrl }: ConfigFieldsProps) {
  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-2">
        <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">
          Target Endpoint
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 font-mono text-xs text-zinc-700 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-sm border border-zinc-200 dark:border-zinc-700 truncate">
            {subscription.targetUrl}
          </div>
          <button
            onClick={onCopyUrl}
            className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 transition-colors shadow-sm"
            title="Copy URL"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">
          Event Type
        </p>
        <span className="inline-flex items-center px-2 py-1 rounded-sm text-xs font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
          {subscription.eventType}
        </span>
      </div>

      <div>
        <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">
          Throughput Limits
        </p>
        <div className="text-sm font-mono text-zinc-800 dark:text-zinc-200 flex flex-col">
          <span>
            {subscription.maxWebhooksPerMinute} <span className="text-zinc-400 text-[10px]">/ min</span>
          </span>
          <span>
            {subscription.maxWebhooksPerHour} <span className="text-zinc-400 text-[10px]">/ hour</span>
          </span>
        </div>
      </div>
    </div>
  );
}
