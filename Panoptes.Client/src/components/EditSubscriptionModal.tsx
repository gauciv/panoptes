import React, { useState, useEffect } from 'react';
import { WebhookSubscription } from '../types';

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
    const [name, setName] = useState('');
    const [targetUrl, setTargetUrl] = useState('');
    const [eventType, setEventType] = useState('Transaction');
    const [isActive, setIsActive] = useState(true);
    const [targetAddress, setTargetAddress] = useState('');
    const [policyId, setPolicyId] = useState('');
    const [walletAddressesText, setWalletAddressesText] = useState('');
    const [urlError, setUrlError] = useState('');
    const [isValidatingUrl, setIsValidatingUrl] = useState(false);
    const [showValidationWarning, setShowValidationWarning] = useState(false);
    const [validationWarningMessage, setValidationWarningMessage] = useState('');

    const parseWalletAddresses = (text: string): string[] => {
        if (!text.trim()) return [];
        return text
            .split(/[,\n]+/)  // Split by comma or newline
            .map(addr => addr.trim())
            .filter(addr => addr.length > 0);
    };

    useEffect(() => {
        if (subscription) {
            setName(subscription.name);
            setTargetUrl(subscription.targetUrl);
            setEventType(subscription.eventType);
            setIsActive(subscription.isActive);
            setTargetAddress(subscription.targetAddress || '');
            setPolicyId(subscription.policyId || '');
            setWalletAddressesText(subscription.walletAddresses?.join('\n') || '');
            setUrlError('');
        }
    }, [subscription]);

    if (!isOpen || !subscription) return null;

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
            setUrlError('Please enter a valid HTTP or HTTPS URL');
            return;
        }

        // Validate URL before saving
        setIsValidatingUrl(true);
        setUrlError('');

        try {
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch('/Subscriptions/validate-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(targetUrl),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const result = await response.json();

            if (!result.valid) {
                setValidationWarningMessage(result.message || 'The webhook URL appears to be unreachable. Are you sure you want to save these changes?');
                setShowValidationWarning(true);
                setIsValidatingUrl(false);
                return;
            }

            setIsValidatingUrl(false);
            saveChanges();
        } catch (err) {
            setIsValidatingUrl(false);
            const errorMessage = err instanceof Error && err.name === 'AbortError'
                ? 'Validation timed out after 10 seconds. The webhook URL may be slow or unreachable. Do you want to save anyway?'
                : 'Failed to validate URL. Are you sure you want to save these changes?';
            setValidationWarningMessage(errorMessage);
            setShowValidationWarning(true);
        }
    };

    const saveChanges = () => {
        const walletAddresses = parseWalletAddresses(walletAddressesText);

        onSave({
            id: subscription.id,
            name,
            targetUrl,
            eventType,
            isActive,
            targetAddress: targetAddress || null,
            policyId: policyId || null,
            walletAddresses: walletAddresses.length > 0 ? walletAddresses : null,
        });

        setShowValidationWarning(false);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 transform transition-all">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Edit Subscription
                        </h3>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div>
                            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                id="edit-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>

                        {/* Target URL */}
                        <div>
                            <label htmlFor="edit-targetUrl" className="block text-sm font-medium text-gray-700 mb-1">
                                Target URL
                            </label>
                            <input
                                type="url"
                                id="edit-targetUrl"
                                value={targetUrl}
                                onChange={(e) => {
                                    setTargetUrl(e.target.value);
                                    setUrlError('');
                                }}
                                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                                    urlError ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="https://your-webhook-endpoint.com/webhook"
                                required
                            />
                            {urlError && (
                                <p className="mt-1 text-sm text-red-600">{urlError}</p>
                            )}
                        </div>

                        {/* Event Type */}
                        <div>
                            <label htmlFor="edit-eventType" className="block text-sm font-medium text-gray-700 mb-1">
                                Event Type
                            </label>
                            <select
                                id="edit-eventType"
                                value={eventType}
                                onChange={(e) => setEventType(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="Transaction">Transaction</option>
                                <option value="NFT Mint">NFT Mint</option>
                                <option value="Asset Move">Asset Move</option>
                            </select>
                        </div>

                        {/* Target Address (optional) */}
                        <div>
                            <label htmlFor="edit-targetAddress" className="block text-sm font-medium text-gray-700 mb-1">
                                Target Address <span className="text-gray-400">(optional)</span>
                            </label>
                            <input
                                type="text"
                                id="edit-targetAddress"
                                value={targetAddress}
                                onChange={(e) => setTargetAddress(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="addr1..."
                            />
                        </div>

                        {/* Policy ID (optional) */}
                        <div>
                            <label htmlFor="edit-policyId" className="block text-sm font-medium text-gray-700 mb-1">
                                Policy ID <span className="text-gray-400">(optional)</span>
                            </label>
                            <input
                                type="text"
                                id="edit-policyId"
                                value={policyId}
                                onChange={(e) => setPolicyId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Policy ID for filtering"
                            />
                        </div>

                        {/* Wallet Addresses (optional) */}
                        <div>
                            <label htmlFor="edit-walletAddresses" className="block text-sm font-medium text-gray-700 mb-1">
                                Wallet Addresses <span className="text-gray-400">(optional)</span>
                            </label>
                            <textarea
                                id="edit-walletAddresses"
                                value={walletAddressesText}
                                onChange={(e) => setWalletAddressesText(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs"
                                placeholder="addr1... or addr_test1...&#10;One per line or comma-separated&#10;Leave empty to listen to all addresses"
                            />
                            {walletAddressesText && (
                                <p className="mt-1 text-xs text-gray-500">
                                    {parseWalletAddresses(walletAddressesText).length} address(es) specified
                                </p>
                            )}
                        </div>

                        {/* Active Status */}
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="edit-isActive"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label htmlFor="edit-isActive" className="ml-2 block text-sm text-gray-700">
                                Active
                            </label>
                        </div>

                        {/* Secret Key (read-only) */}
                        <div className="bg-gray-50 rounded-md p-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Secret Key
                            </label>
                            <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded break-all">
                                {subscription.secretKey}
                            </code>
                            <p className="mt-1 text-xs text-gray-500">
                                Secret key cannot be changed. Use this to verify webhook signatures.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isValidatingUrl}
                                className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                                    isValidatingUrl
                                        ? 'bg-indigo-300 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                            >
                                {isValidatingUrl ? 'Validating URL...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Warning Modal for Unreachable URL */}
            {showValidationWarning && (
                <div className="fixed inset-0 z-[60] overflow-y-auto">
                    <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowValidationWarning(false)} />
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <div className="flex items-start mb-4">
                                <div className="flex-shrink-0">
                                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="ml-3 flex-1">
                                    <h3 className="text-lg font-medium text-gray-900">Cannot Save Changes</h3>
                                    <p className="mt-2 text-sm text-gray-600">{validationWarningMessage}</p>
                                    <p className="mt-2 text-sm text-gray-600">
                                        Please verify the webhook URL and try again.
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={() => setShowValidationWarning(false)}
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditSubscriptionModal;
