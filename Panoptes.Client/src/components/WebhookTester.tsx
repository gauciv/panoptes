import React, { useState } from 'react';
import { triggerDirectWebhookTest } from '../services/api'; // <--- Imports your fixed API call

// --- Inline SVG Icons (No external dependencies) ---
const Icons = {
  Play: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
  ),
  Copy: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
  ),
  Check: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"></polyline></svg>
  ),
  Clock: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  ),
  ShieldCheck: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
  ),
  AlertCircle: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
  ),
  Spinner: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
  ),
};

// --- Main Component ---

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
  signature?: string;
  timestamp: string;
}

const WebhookTester: React.FC<WebhookTesterProps> = ({ 
  subscriptionId, 
  targetUrl, 
  samplePayload 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('request');

  const handleTestWebhook = async () => {
    setIsLoading(true);
    setResult(null);
    
    // Auto-switch to response tab to show loading state
    setActiveTab('response'); 
    
    const startTime = Date.now();

    try {
      // ✅ Using the centralized API function to ensure correct URL path
      const data = await triggerDirectWebhookTest(subscriptionId, samplePayload);
      const endTime = Date.now();

      setResult({
        status: 200, // Axios throws on non-2xx, so if we are here, it is success
        statusText: "OK",
        durationMs: endTime - startTime,
        responseBody: data,
        signature: 'HMAC-SHA256', // Placeholder if backend doesn't return headers in body
        timestamp: new Date().toISOString(),
      });
      
    } catch (error: any) {
      const endTime = Date.now();
      // Handle Axios Errors (e.g., 404, 500)
      setResult({
        status: error.response?.status || 0,
        statusText: error.response?.statusText || 'Network Error',
        durationMs: endTime - startTime,
        responseBody: error.response?.data || { error: error.message },
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const getStatusColor = (status: number) => {
    if (status === 0) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-500/50';
    if (status >= 200 && status < 300) return 'text-[#006A33] dark:text-[#00ff66] bg-[#006A33]/10 dark:bg-[#006A33]/20 border-[#006A33]';
    return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-500/50';
  };

  return (
    <div className="bg-white dark:bg-[#0a0a0a] border border-[#006A33]/30 shadow-sm dark:shadow-[0_0_15px_rgba(0,106,51,0.1)] overflow-hidden mt-6">
      
      {/* 1. Header with Target URL and Send Button */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#006A33]/30 bg-gray-50 dark:bg-[#050505]">
        <div>
          <h3 className="text-lg font-medium text-[#006A33] dark:text-[#00ff66]">Webhook Tester</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Send a test payload to <span className="font-mono text-xs bg-[#006A33]/10 dark:bg-[#006A33]/20 text-[#006A33] dark:text-[#00ff66] px-2 py-0.5 border border-[#006A33]/30 dark:border-[#006A33]/50">{targetUrl}</span>
          </p>
        </div>
        <button
          onClick={handleTestWebhook}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white bg-[#006A33] border border-[#006A33] hover:bg-[#008844] hover:shadow-[0_0_15px_rgba(0,106,51,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isLoading ? (
            <Icons.Spinner className="w-4 h-4 animate-spin" />
          ) : (
            <Icons.Play className="w-4 h-4" />
          )}
          {isLoading ? 'Sending...' : 'SEND_TEST_WEBHOOK'}
        </button>
      </div>

      {/* 2. Tab Navigation */}
      <div className="flex border-b border-[#006A33]/30">
        <button
          onClick={() => setActiveTab('request')}
          className={`flex-1 py-3 text-sm font-medium text-center transition-all duration-200 border-b-2 ${
            activeTab === 'request'
              ? 'border-[#006A33] text-[#006A33] dark:text-[#00ff66] bg-[#006A33]/10'
              : 'border-transparent text-gray-500 hover:text-[#006A33] dark:hover:text-[#00ff66] hover:bg-[#006A33]/5'
          }`}
        >
          Request Payload
        </button>
        <button
          onClick={() => setActiveTab('response')}
          className={`flex-1 py-3 text-sm font-medium text-center transition-all duration-200 border-b-2 flex items-center justify-center gap-2 ${
            activeTab === 'response'
              ? 'border-[#006A33] text-[#006A33] dark:text-[#00ff66] bg-[#006A33]/10'
              : 'border-transparent text-gray-500 hover:text-[#006A33] dark:hover:text-[#00ff66] hover:bg-[#006A33]/5'
          }`}
        >
          Response
          {/* Status Indicator Dot */}
          {result && (
            <span className={`w-2 h-2 ${result.status >= 200 && result.status < 300 ? 'bg-[#006A33] dark:bg-[#00ff66] dark:shadow-[0_0_6px_#00ff66]' : 'bg-red-500 dark:shadow-[0_0_6px_#ef4444]'}`} />
          )}
        </button>
      </div>

      {/* 3. Content Area */}
      <div className="min-h-[300px] bg-white dark:bg-[#0a0a0a]">
        
        {/* --- REQUEST TAB --- */}
        {activeTab === 'request' && (
          <div className="p-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#006A33]">JSON Payload</span>
              <button 
                onClick={() => copyToClipboard(JSON.stringify(samplePayload, null, 2), 'req')}
                className="text-gray-500 hover:text-[#006A33] dark:hover:text-[#00ff66] transition-colors"
                title="Copy JSON"
              >
                {copiedSection === 'req' ? (
                  <Icons.Check className="w-4 h-4 text-[#006A33] dark:text-[#00ff66]" />
                ) : (
                  <Icons.Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-[#050505] border border-[#006A33]/30 overflow-hidden">
              <pre className="p-4 text-xs font-mono text-gray-800 dark:text-white overflow-auto max-h-[400px]">
                {JSON.stringify(samplePayload, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* --- RESPONSE TAB --- */}
        {activeTab === 'response' && (
          <div className="p-6 animate-in fade-in duration-200">
            
            {/* Empty State */}
            {!result && !isLoading && (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 py-12">
                <div className="w-12 h-12 bg-[#006A33]/10 border border-[#006A33]/30 flex items-center justify-center mb-3">
                  <Icons.Play className="w-5 h-5 ml-1 text-[#006A33] opacity-50" />
                </div>
                <p className="text-sm text-gray-500">Click "SEND_TEST_WEBHOOK" to trigger a request.</p>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                <Icons.Spinner className="w-8 h-8 animate-spin text-[#006A33] mb-3" />
                <p className="text-sm text-[#006A33]">Waiting for response...</p>
              </div>
            )}

            {/* Result State */}
            {result && !isLoading && (
              <div className="space-y-4">
                {/* Metrics Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`flex flex-col p-3 border ${getStatusColor(result.status)}`}>
                    <span className="text-xs font-medium opacity-80 uppercase">Status</span>
                    <div className="flex items-center gap-2 mt-1">
                      {result.status >= 400 ? (
                        <Icons.AlertCircle className="w-5 h-5" />
                      ) : (
                        <Icons.Check className="w-5 h-5" />
                      )}
                      <span className="text-xl font-bold">{result.status}</span>
                      <span className="text-sm opacity-90">{result.statusText}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col p-3 border border-[#006A33]/30 bg-gray-50 dark:bg-[#050505]">
                    <span className="text-xs font-medium text-[#006A33] uppercase">Latency</span>
                    <div className="flex items-center gap-2 mt-1 text-gray-700 dark:text-gray-200">
                      <Icons.Clock className="w-5 h-5 text-[#006A33]" />
                      <span className="text-xl font-bold text-[#006A33] dark:text-[#00ff66]">{result.durationMs}</span>
                      <span className="text-sm text-gray-500">ms</span>
                    </div>
                  </div>
                </div>

                {/* Signature Header */}
                {result.signature && (
                  <div className="bg-gray-50 dark:bg-[#050505] p-3 border border-[#006A33]/30 flex items-center gap-3">
                    <Icons.ShieldCheck className="w-5 h-5 text-[#006A33] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#006A33] uppercase">HMAC Signature</p>
                      <p className="text-xs font-mono text-[#006A33] dark:text-[#00ff66] truncate" title={result.signature}>
                        {result.signature}
                      </p>
                    </div>
                  </div>
                )}

                {/* Response Body */}
                <div className="relative pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#006A33]">Response Body</span>
                    <button 
                      onClick={() => copyToClipboard(JSON.stringify(result.responseBody, null, 2), 'res')}
                      className="text-gray-500 hover:text-[#006A33] dark:hover:text-[#00ff66] transition-colors"
                    >
                       {copiedSection === 'res' ? (
                          <Icons.Check className="w-3 h-3 text-[#006A33] dark:text-[#00ff66]" />
                       ) : (
                          <Icons.Copy className="w-3 h-3" />
                       )}
                    </button>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#050505] border border-[#006A33]/30 overflow-hidden">
                    <pre className="p-4 text-xs font-mono text-gray-800 dark:text-white overflow-auto max-h-[300px]">
                      {JSON.stringify(result.responseBody, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebhookTester;