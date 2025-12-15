import { useState } from 'react';
import { 
  Loader2, 
  Server, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  Shield,
  Terminal 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface SetupWizardProps {
  onComplete: () => void;
  onClose?: () => void;
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

export function SetupWizard({ onComplete, onClose }: SetupWizardProps) {
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
    setValidationResult(null);
  };

  const handleValidate = async () => {
    if (!apiKey.trim()) {
      setError('API_KEY_REQUIRED');
      return;
    }

    setIsValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      const response = await fetch('/setup/validate-demeter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grpcEndpoint, apiKey, network }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || data.message || 'Validation failed';
        setValidationResult({ isValid: false, error: errorMsg });
        setError(errorMsg);
        return;
      }

      setValidationResult({ isValid: true, chainTipSlot: data.chainTipSlot });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setValidationResult({ isValid: false, error: msg });
      setError(msg);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!validationResult?.isValid) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/setup/save-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grpcEndpoint, apiKey, network }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      await fetch('/setup/switch-network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network }),
      });

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    // Modal Overlay: z-[1100]
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[1100] p-4">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 w-full max-w-lg shadow-2xl rounded-sm overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-md text-indigo-500">
               <Server className="w-5 h-5" />
            </div>
            <div>
               <h2 className="text-sm font-bold font-mono uppercase tracking-wide text-zinc-900 dark:text-zinc-100">System Initialization</h2>
               <p className="text-[10px] text-zinc-500 font-mono">Configure Primary Network Connection</p>
            </div>
          </div>
          {onClose && (
             <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">✕</button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
           {/* Info Banner */}
           <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900 p-4 rounded-sm flex gap-3">
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                 <h3 className="text-xs font-bold text-indigo-700 dark:text-indigo-300 font-mono uppercase">Credential Required</h3>
                 <p className="text-xs text-indigo-600/80 dark:text-indigo-400/70 leading-relaxed">
                    Panoptes requires a UtxoRPC connection to sync with the blockchain. Please provide your Demeter API key to continue.
                 </p>
              </div>
           </div>

           {/* Form */}
           <div className="space-y-4">
              <div className="space-y-1.5">
                 <Label className="text-xs font-bold text-zinc-500 uppercase">Select Network</Label>
                 <Select value={network} onValueChange={handleNetworkChange}>
                    <SelectTrigger className="font-mono text-sm bg-zinc-50 dark:bg-black border-zinc-200 dark:border-zinc-800 dark:text-zinc-100">
                       <SelectValue />
                    </SelectTrigger>
                    {/* ✅ FIX 1: Use !z-[9999] to force it above everything */}
                    <SelectContent className="font-mono !z-[9999] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                       <SelectItem value="Mainnet">Mainnet</SelectItem>
                       <SelectItem value="Preprod">Preprod</SelectItem>
                       <SelectItem value="Preview">Preview</SelectItem>
                    </SelectContent>
                 </Select>
              </div>

              <div className="space-y-1.5">
                 <Label className="text-xs font-bold text-zinc-500 uppercase">Provider Endpoint</Label>
                 <div className="relative">
                    <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input 
                       value={grpcEndpoint}
                       onChange={(e) => setGrpcEndpoint(e.target.value)}
                       className="pl-9 font-mono text-sm bg-zinc-50 dark:bg-black border-zinc-200 dark:border-zinc-800 dark:text-zinc-100"
                    />
                 </div>
              </div>

              <div className="space-y-1.5">
                 <div className="flex justify-between">
                    <Label className="text-xs font-bold text-zinc-500 uppercase">API Key</Label>
                    <a href="https://demeter.run" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-500 hover:underline">Get Key →</a>
                 </div>
                 <Input 
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="dmtr_utxorpc1..."
                    className="font-mono text-sm bg-zinc-50 dark:bg-black border-zinc-200 dark:border-zinc-800 dark:text-zinc-100"
                 />
              </div>
           </div>

           {/* Validation Status */}
           {validationResult && (
              <div className={cn(
                 "p-3 rounded-sm border text-xs font-mono flex items-center gap-2",
                 validationResult.isValid 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-900 dark:text-emerald-400"
                    : "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/10 dark:border-rose-900 dark:text-rose-400"
              )}>
                 {validationResult.isValid ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                 <span>
                    {validationResult.isValid 
                       ? `Connection Verified (Tip: ${validationResult.chainTipSlot})` 
                       : validationResult.error}
                 </span>
              </div>
           )}

           {/* Error Banner (use the 'error' state so it's no longer unused) */}
           {error && (!validationResult || validationResult.isValid) && (
              <div className="p-3 rounded-sm border text-xs font-mono flex items-center gap-2 bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/10 dark:border-rose-900 dark:text-rose-400">
                 <XCircle className="w-4 h-4" />
                 <span>{error}</span>
              </div>
           )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-0 flex gap-3">
           <Button 
              type="button" // Prevent default submit behavior
              // ✅ FIX 2: Explicit background and text colors to fix "Invisible Button"
              className="flex-1 font-mono text-xs uppercase bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={handleValidate}
              disabled={isValidating || !apiKey.trim()}
           >
              {isValidating ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
              Test Connection
           </Button>
           
           <Button 
              type="button"
              className="flex-1 font-mono text-xs uppercase bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200"
              onClick={handleSave}
              disabled={!validationResult?.isValid || isSaving}
           >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <ArrowRight className="w-3 h-3 mr-2" />}
              Save & Initialize
           </Button>
        </div>

      </div>
    </div>
  );
}