import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Terminal, 
  Copy, 
  Check, 
  Clock, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  X,
  Server
} from 'lucide-react';
import { triggerTestEvent } from '../services/api'; 

interface WebhookSubscription {
  id: string;
  name: string;
  targetUrl: string;
}

interface WebhookTesterProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: WebhookSubscription | null;
}

interface TestResult {
  status: number;
  statusText: string;
  durationMs: number;
  responseBody: any;
  timestamp: string;
}

export const WebhookTester: React.FC<WebhookTesterProps> = ({ 
  isOpen, 
  onClose,
  subscription 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('request');
  const [copiedState, setCopiedState] = useState<string | null>(null);

  // FIX: Only reset if the Modal OPENS or the Subscription ID changes.
  // We removed 'subscription' object from dependencies to prevent auto-reset 
  // when the parent component polls for updates.
  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setActiveTab('request');
      setIsLoading(false);
    }
  }, [isOpen, subscription?.id]);

  if (!isOpen || !subscription) return null;

  const samplePayload = {
    Event: "test_event",
    Timestamp: new Date().toISOString(),
    SubscriptionId: subscription.id,
    Message: "This is a verification event from Panoptes.",
    Data: {
        TxHash: "00000000000000000000000000000000",
        OutputIndex: 0,
        Amount: { Lovelace: 1000000, Ada: 1.0 }
    }
  };

  const handleTest = async () => {
    setIsLoading(true);
    setResult(null);
    setActiveTab('response'); // Switch to results view
    
    const startTime = Date.now();
    try {
      await triggerTestEvent(subscription.id);

      // UI Simulation for better UX (since webhooks are async)
      await new Promise(r => setTimeout(r, 800));

      setResult({
        status: 200,
        statusText: "OK",
        durationMs: Date.now() - startTime,
        responseBody: { 
            success: true, 
            message: "Event dispatched to queue", 
            delivery_id: crypto.randomUUID() 
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      setResult({
        status: error.response?.status || 500,
        statusText: error.response?.statusText || 'NETWORK_ERROR',
        durationMs: Date.now() - startTime,
        responseBody: error.response?.data || { error: error.message },
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedState(id);
    setTimeout(() => setCopiedState(null), 2000);
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-900 dark:text-emerald-400';
    return 'text-red-600 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900 dark:text-red-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* FIX: Added h-[600px] to force a stable height so it doesn't resize between tabs */}
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl flex flex-col h-[600px] max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-t-lg shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-md">
              <Server className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Webhook_Tester</h2>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">POST</span>
                <span className="truncate max-w-[200px] sm:max-w-[300px]" title={subscription.targetUrl}>{subscription.targetUrl}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY (Split View) */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          
          {/* Sidebar Tabs */}
          <div className="w-32 sm:w-40 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col shrink-0">
            <button
              onClick={() => setActiveTab('request')}
              className={`text-left px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider border-l-2 transition-all ${
                activeTab === 'request'
                ? 'border-zinc-900 dark:border-emerald-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
            >
              Payload
            </button>
            <button
              onClick={() => setActiveTab('response')}
              className={`text-left px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider border-l-2 transition-all flex items-center justify-between ${
                activeTab === 'response'
                ? 'border-zinc-900 dark:border-emerald-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
            >
              Result
              {result && (
                <span className={`w-2 h-2 rounded-full ${result.status >= 200 && result.status < 300 ? 'bg-emerald-500' : 'bg-red-500'}`} />
              )}
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-zinc-50 dark:bg-black relative overflow-hidden flex flex-col">
            
            {/* TOOLBAR */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
                {activeTab === 'request' ? 'JSON Input' : 'Server Output'}
              </span>
              <button 
                onClick={() => copyToClipboard(JSON.stringify(activeTab === 'request' ? samplePayload : result?.responseBody, null, 2), activeTab)}
                className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                 {copiedState === activeTab ? <Check className="w-3 h-3 text-emerald-600"/> : <Copy className="w-3 h-3"/>}
                 Copy
              </button>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              {activeTab === 'request' ? (
                <pre className="text-xs font-mono text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap break-all">
                  {JSON.stringify(samplePayload, null, 2)}
                </pre>
              ) : (
                <>
                  {!result && !isLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 opacity-50">
                      <Terminal className="w-8 h-8 mb-2" />
                      <p className="text-xs font-mono uppercase">Ready to test</p>
                    </div>
                  )}
                  {isLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                      <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-600" />
                      <p className="text-xs font-mono font-bold uppercase animate-pulse">Transmitting...</p>
                    </div>
                  )}
                  {result && (
                    <pre className={`text-xs font-mono whitespace-pre-wrap break-all ${result.status >= 400 ? 'text-amber-600 dark:text-amber-500' : 'text-zinc-600 dark:text-zinc-300'}`}>
                      {JSON.stringify(result.responseBody, null, 2)}
                    </pre>
                  )}
                </>
              )}
            </div>
            
            {/* RESULT FOOTER */}
            {activeTab === 'response' && result && (
               <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-4 shrink-0">
                  <span className={`flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-mono font-bold border ${getStatusColor(result.status)}`}>
                      {result.status >= 200 && result.status < 300 ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {result.status} {result.statusText}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {result.durationMs}ms
                  </div>
               </div>
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end gap-3 rounded-b-lg shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
          >
            Close
          </button>
          
          <button 
            onClick={handleTest}
            disabled={isLoading}
            className={`
                flex items-center gap-2 px-5 py-2 rounded-sm text-xs font-mono font-bold uppercase tracking-wider shadow-sm transition-all
                text-white
                bg-zinc-900 hover:bg-zinc-800
                dark:bg-emerald-600 dark:hover:bg-emerald-500 
                disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isLoading ? (
                <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Testing...
                </>
            ) : (
                <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Fire_Test_Event
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};