import React, { useState, useEffect } from 'react';
import { WebhookSubscription } from '../types';
import { EventTypeSelector } from './subscription/EventTypeSelector';
import { WalletAddressInput } from './subscription/WalletAddressInput';
import toast from 'react-hot-toast';
// ADDED: Info icon
import { Plus, Trash2, Info } from 'lucide-react';

interface EditSubscriptionModalProps {
    isOpen: boolean;
    subscription: WebhookSubscription | null;
    onClose: () => void;
    onSave: (data: Partial<WebhookSubscription>) => void;
}

type HeaderPair = { id: string; key: string; value: string };

// ADDED: Default Headers Constant
const DEFAULT_HEADERS = [
  { key: 'Content-Type', value: 'application/json' },
  { key: 'User-Agent', value: 'Panoptes-Webhook/1.0' },
  { key: 'X-Panoptes-Signature', value: '<hmac-sha256>' },
  { key: 'X-Panoptes-Event', value: '<event-type>' },
  { key: 'X-Panoptes-Delivery', value: '<uuid>' },
];

const EditSubscriptionModal: React.FC<EditSubscriptionModalProps> = ({
    isOpen,
    subscription,
    onClose,
    onSave,
}) => {
    // --- State ---
    const [name, setName] = useState('');
    const [targetUrl, setTargetUrl] = useState('');
    const [eventType, setEventType] = useState('Transaction');
    const [isActive, setIsActive] = useState(true);
    const [minAda, setMinAda] = useState('');
    const [filterTargets, setFilterTargets] = useState<string[]>([]);
    
    // Headers State
    const [headers, setHeaders] = useState<HeaderPair[]>([]);
    // ADDED: UI Toggle State
    const [showDefaultHeaders, setShowDefaultHeaders] = useState(false);

    // --- Validation State ---
    const [isValidatingUrl, setIsValidatingUrl] = useState(false);
    const [showValidationWarning, setShowValidationWarning] = useState(false);
    const [validationWarningMessage, setValidationWarningMessage] = useState('');

    // --- Initialization ---
    useEffect(() => {
        if (subscription) {
            setName(subscription.name);
            setTargetUrl(subscription.targetUrl);
            setEventType(subscription.eventType);
            setIsActive(subscription.isActive);
            setShowDefaultHeaders(false); // Reset toggle
            
            // Consolidate filters
            let initialFilters = [...(subscription.walletAddresses || [])];
            if (initialFilters.length === 0) {
                if (subscription.targetAddress) initialFilters.push(subscription.targetAddress);
            }
            setFilterTargets(initialFilters);

            // Min ADA
            if (subscription.minimumLovelace) {
                setMinAda((subscription.minimumLovelace / 1000000).toString());
            } else {
                setMinAda('');
            }

            // Parse Headers
            if (subscription.customHeaders) {
                try {
                    const parsed = JSON.parse(subscription.customHeaders);
                    const pairs = Object.entries(parsed).map(([key, value]) => ({
                        id: crypto.randomUUID(),
                        key,
                        value: String(value)
                    }));
                    setHeaders(pairs);
                } catch (e) {
                    console.error("Failed to parse headers", e);
                    setHeaders([]);
                }
            } else {
                setHeaders([]);
            }
        }
    }, [subscription]);

    // --- Helpers ---
    const addHeader = () => setHeaders([...headers, { id: crypto.randomUUID(), key: '', value: '' }]);
    const updateHeader = (id: string, field: 'key' | 'value', val: string) => 
        setHeaders(headers.map(h => h.id === id ? { ...h, [field]: val } : h));
    const removeHeader = (id: string) => setHeaders(headers.filter(h => h.id !== id));

    const getFilterConfig = (type: string) => {
        switch (type) {
            case 'NFT Mint': return { label: 'Policy IDs', placeholder: 'Paste Policy ID (Hex)...', description: 'Only trigger when assets with these Policy IDs are minted or burned.' };
            case 'Asset Move': return { label: 'Asset / Policy Filters', placeholder: 'PolicyID or AssetFingerprint...', description: 'Trigger when specific assets are moved between wallets.' };
            case 'Transaction': default: return { label: 'Wallet Addresses', placeholder: 'addr1... or stake1...', description: 'Leave empty to listen to ALL network transactions (Firehose Mode).' };
        }
    };
    const filterConfig = getFilterConfig(eventType);

    if (!isOpen || !subscription) return null;

    // --- Logic ---
    const validateUrl = (url: string): boolean => {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch { return false; }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateUrl(targetUrl)) {
            toast.error('Please enter a valid HTTP or HTTPS URL');
            return;
        }

        if (targetUrl !== subscription.targetUrl) {
            setIsValidatingUrl(true);
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

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
            } catch (err) {
                setIsValidatingUrl(false);
                setValidationWarningMessage('Failed to validate URL. Save anyway?');
                setShowValidationWarning(true);
                return;
            }
        }

        setIsValidatingUrl(false);
        saveChanges();
    };

    const saveChanges = () => {
        let lovelace: number | undefined = undefined;
        if (minAda && !isNaN(parseFloat(minAda))) {
            const val = parseFloat(minAda);
            if (val > 0) lovelace = Math.floor(val * 1_000_000);
        }

        const customHeadersObj: Record<string, string> = {};
        headers.forEach(h => {
            if (h.key.trim()) customHeadersObj[h.key.trim()] = h.value.trim();
        });
        
        const serializedHeaders = Object.keys(customHeadersObj).length > 0 
            ? JSON.stringify(customHeadersObj) 
            : undefined;

        onSave({
            id: subscription.id,
            name,
            targetUrl,
            eventType,
            isActive,
            walletAddresses: filterTargets.length > 0 ? filterTargets : [],
            minimumLovelace: lovelace,
            targetAddress: null,
            policyId: null,
            customHeaders: serializedHeaders
        });

        setShowValidationWarning(false);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-gray-900/75 dark:bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-5xl bg-white dark:bg-black rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 font-michroma tracking-wide">Edit Subscription</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">Update configuration and filters</p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-200 transition-colors">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-6 md:p-8 space-y-8">
                            
                            {/* TOP SECTION: GRID */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* LEFT: Core Config */}
                                <div className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Name</label>
                                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-sentinel focus:border-sentinel transition-all placeholder:text-gray-500 text-sm" />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Target URL</label>
                                        <input type="text" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-sentinel focus:border-sentinel transition-all placeholder:text-gray-500 text-sm font-mono" />
                                    </div>

                                    <EventTypeSelector value={eventType} onChange={setEventType} />

                                    <div className="grid grid-cols-2 gap-4 items-end">
                                        <div className="space-y-1.5">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Min Value (ADA)</label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                step="0.1" 
                                                placeholder="0" 
                                                value={minAda} 
                                                // FIX: Strict validation prevents negative signs and values
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === '' || (parseFloat(val) >= 0 && !val.includes('-'))) {
                                                        setMinAda(val);
                                                    }
                                                }}
                                                // UX: Prevent typing '-' key directly
                                                onKeyDown={(e) => {
                                                    if (e.key === '-' || e.key === 'e') e.preventDefault();
                                                }}
                                                className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-sentinel focus:border-sentinel transition-all placeholder:text-gray-500 text-sm font-mono" 
                                            />
                                        </div>
                                        <div className="h-10 flex items-center px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
                                            <label className="inline-flex items-center cursor-pointer w-full">
                                                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="sr-only peer" />
                                                <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel"></div>
                                                <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">{isActive ? 'Active' : 'Paused'}</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT: Dynamic Filters */}
                                <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                                    <WalletAddressInput addresses={filterTargets} onChange={setFilterTargets} label={filterConfig.label} placeholder={filterConfig.placeholder} description={filterConfig.description} />
                                    <div className="mt-auto pt-6">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-lg p-3">
                                            <label className="block text-xs font-bold text-blue-800 dark:text-blue-300 mb-1">SECRET KEY (READ-ONLY)</label>
                                            <code className="block text-[10px] text-blue-600 dark:text-blue-400 break-all font-mono">{subscription.secretKey}</code>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BOTTOM SECTION: HEADERS */}
                            <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
                                
                                {/* ADDED: Default Headers Toggle */}
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

                                {/* Custom Headers UI */}
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Custom Headers</h4>
                                        <p className="text-xs text-gray-500 mt-1">Add custom HTTP headers to the webhook request (e.g. Authorization tokens).</p>
                                    </div>
                                    <button onClick={addHeader} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-green-900/20 text-indigo-600 dark:text-green-400 rounded-md text-xs font-bold hover:bg-indigo-100 dark:hover:bg-green-900/30 transition-colors">
                                        <Plus className="w-3 h-3" /> Add Header
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {headers.length === 0 && (
                                        <div className="text-sm text-gray-400 italic">No custom headers configured.</div>
                                    )}
                                    {headers.map((h) => (
                                        <div key={h.id} className="flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-200">
                                            <div className="flex-1 flex gap-3">
                                                <input type="text" placeholder="Key (e.g. Authorization)" value={h.key} onChange={(e) => updateHeader(h.id, 'key', e.target.value)} className="flex-1 h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black font-mono text-sm focus:ring-1 focus:ring-sentinel" />
                                                <input type="text" placeholder="Value" value={h.value} onChange={(e) => updateHeader(h.id, 'value', e.target.value)} className="flex-1 h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black font-mono text-sm focus:ring-1 focus:ring-sentinel" />
                                            </div>
                                            <button onClick={() => removeHeader(h.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-800">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
                        <button onClick={handleSubmit} disabled={isValidatingUrl} className={`px-6 py-2 text-sm font-bold text-black rounded-lg shadow-sm transition-all transform active:scale-95 ${isValidatingUrl ? 'bg-sentinel/50 cursor-not-allowed' : 'bg-sentinel hover:bg-sentinel-hover shadow-sentinel/20'}`}>{isValidatingUrl ? 'Validating...' : 'Save Changes'}</button>
                    </div>

                    {/* Validation Warning */}
                    {showValidationWarning && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 dark:bg-black/90 backdrop-blur-sm p-6">
                            <div className="bg-white dark:bg-gray-900 border-2 border-red-500 rounded-xl max-w-md w-full p-6 shadow-2xl">
                                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Connection Issue</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{validationWarningMessage}</p>
                                <div className="flex gap-3 justify-end">
                                    <button onClick={() => setShowValidationWarning(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">Edit URL</button>
                                    <button onClick={saveChanges} className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg">Save Anyway</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditSubscriptionModal;