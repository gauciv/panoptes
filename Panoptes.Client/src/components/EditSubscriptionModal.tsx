import React, { useState, useEffect } from 'react';
import { WebhookSubscription } from '../types';
import { EventTypeSelector } from './subscription/EventTypeSelector';
import { WalletAddressInput } from './subscription/WalletAddressInput';
import toast from 'react-hot-toast';

interface EditSubscriptionModalProps {
    isOpen: boolean;
    subscription: WebhookSubscription | null;
    onClose: () => void;
    onSave: (data: Partial<WebhookSubscription>) => void;
}

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
            
            // Consolidate filters:
            // Newer subs use walletAddresses array. 
            // Older subs might use targetAddress or policyId fields.
            // We combine them all into the chips list for editing.
            let initialFilters = [...(subscription.walletAddresses || [])];
            
            // Map legacy fields if the list is empty
            if (initialFilters.length === 0) {
                if (subscription.targetAddress) initialFilters.push(subscription.targetAddress);
                // Note: PolicyID logic handled generically
            }
            
            setFilterTargets(initialFilters);

            // Convert Lovelace to ADA string
            if (subscription.minimumLovelace) {
                setMinAda((subscription.minimumLovelace / 1000000).toString());
            } else {
                setMinAda('');
            }
        }
    }, [subscription]);

    // --- Helpers ---
    const getFilterConfig = (type: string) => {
        switch (type) {
            case 'NFT Mint':
                return {
                    label: 'Policy IDs',
                    placeholder: 'Paste Policy ID (Hex)...',
                    description: 'Only trigger when assets with these Policy IDs are minted or burned.'
                };
            case 'Asset Move':
                return {
                    label: 'Asset / Policy Filters',
                    placeholder: 'PolicyID or AssetFingerprint...',
                    description: 'Trigger when specific assets are moved between wallets.'
                };
            case 'Transaction':
            default:
                return {
                    label: 'Wallet Addresses',
                    placeholder: 'addr1... or stake1...',
                    description: 'Leave empty to listen to ALL network transactions (Firehose Mode).'
                };
        }
    };

    const filterConfig = getFilterConfig(eventType);

    if (!isOpen || !subscription) return null;

    // --- Logic ---

    const validateUrl = (url: string): boolean => {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateUrl(targetUrl)) {
            toast.error('Please enter a valid HTTP or HTTPS URL');
            return;
        }

        // Only validate URL if it changed
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

        onSave({
            id: subscription.id,
            name,
            targetUrl,
            eventType,
            isActive,
            walletAddresses: filterTargets.length > 0 ? filterTargets : [],
            minimumLovelace: lovelace,
            // We clear legacy fields to enforce the new array-based system
            targetAddress: null,
            policyId: null
        });

        setShowValidationWarning(false);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div 
                className="fixed inset-0 bg-gray-900/75 dark:bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-5xl bg-white dark:bg-black rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 font-michroma tracking-wide">Edit Subscription</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">Update configuration and filters</p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-200 transition-colors">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-6 md:p-8 space-y-8">
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                                
                                {/* LEFT: Core Config */}
                                <div className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-sentinel focus:border-sentinel transition-all placeholder:text-gray-500 text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            Target URL
                                        </label>
                                        <input
                                            type="text"
                                            value={targetUrl}
                                            onChange={(e) => setTargetUrl(e.target.value)}
                                            className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-sentinel focus:border-sentinel transition-all placeholder:text-gray-500 text-sm font-mono"
                                        />
                                    </div>

                                    {/* Event Type Visual Selector */}
                                    <EventTypeSelector value={eventType} onChange={setEventType} />

                                    {/* Active & Min ADA Row */}
                                    <div className="grid grid-cols-2 gap-4 items-end">
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Min Value (ADA)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                placeholder="0"
                                                value={minAda}
                                                onChange={(e) => setMinAda(e.target.value)}
                                                className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-sentinel focus:border-sentinel transition-all placeholder:text-gray-500 text-sm font-mono"
                                            />
                                        </div>

                                        <div className="h-10 flex items-center px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
                                            <label className="inline-flex items-center cursor-pointer w-full">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isActive} 
                                                    onChange={(e) => setIsActive(e.target.checked)}
                                                    className="sr-only peer" 
                                                />
                                                <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sentinel"></div>
                                                <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                                                    {isActive ? 'Active' : 'Paused'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT: Dynamic Filters */}
                                <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                                    <WalletAddressInput 
                                        addresses={filterTargets}
                                        onChange={setFilterTargets}
                                        label={filterConfig.label}
                                        placeholder={filterConfig.placeholder}
                                        description={filterConfig.description}
                                    />
                                    
                                    {/* Secret Key Info Box */}
                                    <div className="mt-auto pt-6">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-lg p-3">
                                            <label className="block text-xs font-bold text-blue-800 dark:text-blue-300 mb-1">
                                                SECRET KEY (READ-ONLY)
                                            </label>
                                            <code className="block text-[10px] text-blue-600 dark:text-blue-400 break-all font-mono">
                                                {subscription.secretKey}
                                            </code>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-800">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isValidatingUrl}
                            className={`
                                px-6 py-2 text-sm font-bold text-black rounded-lg shadow-sm
                                transition-all transform active:scale-95
                                ${isValidatingUrl
                                    ? 'bg-sentinel/50 cursor-not-allowed' 
                                    : 'bg-sentinel hover:bg-sentinel-hover shadow-sentinel/20'}
                            `}
                        >
                            {isValidatingUrl ? 'Validating...' : 'Save Changes'}
                        </button>
                    </div>

                    {/* Validation Warning Modal */}
                    {showValidationWarning && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 dark:bg-black/90 backdrop-blur-sm p-6">
                            <div className="bg-white dark:bg-gray-900 border-2 border-red-500 rounded-xl max-w-md w-full p-6 shadow-2xl">
                                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Connection Issue</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                                    {validationWarningMessage}
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <button 
                                        onClick={() => setShowValidationWarning(false)} 
                                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                    >
                                        Edit URL
                                    </button>
                                    <button 
                                        onClick={saveChanges} 
                                        className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg"
                                    >
                                        Save Anyway
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

export default EditSubscriptionModal;