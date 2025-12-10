import React, { useState, useEffect } from 'react';

interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; targetUrl: string; eventType: string; walletAddresses?: string[] }) => void;
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
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [eventType, setEventType] = useState('Transaction');
  const [walletAddressesText, setWalletAddressesText] = useState('');
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const [validationWarningMessage, setValidationWarningMessage] = useState('');

  useEffect(() => {
    if (isOpen && initialValues) {
      if (initialValues.name) setName(initialValues.name);
      if (initialValues.eventType) setEventType(initialValues.eventType);
    } else if (isOpen && !initialValues) {
      // Reset if no initial values (optional, or keep previous state if desired, but usually reset on open)
      // For now, I'll just handle setting initial values.
    }
  }, [isOpen, initialValues]);

  const isValidUrl = (url: string): boolean => {
    return url.startsWith('http://') || url.startsWith('https://');
  };

  const parseWalletAddresses = (text: string): string[] => {
    if (!text.trim()) return [];
    return text
      .split(/[,\n]+/)  // Split by comma or newline
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);
  };

  const isFormValid = name.trim().length > 0 && isValidUrl(targetUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    // Validate URL before creating subscription
    setIsValidatingUrl(true);

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
        // Show warning modal
        setValidationWarningMessage(result.message || 'The webhook URL appears to be unreachable. Are you sure you want to create this subscription?');
        setShowValidationWarning(true);
        setIsValidatingUrl(false);
        return;
      }

      // URL is valid, proceed with creation
      setIsValidatingUrl(false);
      createSubscription();
    } catch (err) {
      setIsValidatingUrl(false);
      const errorMessage = err instanceof Error && err.name === 'AbortError'
        ? 'Validation timed out after 10 seconds. The webhook URL may be slow or unreachable. Do you want to create this subscription anyway?'
        : 'Failed to validate URL. Are you sure you want to create this subscription?';
      setValidationWarningMessage(errorMessage);
      setShowValidationWarning(true);
    }
  };

  const createSubscription = () => {
    const walletAddresses = parseWalletAddresses(walletAddressesText);

    onCreate({
      name: name.trim(),
      targetUrl: targetUrl.trim(),
      eventType,
      walletAddresses: walletAddresses.length > 0 ? walletAddresses : undefined,
    });

    // Reset form
    setName('');
    setTargetUrl('');
    setEventType('Transaction');
    setWalletAddressesText('');
    setIsValidatingUrl(false);
    setShowValidationWarning(false);
  };

  const handleClose = () => {
    setName('');
    setTargetUrl('');
    setEventType('Transaction');
    setWalletAddressesText('');
    setIsValidatingUrl(false);
    setShowValidationWarning(false);
    onClose();
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              New Subscription
            </h3>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="My Webhook"
                  autoFocus
                />
              </div>

              {/* Target URL Field */}
              <div>
                <label htmlFor="targetUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  Target URL
                </label>
                <input
                  type="text"
                  id="targetUrl"
                  value={targetUrl}
                  onChange={(e) => {
                    setTargetUrl(e.target.value);
                  }}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    targetUrl && !isValidUrl(targetUrl) 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="https://api.mysite.com/webhook"
                />
                {targetUrl && !isValidUrl(targetUrl) && (
                  <p className="mt-1 text-sm text-red-600">
                    URL must start with http:// or https://
                  </p>
                )}
              </div>

              {/* Event Type Dropdown */}
              <div>
                <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type
                </label>
                <select
                  id="eventType"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="Transaction">Transaction</option>
                  <option value="NFT Mint">NFT Mint</option>
                  <option value="Asset Move">Asset Move</option>
                </select>
              </div>

              {/* Wallet Addresses (Optional) */}
              <div>
                <label htmlFor="walletAddresses" className="block text-sm font-medium text-gray-700 mb-1">
                  Wallet Addresses (Optional)
                </label>
                <textarea
                  id="walletAddresses"
                  value={walletAddressesText}
                  onChange={(e) => setWalletAddressesText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs"
                  placeholder="addr1... or addr_test1...\nOne per line or comma-separated\nLeave empty to listen to all addresses"
                />
                {walletAddressesText && (
                  <p className="mt-1 text-xs text-gray-500">
                    {parseWalletAddresses(walletAddressesText).length} address(es) specified
                  </p>
                )}
              </div>

              {/* Info about Secret Key */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex">
                  <svg className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-blue-700">
                    A secure secret key will be automatically generated for webhook signature verification.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isFormValid || isValidatingUrl}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  isFormValid && !isValidatingUrl
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-indigo-300 cursor-not-allowed'
                }`}
              >
                {isValidatingUrl ? 'Validating URL...' : 'Create'}
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
                  <h3 className="text-lg font-medium text-gray-900">Cannot Create Subscription</h3>
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

export default CreateSubscriptionModal;
