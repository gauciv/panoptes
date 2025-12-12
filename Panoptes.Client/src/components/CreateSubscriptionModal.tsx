import React, { useState, useEffect, useRef } from 'react';

interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Updated signature to match the backend expectation
  onCreate: (data: { 
    name: string; 
    targetUrl: string; 
    eventType: string; 
    walletAddresses?: string[];
    minimumLovelace?: number;
  }) => void;
  initialValues?: {
    name?: string;
    eventType?: string;
    description?: string;
  };
}

const CreateSubscriptionModal: React.FC<CreateSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  initialValues,
}) => {
  // --- Form State ---
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [eventType, setEventType] = useState('Transaction');
  const [minAda, setMinAda] = useState('');
  
  // --- Wallet Address State (Chips) ---
  const [addressInput, setAddressInput] = useState('');
  const [walletAddresses, setWalletAddresses] = useState<string[]>([]);
  const addressInputRef = useRef<HTMLInputElement>(null);

  // --- Validation State ---
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const [validationWarningMessage, setValidationWarningMessage] = useState('');
  const [showFirehoseWarning, setShowFirehoseWarning] = useState(false);

  // Reset/Init on Open
  useEffect(() => {
    if (isOpen) {
      if (initialValues) {
        setName(initialValues.name || '');
        setEventType(initialValues.eventType || 'Transaction');
      } else {
        setName('');
        setEventType('Transaction');
      }
      // Always reset these
      setTargetUrl('');
      setMinAda('');
      setAddressInput('');
      setWalletAddresses([]);
      setIsValidatingUrl(false);
      setShowValidationWarning(false);
      setShowFirehoseWarning(false);
    }
  }, [isOpen, initialValues]);

  // --- Helpers ---

  const isValidUrl = (url: string): boolean => {
    return url.startsWith('http://') || url.startsWith('https://');
  };

  const handleAddAddress = () => {
    const raw = addressInput.trim();
    if (!raw) return;

    // Support pasting comma-separated lists
    const candidates = raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    const newAddresses = candidates.filter(c => !walletAddresses.includes(c));
    
    if (newAddresses.length > 0) {
        setWalletAddresses([...walletAddresses, ...newAddresses]);
        setAddressInput('');
    }
  };

  const handleRemoveAddress = (addrToRemove: string) => {
    setWalletAddresses(walletAddresses.filter(a => a !== addrToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAddress();
    }
  };

  const isFormValid = name.trim().length > 0 && isValidUrl(targetUrl);

  // --- Submission Logic ---

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    // Check for "Firehose" condition: No wallet filter & Transaction type
    if (walletAddresses.length === 0 && eventType === 'Transaction') {
      setShowFirehoseWarning(true);
    } else {
      startUrlValidation();
    }
  };

  const startUrlValidation = async () => {
    setIsValidatingUrl(true);
    setShowFirehoseWarning(false); // Close warning if it was open

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch('/Subscriptions/validate-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetUrl),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!result.valid) {
        setValidationWarningMessage(result.message || 'The webhook URL appears to be unreachable.');
        setShowValidationWarning(true);
        setIsValidatingUrl(false);
        return;
      }

      // Success
      setIsValidatingUrl(false);
      executeCreate();
    } catch (err) {
      setIsValidatingUrl(false);
      const errorMessage = err instanceof Error && err.name === 'AbortError'
        ? 'Validation timed out. Create anyway?'
        : 'Failed to validate URL. Create anyway?';
      setValidationWarningMessage(errorMessage);
      setShowValidationWarning(true);
    }
  };

  const executeCreate = () => {
    // Convert ADA to Lovelace
    let lovelace: number | undefined = undefined;
    if (minAda && !isNaN(parseFloat(minAda))) {
       const val = parseFloat(minAda);
       if (val > 0) lovelace = Math.floor(val * 1_000_000);
    }

    onCreate({
      name: name.trim(),
      targetUrl: targetUrl.trim(),
      eventType,
      walletAddresses: walletAddresses.length > 0 ? walletAddresses : undefined,
      minimumLovelace: lovelace
    });

    handleClose();
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/75 dark:bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Main Modal - Landscape Layout */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-5xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">New Subscription</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Configure webhook trigger and filters</p>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-200 transition-colors">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body - 2 Column Grid */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
              
              {/* --- LEFT COLUMN: Settings --- */}
              <div className="space-y-6">
                
                {/* Name */}
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Friendly Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Main Wallet Tracker"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-green-500 focus:border-transparent transition-all placeholder:text-gray-400 text-sm"
                    autoFocus
                  />
                </div>

                {/* Target URL */}
                <div className="space-y-1.5">
                  <label htmlFor="targetUrl" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Webhook URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="targetUrl"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://api.mysite.com/webhook"
                    className={`w-full h-10 px-3 rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-green-500 focus:border-transparent transition-all placeholder:text-gray-400 text-sm font-mono ${
                      targetUrl && !isValidUrl(targetUrl) 
                        ? 'border-red-300 dark:border-red-700' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {targetUrl && !isValidUrl(targetUrl) && (
                    <p className="text-xs text-red-500 mt-1">URL must start with http:// or https://</p>
                  )}
                </div>

                {/* Type & ADA Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="eventType" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Event Type
                    </label>
                    <select
                      id="eventType"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-green-500 focus:border-transparent transition-all text-sm"
                    >
                      <option value="Transaction">Transaction</option>
                      <option value="NFT Mint">NFT Mint</option>
                      <option value="Asset Move">Asset Move</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                      Min ADA
                      <span className="text-[10px] text-gray-500 font-normal bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Optional</span>
                    </label>
                    <div className="relative">
                       <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="0"
                        value={minAda}
                        onChange={(e) => setMinAda(e.target.value)}
                        className="w-full h-10 pl-3 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-green-500 focus:border-transparent transition-all placeholder:text-gray-400 text-sm font-mono"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 dark:text-gray-400 text-xs font-bold">ADA</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secret Key Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    A unique <strong>Secret Key</strong> will be generated automatically. Use this to verify the <code>X-Panoptes-Signature</code> header in your backend.
                  </p>
                </div>
              </div>

              {/* --- RIGHT COLUMN: Wallet Filters --- */}
              <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Wallet Filters
                  </label>
                  <span className="text-xs bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full font-mono">
                    {walletAddresses.length} added
                  </span>
                </div>
                
                {/* Input Area */}
                <div className="flex gap-2 mb-4">
                  <input
                    ref={addressInputRef}
                    type="text"
                    placeholder="addr1... or stake1..."
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-green-500 focus:border-transparent text-sm font-mono placeholder:text-gray-400"
                  />
                  <button
                    onClick={handleAddAddress}
                    type="button"
                    className="h-10 px-4 bg-gray-900 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center"
                    title="Add Address"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* List Area */}
                <div className="flex-1 overflow-y-auto min-h-[200px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 space-y-2 shadow-inner custom-scrollbar">
                  {walletAddresses.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-4 text-center border-2 border-dashed border-gray-100 dark:border-gray-700 rounded m-2">
                      <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="text-sm font-medium">No filters added</span>
                      <span className="text-xs mt-1">
                        Listening to <strong className="text-indigo-600 dark:text-green-400">ALL</strong> {eventType}s
                      </span>
                    </div>
                  ) : (
                    walletAddresses.map((addr, idx) => (
                      <div key={idx} className="group flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-green-500 flex-shrink-0"></div>
                          <span className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate" title={addr}>
                            {addr}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveAddress(addr)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          title="Remove"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleClose}
              disabled={isValidatingUrl}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePreSubmit}
              disabled={isValidatingUrl || !isFormValid}
              className={`
                px-6 py-2 text-sm font-bold text-white rounded-lg shadow-sm
                transition-all transform active:scale-95
                ${isValidatingUrl || !isFormValid
                  ? 'bg-indigo-300 dark:bg-green-800 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-green-600 dark:hover:bg-green-500 shadow-indigo-200 dark:shadow-green-900/20'}
              `}
            >
              {isValidatingUrl ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Validating...
                </span>
              ) : 'Create'}
            </button>
          </div>

          {/* --- MODAL OVERLAYS --- */}

          {/* 1. Firehose Warning */}
          {showFirehoseWarning && (
             <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/90 backdrop-blur-sm p-6 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-gray-900 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl max-w-md w-full p-6 shadow-2xl">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-500">
                             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                             </svg>
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">High Volume Warning</h4>
                            <p className="text-xs font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-wide">Global Listen Mode</p>
                        </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                        You are about to listen to <strong className="text-gray-900 dark:text-white">EVERY transaction</strong> on the network without any wallet filters.
                        <br/><br/>
                        This generates significant traffic (approx 50+ events/min). Ensure your server can handle this load.
                    </p>

                    <div className="flex gap-3 justify-end">
                        <button 
                            onClick={() => setShowFirehoseWarning(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            Back to Edits
                        </button>
                        <button 
                            onClick={startUrlValidation}
                            className="px-4 py-2 text-sm font-bold text-white bg-yellow-600 hover:bg-yellow-500 rounded-lg shadow-lg transition-colors"
                        >
                            Yes, Proceed
                        </button>
                    </div>
                </div>
             </div>
          )}

          {/* 2. Validation Warning (URL Unreachable) */}
          {showValidationWarning && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 dark:bg-black/90 backdrop-blur-sm p-6 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-gray-900 border-2 border-red-400 dark:border-red-600 rounded-xl max-w-md w-full p-6 shadow-2xl">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-500">
                             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">URL Validation Failed</h4>
                        </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 leading-relaxed">
                        {validationWarningMessage}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                        This usually means the URL is offline, private, or has a firewall.
                    </p>

                    <div className="flex gap-3 justify-end">
                        <button 
                            onClick={() => setShowValidationWarning(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            Fix URL
                        </button>
                        <button 
                            onClick={executeCreate}
                            className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-lg transition-colors"
                        >
                            Create Anyway
                        </button>
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