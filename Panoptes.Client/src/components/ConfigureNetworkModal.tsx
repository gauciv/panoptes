import { useState } from 'react';
import { 
  Loader2, 
  Server, 
  CheckCircle2, 
  XCircle, 
  Save,
  RefreshCw,
  Terminal,
  Eye,
  EyeOff,
  X,
  BookOpen,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ConfigureNetworkModalProps {
  networkId: string;
  networkLabel: string;
  initialEndpoint: string;
  onClose: () => void;
  onSaveSuccess: () => void;
}

interface ValidationResult {
  isValid: boolean;
  chainTipSlot?: number;
  error?: string;
}

export function ConfigureNetworkModal({ 
  networkId, 
  networkLabel, 
  initialEndpoint, 
  onClose,
  onSaveSuccess
}: ConfigureNetworkModalProps) {
  const [grpcEndpoint, setGrpcEndpoint] = useState(initialEndpoint);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // 1. VALIDATE CREDENTIALS
  const handleValidate = async () => {
    if (!apiKey.trim()) {
      toast.error('API Key is required');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch('/setup/validate-demeter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            grpcEndpoint, 
            apiKey, 
            network: networkId 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || data.message || 'Validation Failed';
        setValidationResult({ isValid: false, error: errorMsg });
      } else {
        if (!data.chainTipSlot || data.chainTipSlot <= 0) {
            setValidationResult({ 
                isValid: false, 
                error: 'Connection rejected by provider (Invalid Key)' 
            });
        } else {
            setValidationResult({ isValid: true, chainTipSlot: data.chainTipSlot });
        }
      }
    } catch (err) {
      setValidationResult({ isValid: false, error: 'Network unavailable' });
    } finally {
      setIsValidating(false);
    }
  };

  // 2. SAVE CREDENTIALS
  const handleSave = async () => {
    if (!validationResult?.isValid) {
      toast.error('Please validate connection first');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/setup/save-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            grpcEndpoint, 
            apiKey, 
            network: networkId 
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      onSaveSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[1100] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 w-full max-w-4xl shadow-2xl rounded-sm overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-md text-indigo-500">
               <Server className="w-5 h-5" />
            </div>
            <div>
               <h2 className="text-sm font-bold font-mono uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
                 Configure {networkLabel}
               </h2>
               <p className="text-[10px] text-zinc-500 font-mono">Update UTxORPC Connection Details</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Split Content Area */}
        <div className="flex flex-col md:flex-row h-full overflow-hidden">
            
            {/* LEFT: Form Section */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto border-r border-zinc-200 dark:border-zinc-800">
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label className="text-xs font-mono font-bold uppercase text-zinc-500">Provider Endpoint (UTxORPC)</Label>
                        <div className="relative">
                            <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <Input
                                value={grpcEndpoint}
                                onChange={(e) => setGrpcEndpoint(e.target.value)}
                                className="pl-9 font-mono text-sm border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs font-mono font-bold uppercase text-zinc-500">Demeter API Token</Label>
                        </div>
                        <div className="relative">
                            <Input
                                type={showApiKey ? "text" : "password"}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="font-mono text-sm border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 pr-10 dark:text-zinc-100"
                                placeholder="utxorpc..." 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowApiKey(!showApiKey)} 
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                            >
                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Validation Result Box */}
                    {validationResult && (
                        <div className={cn(
                            "p-3 rounded-md text-xs font-mono border flex items-center gap-2",
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
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 flex gap-3">
                    <Button 
                        onClick={handleValidate} 
                        disabled={isValidating || !apiKey.trim()} 
                        variant="outline" 
                        className="flex-1 font-mono text-xs uppercase border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        {isValidating ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RefreshCw className="w-3 h-3 mr-2" />}
                        Test Connection
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={!validationResult?.isValid || isSaving} 
                        // ✅ MODIFIED: Using Emerald-600 for the Primary Brand Color in Dark Mode
                        className="flex-1 font-mono text-xs uppercase bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Save className="w-3 h-3 mr-2" />}
                        Save Config
                    </Button>
                </div>
            </div>

            {/* RIGHT: Guide Section */}
            <div className="w-full md:w-[350px] bg-zinc-50/50 dark:bg-zinc-900/30 p-6 flex flex-col gap-6 overflow-y-auto">
                <div className="space-y-2">
                    <h4 className="text-xs font-bold font-mono uppercase text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> Setup Guide
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        You are configuring the <strong>{networkLabel}</strong> profile. Panoptes utilizes <strong>UTxORPC</strong> for high-speed blockchain synchronization.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="relative pl-4 border-l-2 border-indigo-500/30 dark:border-indigo-500/20">
                        <span className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-indigo-500"></span>
                        <h5 className="text-[10px] font-bold font-mono uppercase text-indigo-600 dark:text-indigo-400 mb-1">Step 01</h5>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                             Go to <a href="https://demeter.run" target="_blank" className="underline hover:text-indigo-500">Demeter.run <ExternalLink className="w-3 h-3 inline"/></a>
                        </p>
                    </div>
                    
                    <div className="relative pl-4 border-l-2 border-indigo-500/30 dark:border-indigo-500/20">
                        <span className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-indigo-500"></span>
                        <h5 className="text-[10px] font-bold font-mono uppercase text-indigo-600 dark:text-indigo-400 mb-1">Step 02</h5>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            Create a new project on <strong>{networkLabel}</strong>.
                        </p>
                    </div>

                    <div className="relative pl-4 border-l-2 border-indigo-500/30 dark:border-indigo-500/20">
                         <span className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-indigo-500"></span>
                        <h5 className="text-[10px] font-bold font-mono uppercase text-indigo-600 dark:text-indigo-400 mb-1">Step 03</h5>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            Navigate to <strong>Ports</strong>. Click "Add Products" and select <strong>UtxoRPC</strong>.
                        </p>
                    </div>

                    <div className="relative pl-4 border-l-2 border-indigo-500/30 dark:border-indigo-500/20">
                        <span className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-indigo-500"></span>
                        <h5 className="text-[10px] font-bold font-mono uppercase text-indigo-600 dark:text-indigo-400 mb-1">Step 04</h5>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            Deploy the port, then copy the <strong>API Key</strong> (starts with <code>utxorpc_</code>) into the form on the left.
                        </p>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}