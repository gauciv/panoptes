import React, { useState, useEffect } from 'react';
import { EventTypeSelector } from './subscription/EventTypeSelector';
import { WalletAddressInput } from './subscription/WalletAddressInput';
import { Plus, Trash2, ArrowRight, ArrowLeft, Check, Info, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { 
    name: string; 
    targetUrl: string; 
    eventType: string; 
    walletAddresses?: string[];
    minimumLovelace?: number;
    customHeaders?: Record<string, string>;
  }) => void;
  initialValues?: {
    name?: string;
    eventType?: string;
  };
}

type HeaderPair = { id: string; key: string; value: string };

const DEFAULT_HEADERS = [
  { key: 'Content-Type', value: 'application/json' },
  { key: 'User-Agent', value: 'Panoptes-Webhook/1.0' },
  { key: 'X-Panoptes-Signature', value: '<hmac-sha256>' },
  { key: 'X-Panoptes-Event', value: '<event-type>' },
  { key: 'X-Panoptes-Delivery', value: '<uuid>' },
];

const CreateSubscriptionModal: React.FC<CreateSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  initialValues,
}) => {
  const [step, setStep] = useState(1);

  // --- Form State ---
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [eventType, setEventType] = useState('Transaction');
  const [minAda, setMinAda] = useState('');
  const [filterTargets, setFilterTargets] = useState<string[]>([]);
  const [headers, setHeaders] = useState<HeaderPair[]>([]);

  // --- UI State ---
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [showFirehoseWarning, setShowFirehoseWarning] = useState(false);
  const [showDefaultHeaders, setShowDefaultHeaders] = useState(false); // Toggle for default headers view
  
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setName(initialValues?.name || '');
      setEventType(initialValues?.eventType || 'Transaction');
      setTargetUrl('');
      setMinAda('');
      setFilterTargets([]);
      setHeaders([]);
      setIsValidatingUrl(false);
      setShowFirehoseWarning(false);
      setShowDefaultHeaders(false);
    }
  }, [isOpen, initialValues]);

  // --- Header Helpers ---
  const addHeader = () => setHeaders([...headers, { id: crypto.randomUUID(), key: '', value: '' }]);
  const updateHeader = (id: string, field: 'key' | 'value', val: string) => 
    setHeaders(headers.map(h => h.id === id ? { ...h, [field]: val } : h));
  const removeHeader = (id: string) => setHeaders(headers.filter(h => h.id !== id));

  // --- Filter Config ---
  const getFilterConfig = (type: string) => {
    switch (type) {
      case 'NFT Mint': return { label: 'Policy IDs', placeholder: 'Paste Policy ID (Hex)...', description: 'Trigger on mint/burn of these Policies.' };
      case 'Asset Move': return { label: 'Asset / Policy Filters', placeholder: 'PolicyID...', description: 'Trigger on movement of specific assets.' };
      case 'Transaction': default: return { label: 'Wallet Addresses', placeholder: 'addr1... or stake1...', description: 'Leave empty for Firehose Mode (All Tx).' };
    }
  };
  const filterConfig = getFilterConfig(eventType);

  // --- FIX: Use Validate Endpoint instead of Test Endpoint ---
  const handleTestConnection = async () => {
    if (!targetUrl || !targetUrl.startsWith('http')) {
      toast.error('Valid URL required for testing');
      return;
    }

    setIsValidatingUrl(true);
    const toastId = toast.loading('Pinging endpoint...');

    try {
      // Use the raw fetch to hit the stateless validation endpoint
      // This avoids the "Guid Parse" error on the backend
      const response = await fetch('/Subscriptions/validate-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetUrl) // Send just the string
      });

      const result = await response.json();

      if (response.ok && result.valid) {
        toast.success(`Success: ${result.message}`, { id: toastId });
      } else {
        toast.error(`Unreachable: ${result.message || response.statusText}`, { id: toastId });
      }
    } catch (err: any) {
      toast.error(`Connection Failed: ${err.message}`, { id: toastId });
    } finally {
      setIsValidatingUrl(false);
    }
  };

  const isStep1Valid = name.trim().length > 0 && targetUrl.startsWith('http');

  const handleNext = () => {
    if (!isStep1Valid) return;
    setStep(2);
  };

  const handleFinalSubmit = () => {
    let lovelace: number | undefined = undefined;
    if (minAda && !isNaN(parseFloat(minAda))) {
       const val = parseFloat(minAda);
       if (val > 0) lovelace = Math.floor(val * 1_000_000);
    }

    const customHeaders: Record<string, string> = {};
    headers.forEach(h => {
        if (h.key.trim()) customHeaders[h.key.trim()] = h.value.trim();
    });

    if (filterTargets.length === 0 && eventType === 'Transaction' && !showFirehoseWarning) {
      setShowFirehoseWarning(true);
      return;
    }

    onCreate({
      name: name.trim(),
      targetUrl: targetUrl.trim(),
      eventType,
      walletAddresses: filterTargets.length > 0 ? filterTargets : undefined,
      minimumLovelace: lovelace,
      customHeaders: Object.keys(customHeaders).length > 0 ? customHeaders : undefined
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-gray-900/75 dark:bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-5xl bg-white dark:bg-black rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 font-michroma tracking-wide">New Subscription</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                {step === 1 ? 'Step 1: Configuration & Filters' : 'Step 2: Delivery Options'}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
                <div className={`h-1.5 w-8 rounded-full transition-colors ${step === 1 ? 'bg-indigo-600 dark:bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                <div className={`h-1.5 w-8 rounded-full transition-colors ${step === 2 ? 'bg-indigo-600 dark:bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
            
            {/* STEP 1 */}
            {step === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Friendly Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Main Wallet Tracker"
                      className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-sentinel text-sm"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Webhook URL *</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        placeholder="https://api.mysite.com/webhook"
                        className="w-full h-10 pl-3 pr-20 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-sentinel font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={!targetUrl || isValidatingUrl}
                        className="absolute right-1 top-1 bottom-1 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 rounded-md transition-colors disabled:opacity-50"
                      >
                        {isValidatingUrl ? '...' : 'Test'}
                      </button>
                    </div>
                  </div>

                  <EventTypeSelector value={eventType} onChange={setEventType} />

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Min Value (ADA)</label>
                    <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="0"
                        value={minAda}
                        onChange={(e) => setMinAda(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-sentinel text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <WalletAddressInput 
                    addresses={filterTargets}
                    onChange={setFilterTargets}
                    label={filterConfig.label}
                    placeholder={filterConfig.placeholder}
                    description={filterConfig.description}
                  />
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                 
                 {/* Default Headers Section */}
                 <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden mb-6">
                    <button 
                      onClick={() => setShowDefaultHeaders(!showDefaultHeaders)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Default Headers</span>
                        <span className="text-xs text-gray-500 font-normal">(Included automatically)</span>
                      </div>
                      <span className="text-xs text-indigo-600 dark:text-green-500 font-medium">
                        {showDefaultHeaders ? 'Hide' : 'View'}
                      </span>
                    </button>
                    
                    {showDefaultHeaders && (
                      <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
                        <div className="mt-3 grid gap-2">
                          {DEFAULT_HEADERS.map((h, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs font-mono">
                              <span className="w-40 text-gray-500 dark:text-gray-400 text-right">{h.key}:</span>
                              <span className="text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded">{h.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                 </div>

                 {/* Custom Headers Section */}
                 <div className="flex-1 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Custom Headers</h4>
                        <button onClick={addHeader} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-green-900/20 text-indigo-600 dark:text-green-400 rounded-md text-xs font-bold hover:bg-indigo-100 dark:hover:bg-green-900/30 transition-colors">
                            <Plus className="w-3 h-3" /> Add Header
                        </button>
                    </div>

                    {headers.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
                            <p className="text-sm text-gray-500 mb-2">No custom headers configured.</p>
                            <p className="text-xs text-gray-400">Add headers like <code>Authorization</code> or <code>X-Api-Key</code> if your endpoint requires them.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {headers.map((h, idx) => (
                                <div key={h.id} className="flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-200">
                                    <div className="flex-1 flex gap-3">
                                      <input 
                                          type="text" 
                                          placeholder="Header Key (e.g. X-Api-Key)"
                                          value={h.key}
                                          onChange={(e) => updateHeader(h.id, 'key', e.target.value)}
                                          className="flex-1 h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black font-mono text-sm focus:ring-1 focus:ring-sentinel"
                                      />
                                      <input 
                                          type="text" 
                                          placeholder="Value"
                                          value={h.value}
                                          onChange={(e) => updateHeader(h.id, 'value', e.target.value)}
                                          className="flex-1 h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black font-mono text-sm focus:ring-1 focus:ring-sentinel"
                                      />
                                    </div>
                                    <button onClick={() => removeHeader(h.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-800">
            {step === 2 ? (
                <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
            ) : (
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                    Cancel
                </button>
            )}

            {step === 1 ? (
                <button
                    onClick={handleNext}
                    disabled={!isStep1Valid}
                    className={`flex items-center gap-2 px-6 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-all ${
                        !isStep1Valid ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-green-600 dark:hover:bg-green-500'
                    }`}
                >
                    Next Step <ArrowRight className="w-4 h-4" />
                </button>
            ) : (
                <button
                    onClick={handleFinalSubmit}
                    disabled={isValidatingUrl}
                    className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-black bg-sentinel hover:bg-sentinel-hover shadow-sentinel/20 rounded-lg shadow-sm transition-all"
                >
                    <Check className="w-4 h-4" /> Create Subscription
                </button>
            )}
          </div>

          {/* Firehose Warning */}
          {showFirehoseWarning && (
             <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6">
                <div className="bg-white dark:bg-black border-2 border-yellow-500 rounded-xl max-w-md w-full p-6 shadow-2xl">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                        High Traffic Warning
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                        You are about to listen to <strong>EVERY transaction</strong> on the network (Firehose Mode). This may generate significant load.
                    </p>
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setShowFirehoseWarning(false)} className="px-4 py-2 text-sm border rounded-lg text-gray-700 dark:text-gray-300 dark:border-gray-700">Back</button>
                        <button onClick={handleFinalSubmit} className="px-4 py-2 text-sm font-bold text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg">Confirm</button>
                    </div>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateSubscriptionModal;