import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    <div className="fixed inset-0 bg-[rgba(5,5,5,0.85)] flex items-center justify-center z-[1100] p-4">
      <div className="bg-[#050505] border border-[#006A33] text-[#F8F8FF] p-8 max-w-2xl w-full mx-4 relative max-h-[90vh] overflow-y-auto rounded-none shadow-[0_0_20px_rgba(0,106,51,0.3)] font-mono">
        {/* Grid Background Effect */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#006A33 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>
        
        <button
          onClick={onComplete}
          className="absolute top-4 right-4 text-[#006A33] hover:text-white transition-colors p-1 z-10"
          aria-label="Close"
          title="Skip Setup"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b border-[#006A33]/30 pb-2 relative z-10">
          <span className="text-[#006A33] text-xs tracking-widest uppercase font-bold">
            SYSTEM_CONFIG // DEMETER_SETUP
          </span>
        </div>
        
        <div className="mb-6 relative z-10">
          <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">
            Initialize_Connection
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            Configure your Demeter credentials to establish blockchain data sync.
          </p>
        </div>

        <div className="space-y-6 relative z-10">
          {/* Network Selection */}
          <div>
            <Label htmlFor="network" className="text-xs font-bold mb-2 block text-[#006A33] uppercase tracking-wider">
              Network
            </Label>
            <Select value={network} onValueChange={handleNetworkChange}>
              <SelectTrigger id="network" className="bg-[#0a0a0a] border-[#006A33]/50 text-white font-mono text-sm hover:border-[#006A33] focus:border-[#006A33] focus:ring-[#006A33]/20">
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-[#006A33]/50">
                <SelectItem value="Mainnet" className="text-white hover:bg-[#006A33]/20 focus:bg-[#006A33]/20">🟢 Mainnet</SelectItem>
                <SelectItem value="Preprod" className="text-white hover:bg-[#006A33]/20 focus:bg-[#006A33]/20">🔵 Preprod</SelectItem>
                <SelectItem value="Preview" className="text-white hover:bg-[#006A33]/20 focus:bg-[#006A33]/20">🟣 Preview</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* gRPC Endpoint */}
          <div>
            <Label htmlFor="endpoint" className="text-xs font-bold mb-2 block text-[#006A33] uppercase tracking-wider">
              gRPC Endpoint
            </Label>
            <Input
              id="endpoint"
              type="text"
              value={grpcEndpoint}
              onChange={(e) => setGrpcEndpoint(e.target.value)}
              placeholder="https://cardano-preprod.utxorpc-m1.demeter.run"
              className="bg-[#0a0a0a] border-[#006A33]/50 text-white font-mono text-sm placeholder:text-gray-500 hover:border-[#006A33] focus:border-[#006A33] focus:ring-[#006A33]/20"
            />
          </div>

          {/* API Key */}
          <div>
            <Label htmlFor="apiKey" className="text-xs font-bold mb-2 block text-[#006A33] uppercase tracking-wider">
              Demeter API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="dmtr_utxorpc1..."
              className="bg-[#0a0a0a] border-[#006A33]/50 text-white font-mono text-sm placeholder:text-gray-500 hover:border-[#006A33] focus:border-[#006A33] focus:ring-[#006A33]/20"
            />
            <p className="text-xs text-gray-400 mt-1">
              Get your API key from{' '}
              <a
                href="https://demeter.run"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#006A33] hover:text-[#008040] hover:underline"
              >
                demeter.run
              </a>
            </p>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div
              className={`border p-4 ${
                validationResult.isValid
                  ? 'bg-[#006A33]/10 border-[#006A33]/50'
                  : 'bg-red-900/20 border-red-500/50'
              }`}
            >
              <div className="text-sm">
                {validationResult.isValid ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[#006A33] font-bold">
                      ✓ CONNECTION_ESTABLISHED
                    </span>
                    {validationResult.chainTipSlot && (
                      <span className="text-sm text-gray-400">
                        Chain tip: {validationResult.chainTipSlot.toLocaleString()}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-red-400">
                    ✗ {validationResult.error}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && !validationResult && (
            <div className="border border-red-500/50 bg-red-900/20 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleValidate}
              disabled={isValidating || !apiKey.trim()}
              className="flex-1 px-4 py-2 text-xs font-bold text-[#006A33] border border-[#006A33] hover:bg-[#006A33] hover:text-white transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  VALIDATING...
                </>
              ) : (
                'TEST_CONNECTION'
              )}
            </button>

            <button
              onClick={handleSave}
              disabled={!validationResult?.isValid || isSaving}
              className="flex-1 px-6 py-2 text-xs font-bold bg-[#006A33] text-white hover:bg-[#008040] transition-all uppercase tracking-wider shadow-[0_0_10px_rgba(0,106,51,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  SAVING...
                </>
              ) : (
                'SAVE_&_CONTINUE >'
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="bg-[#006A33]/10 border border-[#006A33]/30 p-4">
            <p className="text-xs text-[#006A33] font-bold uppercase tracking-wider mb-2">
              First Time Setup:
            </p>
            <ol className="text-sm text-gray-300 mt-2 space-y-1 list-decimal list-inside">
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
