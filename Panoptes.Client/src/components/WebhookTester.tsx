import React, { useState } from 'react';
import { 
  Play, 
  Terminal, 
  Copy, 
  Check, 
  Clock, 
  Loader2, 
  CheckCircle, 
  XCircle, 
} from 'lucide-react';
import { triggerDirectWebhookTest } from '../services/api';

interface WebhookTesterProps {
  subscriptionId: string;
  targetUrl: string;
  samplePayload: Record<string, any>;
}

interface TestResult {
  status: number;
  statusText: string;
  durationMs: number;
  responseBody: any;
  timestamp: string;
}

const WebhookTester: React.FC<WebhookTesterProps> = ({ 
  subscriptionId, 
  targetUrl, 
  samplePayload 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('request');
  const [copiedState, setCopiedState] = useState<string | null>(null);

  const handleTest = async () => {
    setIsLoading(true);
    setResult(null);
    setActiveTab('response'); // Auto-switch to view execution
    
    const startTime = Date.now();
    try {
      const data = await triggerDirectWebhookTest(subscriptionId, samplePayload);
      setResult({
        status: 200,
        statusText: "OK",
        durationMs: Date.now() - startTime,
        responseBody: data,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      setResult({
        status: error.response?.status || 0,
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

  // Industrial Color Logic
  const getStatusColor = (status: number) => {
    if (status === 0) return 'text-red-600 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900 dark:text-red-400';
    if (status >= 200 && status < 300) return 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-900 dark:text-emerald-400';
    if (status >= 400 && status < 500) return 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900 dark:text-amber-400';
    return 'text-red-600 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900 dark:text-red-400';
  };

  return (
    <div className="mt-8 border border-zinc-300 dark:border-zinc-700 rounded-sm overflow-hidden bg-white dark:bg-zinc-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)]">
      
      {/* 1. CONTROL BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 gap-4">
        
        {/* URL Display */}
        <div className="flex items-center gap-3 overflow-hidden w-full sm:w-auto">
          <div className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-sm shrink-0">
             <Terminal className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Target Endpoint</h3>
            <div className="flex items-center gap-2 text-xs font-mono mt-0.5 text-zinc-800 dark:text-zinc-200">
               <span className="font-bold text-indigo-600 dark:text-indigo-400">POST</span>
               <span className="truncate" title={targetUrl}>{targetUrl}</span>
            </div>
          </div>
        </div>
        
        {/* Action Button - High Contrast & Dark Mode Friendly */}
        <button
          onClick={handleTest}
          disabled={isLoading}
          className={`
            w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 
            bg-zinc-900 text-white hover:bg-zinc-800 
            dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white 
            text-xs font-mono font-bold uppercase tracking-wider 
            rounded-sm 
            disabled:opacity-50 disabled:cursor-not-allowed 
            transition-all shadow-sm active:translate-y-px
          `}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
             <Play className="w-3.5 h-3.5 fill-current" />
          )}
          {isLoading ? 'EXECUTING...' : 'TEST_EVENT'}
        </button>
      </div>

      {/* 2. CONSOLE INTERFACE (Split View) */}
      <div className="flex flex-col md:flex-row min-h-[400px]">
        
        {/* Left Panel: Navigation/Tabs */}
        <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30">
          <nav className="flex md:flex-col h-full">
            
            {/* Request Tab */}
            <button
              onClick={() => setActiveTab('request')}
              className={`
                flex-1 md:flex-none text-left px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider 
                border-b-2 md:border-b-0 md:border-l-2 transition-colors 
                ${activeTab === 'request'
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }
              `}
            >
              Payload_Body
            </button>

            {/* Response Tab */}
            <button
              onClick={() => setActiveTab('response')}
              className={`
                flex-1 md:flex-none text-left px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider 
                border-b-2 md:border-b-0 md:border-l-2 transition-colors flex items-center justify-between
                ${activeTab === 'response'
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }
              `}
            >
              Result
              {result && (
                <span className={`ml-2 w-2 h-2 rounded-full ${result.status >= 200 && result.status < 300 ? 'bg-emerald-500' : 'bg-red-500'}`} />
              )}
            </button>
          </nav>
        </div>

        {/* Right Panel: Output Area */}
        <div className="flex-1 bg-white dark:bg-zinc-950 relative flex flex-col h-[400px] md:h-auto">
          
          {/* --- REQUEST VIEW --- */}
          {activeTab === 'request' && (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">JSON Input</span>
                <button 
                  onClick={() => copyToClipboard(JSON.stringify(samplePayload, null, 2), 'req')}
                  className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                >
                   {copiedState === 'req' ? <Check className="w-3 h-3 text-emerald-600"/> : <Copy className="w-3 h-3"/>}
                   Copy
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <pre className="text-xs font-mono text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap break-all w-full h-full">
                  {JSON.stringify(samplePayload, null, 2)}
                </pre>
              </div>
            </>
          )}

          {/* --- RESPONSE VIEW --- */}
          {activeTab === 'response' && (
            <>
              {!result && !isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 text-center bg-zinc-50/30 dark:bg-black/20">
                  <div className="w-12 h-12 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-sm flex items-center justify-center mb-3 shadow-sm">
                    <Terminal className="w-5 h-5 opacity-50" />
                  </div>
                  <p className="text-xs font-mono uppercase tracking-wide">Awaiting Execution</p>
                </div>
              ) : isLoading ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8">
                    <div className="animate-spin mb-4 text-zinc-300 dark:text-zinc-700">
                        <Loader2 className="w-8 h-8" />
                    </div>
                    <p className="text-xs font-mono font-bold uppercase animate-pulse">Transmitting Payload...</p>
                 </div>
              ) : (
                <div className="flex flex-col h-full absolute inset-0">
                  {/* Result Header Stats */}
                  <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-wrap gap-4 items-center justify-between shrink-0">
                     <div className="flex items-center gap-4">
                        <span className={`flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-mono font-bold border ${getStatusColor(result!.status)}`}>
                            {result!.status >= 200 && result!.status < 300 ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {result!.status} {result!.statusText}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            {result!.durationMs}ms
                        </div>
                     </div>
                     
                     <button 
                        onClick={() => copyToClipboard(JSON.stringify(result!.responseBody, null, 2), 'res')}
                        className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                    >
                        {copiedState === 'res' ? <Check className="w-3 h-3 text-emerald-600"/> : <Copy className="w-3 h-3"/>}
                        <span className="hidden sm:inline">Copy Output</span>
                    </button>
                  </div>

                  {/* Result Body (JSON) - Full Height & Scrolling */}
                  <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-white dark:bg-black w-full">
                     <pre className={`text-xs font-mono whitespace-pre-wrap break-all w-full h-full ${result!.status >= 400 ? 'text-amber-700 dark:text-amber-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                        {JSON.stringify(result!.responseBody, null, 2)}
                     </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebhookTester;