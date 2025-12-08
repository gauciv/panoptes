import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface SetupWizardProps {
  onComplete: () => void;
}

interface ValidationResult {
  isValid: boolean;
  chainTipSlot?: number;
  error?: string;
}

const NETWORK_ENDPOINTS: Record<string, string> = {
  Mainnet: 'https://cardano-mainnet.utxorpc-m1.demeter.run',
  Preprod: 'https://cardano-preprod.utxorpc-m1.demeter.run',
  Preview: 'https://cardano-preview.utxorpc-m1.demeter.run',
};

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [network, setNetwork] = useState<string>('Preprod');
  const [grpcEndpoint, setGrpcEndpoint] = useState<string>(NETWORK_ENDPOINTS.Preprod);
  const [apiKey, setApiKey] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleNetworkChange = (value: string) => {
    setNetwork(value);
    setGrpcEndpoint(NETWORK_ENDPOINTS[value] || '');
    setValidationResult(null); // Reset validation when network changes
  };

  const handleValidate = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setIsValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      console.log('Validating credentials...', { grpcEndpoint, network });
      const response = await fetch('/setup/validate-demeter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grpcEndpoint,
          apiKey,
          network,
        }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        const errorMsg = data.error || data.message || 'Validation failed';
        setValidationResult({
          isValid: false,
          error: errorMsg,
        });
        setError(errorMsg);
        return;
      }

      setValidationResult({
        isValid: true,
        chainTipSlot: data.chainTipSlot,
      });
    } catch (err) {
      console.error('Validation error:', err);
      let errorMessage = '🔌 Cannot connect to backend API';
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          errorMessage = '🔌 Backend API not responding. Please ensure:\n\n1. Backend is running: dotnet run --project Panoptes.Api\n2. Backend is accessible (check terminal for errors)\n3. Frontend dev server is running with proxy enabled';
        } else {
          errorMessage = `Error: ${err.message}`;
        }
      }
      setValidationResult({
        isValid: false,
        error: errorMessage,
      });
      setError(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!validationResult?.isValid) {
      setError('Please validate credentials first');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      console.log('Saving credentials...', { grpcEndpoint, network, apiKeyLength: apiKey.length });
      
      const response = await fetch('/setup/save-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grpcEndpoint,
          apiKey,
          network,
        }),
      });

      console.log('Save response status:', response.status);

      if (!response.ok) {
        const data = await response.json();
        console.error('Save failed:', data);
        setError(data.error || 'Failed to save credentials');
        return;
      }

      const result = await response.json();
      console.log('Save successful:', result);

      // Success - notify parent component
      onComplete();
    } catch (err) {
      let errorMessage = 'Network error';
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Cannot connect to backend API. Make sure the API is running on http://localhost:5186';
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onComplete}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to Panoptes
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Configure your Demeter credentials to start syncing blockchain data
          </p>
        </div>

        <div className="space-y-6">
          {/* Network Selection */}
          <div>
            <Label htmlFor="network" className="text-sm font-medium mb-2 block">
              Network
            </Label>
            <Select value={network} onValueChange={handleNetworkChange}>
              <SelectTrigger id="network">
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mainnet">🟢 Mainnet</SelectItem>
                <SelectItem value="Preprod">🔵 Preprod</SelectItem>
                <SelectItem value="Preview">🟣 Preview</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* gRPC Endpoint */}
          <div>
            <Label htmlFor="endpoint" className="text-sm font-medium mb-2 block">
              gRPC Endpoint
            </Label>
            <Input
              id="endpoint"
              type="text"
              value={grpcEndpoint}
              onChange={(e) => setGrpcEndpoint(e.target.value)}
              placeholder="https://cardano-preprod.utxorpc-m1.demeter.run"
              className="font-mono text-sm"
            />
          </div>

          {/* API Key */}
          <div>
            <Label htmlFor="apiKey" className="text-sm font-medium mb-2 block">
              Demeter API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="dmtr_utxorpc1..."
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Get your API key from{' '}
              <a
                href="https://demeter.run"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                demeter.run
              </a>
            </p>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <Alert
              variant={validationResult.isValid ? 'default' : 'destructive'}
              className={
                validationResult.isValid
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : ''
              }
            >
              <AlertDescription>
                {validationResult.isValid ? (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      ✓ Connection successful!
                    </span>
                    {validationResult.chainTipSlot && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Chain tip: {validationResult.chainTipSlot.toLocaleString()}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-red-600 dark:text-red-400">
                    ✗ {validationResult.error}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && !validationResult && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleValidate}
              disabled={isValidating || !apiKey.trim()}
              variant="outline"
              className="flex-1"
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>

            <Button
              onClick={handleSave}
              disabled={!validationResult?.isValid || isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save & Continue'
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              <strong>First time setup:</strong>
            </p>
            <ol className="text-sm text-blue-800 dark:text-blue-400 mt-2 space-y-1 list-decimal list-inside">
              <li>Visit demeter.run and create an account</li>
              <li>Navigate to the UtxoRPC service</li>
              <li>Copy your API key (starts with 'dmtr_utxorpc1...')</li>
              <li>Paste it above and click "Test Connection"</li>
              <li>Once validated, click "Save & Continue"</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
