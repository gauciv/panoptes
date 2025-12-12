import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

interface SetupStatus {
  isConfigured: boolean;
  network?: string;
  grpcEndpoint?: string;
  lastUpdated?: string;
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

export default function Settings() {
  const navigate = useNavigate();
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [network, setNetwork] = useState<string>('Preprod');
  const [grpcEndpoint, setGrpcEndpoint] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSetupStatus();
  }, []);

  const fetchSetupStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/setup/status');
      const data = await response.json();
      setSetupStatus(data);

      if (data.isConfigured) {
        setNetwork(data.network || 'Preprod');
        setGrpcEndpoint(data.grpcEndpoint || '');
      } else {
        setGrpcEndpoint(NETWORK_ENDPOINTS.Preprod);
      }
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNetworkChange = (value: string) => {
    setNetwork(value);
    setGrpcEndpoint(NETWORK_ENDPOINTS[value] || '');
    setValidationResult(null);
  };

  const handleValidate = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setIsValidating(true);
    setError(null);
    setSuccess(null);
    setValidationResult(null);

    try {
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

      const data = await response.json();

      if (!response.ok) {
        setValidationResult({
          isValid: false,
          error: data.error || 'Validation failed',
        });
        setError(data.error || 'Failed to validate credentials');
        return;
      }

      setValidationResult({
        isValid: true,
        chainTipSlot: data.chainTipSlot,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
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
    setSuccess(null);

    try {
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

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to save credentials');
        return;
      }

      setSuccess('Settings saved successfully! ArgusWorker will automatically reload the new configuration.');
      setApiKey(''); // Clear API key field for security
      setValidationResult(null);
      fetchSetupStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all credentials? This will stop the sync worker.')) {
      return;
    }

    try {
      const response = await fetch('/setup/clear-credentials', {
        method: 'DELETE',
      });

      if (!response.ok) {
        setError('Failed to clear credentials');
        return;
      }

      setSuccess('Credentials cleared successfully');
      setApiKey('');
      setValidationResult(null);
      fetchSetupStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="mr-4 text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Configuration Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Configuration Status</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`text-sm font-medium ${setupStatus?.isConfigured ? 'text-green-600' : 'text-red-600'}`}>
                {setupStatus?.isConfigured ? '✓ Configured' : '✗ Not Configured'}
              </span>
            </div>
            {setupStatus?.isConfigured && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Network:</span>
                  <span className="text-sm font-medium text-gray-900">{setupStatus.network}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Endpoint:</span>
                  <span className="text-sm font-mono text-gray-900 truncate max-w-md">
                    {setupStatus.grpcEndpoint}
                  </span>
                </div>
                {setupStatus.lastUpdated && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Updated:</span>
                    <span className="text-sm text-gray-900">
                      {new Date(setupStatus.lastUpdated).toLocaleString()}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Onboarding Tutorial Button */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              onClick={() => {
                localStorage.removeItem('panoptes_onboarding_completed');
                navigate('/dashboard');
              }}
              variant="outline"
              className="w-full"
            >
              Launch Tutorial
            </Button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && !validationResult && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Demeter Credentials Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">
            {setupStatus?.isConfigured ? 'Update Demeter Credentials' : 'Configure Demeter Credentials'}
          </h2>

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
                placeholder={setupStatus?.isConfigured ? 'Enter new API key to update...' : 'dmtr_utxorpc1...'}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your API key from{' '}
                <a
                  href="https://demeter.run"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
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
                    ? 'bg-green-50 border-green-200'
                    : ''
                }
              >
                <AlertDescription>
                  {validationResult.isValid ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-green-800 font-medium">
                        Connection successful!
                      </span>
                      {validationResult.chainTipSlot && (
                        <span className="text-sm text-green-700">
                          Chain tip: {validationResult.chainTipSlot.toLocaleString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-red-800">
                        {validationResult.error}
                      </span>
                    </div>
                  )}
                </AlertDescription>
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
                  'Save & Apply'
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        {setupStatus?.isConfigured && (
          <div className="bg-white rounded-lg shadow p-6 border-2 border-red-200">
            <h2 className="text-lg font-medium text-red-900 mb-4">Danger Zone</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Clear All Credentials</p>
                <p className="text-sm text-gray-600 mt-1">
                  Remove all stored credentials and stop the sync worker
                </p>
              </div>
              <Button variant="destructive" onClick={handleClear}>
                Clear Credentials
              </Button>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-6">
          <p className="text-sm text-blue-900 font-medium">
            About Network Switching
          </p>
          <p className="text-sm text-blue-800 mt-2">
            When you change networks or update credentials, ArgusWorker will automatically reload the configuration within 30 seconds. Your sync checkpoint is saved, so you won't lose any progress.
          </p>
        </div>
      </main>
    </div>
  );
}
