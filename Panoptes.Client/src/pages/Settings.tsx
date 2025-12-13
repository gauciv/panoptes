import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Github, 
  Server, 
  Shield, 
  Terminal, 
  Save, 
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Results
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
      setError('Failed to load system configuration.');
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
      setError('API_KEY_REQUIRED');
      return;
    }

    setIsValidating(true);
    setError(null);
    setSuccess(null);
    setValidationResult(null);

    try {
      const response = await fetch('/setup/validate-demeter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grpcEndpoint, apiKey, network }),
      });

      const data = await response.json();

      if (!response.ok) {
        setValidationResult({ isValid: false, error: data.error || 'Validation failed' });
        setError(data.error || 'CREDENTIAL_VALIDATION_FAILED');
        return;
      }

      setValidationResult({ isValid: true, chainTipSlot: data.chainTipSlot });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'NETWORK_ERROR';
      setValidationResult({ isValid: false, error: errorMessage });
      setError(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!validationResult?.isValid) {
      setError('VALIDATION_REQUIRED_BEFORE_SAVE');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/setup/save-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grpcEndpoint, apiKey, network }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'SAVE_OPERATION_FAILED');
        return;
      }

      setSuccess('CONFIGURATION_SAVED: ArgusWorker restarting...');
      setApiKey(''); 
      setValidationResult(null);
      fetchSetupStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'NETWORK_ERROR');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('CONFIRM_RESET: This will wipe all stored credentials and halt sync operations. Continue?')) {
      return;
    }

    try {
      const response = await fetch('/setup/clear-credentials', { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to clear credentials');

      setSuccess('SYSTEM_RESET_SUCCESSFUL');
      setApiKey('');
      setValidationResult(null);
      fetchSetupStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'RESET_FAILED');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">Loading_Config_Module...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 pb-20">
      
      {/* Main Container - Aligned with Dashboard Padding */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* 1. Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold font-mono uppercase tracking-tight flex items-center gap-2">
                <Terminal className="w-6 h-6 text-zinc-500" />
                System_Configuration
              </h1>
              <p className="text-xs font-mono text-zinc-500 mt-1">
                VERSION: v1.2.0 | BUILD_8821
              </p>
            </div>
          </div>
        </div>

        {/* 2. System Status Panel */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] overflow-hidden">
                    <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
                        <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">Telemetry Status</h2>
                        <div className={`flex items-center gap-2 px-2 py-1 rounded-full border ${setupStatus?.isConfigured ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800'}`}>
                            <div className={`w-2 h-2 rounded-full ${setupStatus?.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className="text-[10px] font-mono font-bold uppercase">{setupStatus?.isConfigured ? 'SYSTEM_ONLINE' : 'CONFIGURATION_MISSING'}</span>
                        </div>
                    </div>
                    
                    {setupStatus?.isConfigured ? (
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div>
                                <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Active Network</span>
                                <div className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-indigo-500" />
                                    {setupStatus.network}
                                </div>
                            </div>
                            <div className="sm:col-span-2">
                                <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">gRPC Endpoint</span>
                                <div className="font-mono text-sm text-zinc-600 dark:text-zinc-400 truncate bg-zinc-50 dark:bg-black p-1.5 rounded border border-zinc-100 dark:border-zinc-800">
                                    {setupStatus.grpcEndpoint}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-50" />
                            <p className="text-sm text-zinc-500 font-mono">No active configuration found. Please setup credentials below.</p>
                        </div>
                    )}
                </div>
            </div>
        </section>

        {/* 3. Messages Area */}
        {(success || error) && (
            <div className={`border-l-4 p-4 font-mono text-xs shadow-sm animate-in slide-in-from-top-2 ${success ? 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 border-rose-500 text-rose-800 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                <div className="flex items-start gap-3">
                    {success ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <XCircle className="w-4 h-4 mt-0.5" />}
                    <div>
                        <span className="font-bold block mb-0.5">{success ? 'SUCCESS' : 'ERROR'}</span>
                        {success || error}
                    </div>
                </div>
            </div>
        )}

        {/* 4. Main Configuration Form */}
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)]">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono uppercase tracking-wide flex items-center gap-2">
                    <Server className="w-4 h-4 text-zinc-500" />
                    Connection Protocol
                </h2>
            </div>

            <div className="p-6 space-y-8">
                
                {/* Network Select */}
                <div className="grid gap-2">
                    <Label className="text-xs font-mono font-bold uppercase text-zinc-500">Blockchain Network</Label>
                    <Select value={network} onValueChange={handleNetworkChange}>
                        <SelectTrigger className="font-mono text-sm border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 focus:ring-zinc-900 dark:focus:ring-zinc-100 w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="font-mono">
                            <SelectItem value="Mainnet"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Mainnet</span></SelectItem>
                            <SelectItem value="Preprod"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" /> Preprod</span></SelectItem>
                            <SelectItem value="Preview"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500" /> Preview</span></SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Endpoint Input */}
                <div className="grid gap-2">
                    <Label className="text-xs font-mono font-bold uppercase text-zinc-500">gRPC Provider Endpoint</Label>
                    <Input
                        value={grpcEndpoint}
                        onChange={(e) => setGrpcEndpoint(e.target.value)}
                        className="font-mono text-sm border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 focus-visible:ring-zinc-900"
                        placeholder="https://..."
                    />
                </div>

                {/* API Key Input */}
                <div className="grid gap-2">
                    <div className="flex justify-between items-center">
                        <Label className="text-xs font-mono font-bold uppercase text-zinc-500">Demeter API Token</Label>
                        <a href="https://demeter.run" target="_blank" rel="noreferrer" className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                            GET_TOKEN <ArrowLeft className="w-3 h-3 rotate-135" />
                        </a>
                    </div>
                    <div className="relative">
                        <Input
                            type={showApiKey ? "text" : "password"}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="font-mono text-sm border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 pr-10 focus-visible:ring-zinc-900"
                            placeholder={setupStatus?.isConfigured ? "Enter new key to overwrite..." : "dmtr_utxorpc1..."}
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

                {/* Validation Output */}
                {validationResult && (
                    <div className={`p-4 border rounded-sm font-mono text-xs ${validationResult.isValid ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-900' : 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-900'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            {validationResult.isValid ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                            <span className="font-bold">{validationResult.isValid ? 'CONNECTION_ESTABLISHED' : 'CONNECTION_REFUSED'}</span>
                        </div>
                        {validationResult.isValid && validationResult.chainTipSlot && (
                            <div className="ml-6 text-emerald-700 dark:text-emerald-400">
                                &gt; CHAIN_TIP_SYNCED: {validationResult.chainTipSlot}
                            </div>
                        )}
                        {!validationResult.isValid && (
                            <div className="ml-6 text-rose-700 dark:text-rose-400">
                                &gt; ERR: {validationResult.error}
                            </div>
                        )}
                    </div>
                )}

                {/* Actions Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <Button
                        onClick={handleValidate}
                        disabled={isValidating || !apiKey.trim()}
                        variant="outline"
                        className="flex-1 font-mono text-xs uppercase tracking-wider border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                        {isValidating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        {isValidating ? 'Testing_Connection...' : 'Test_Connection'}
                    </Button>

                    <Button
                        onClick={handleSave}
                        disabled={!validationResult?.isValid || isSaving}
                        className="flex-1 font-mono text-xs uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:disabled:bg-zinc-900 dark:disabled:text-zinc-400"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {isSaving ? 'Saving_Config...' : 'Save_&_Apply'}
                    </Button>
                </div>
            </div>
        </section>

        {/* 5. Help & Danger Zone (Grid) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Help Panel */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-sm p-6">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono uppercase mb-4 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-zinc-500" />
                    Documentation
                </h3>
                <div className="space-y-3">
                    <Button
                        variant="outline"
                        onClick={() => {
                            localStorage.removeItem('panoptes_onboarding_completed');
                            navigate('/dashboard');
                        }}
                        className="w-full justify-between font-mono text-xs border-zinc-200 dark:border-zinc-700"
                    >
                        <span>Replay_Product_Tour</span>
                        <ArrowLeft className="w-3 h-3 rotate-180" />
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => window.open('https://github.com/gauciv/panoptes/issues', '_blank')}
                        className="w-full justify-between font-mono text-xs border-zinc-200 dark:border-zinc-700"
                    >
                        <span className="flex items-center gap-2"><Github className="w-3 h-3" /> Report_Bug</span>
                        <ArrowLeft className="w-3 h-3 rotate-180" />
                    </Button>
                </div>
            </div>

            {/* Danger Zone */}
            {setupStatus?.isConfigured && (
                <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900 rounded-sm shadow-sm p-6">
                    <h3 className="text-sm font-bold text-rose-900 dark:text-rose-400 font-mono uppercase mb-4 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Danger_Zone
                    </h3>
                    <p className="text-xs text-rose-800 dark:text-rose-300 font-mono mb-4">
                        Executing this command will wipe local credentials and halt the synchronization worker immediately.
                    </p>
                    <Button 
                        variant="destructive" 
                        onClick={handleClear}
                        className="w-full font-mono text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white"
                    >
                        Purge_Credentials
                    </Button>
                </div>
            )}
        </section>

        {/* Footer Note */}
        <div className="text-center font-mono text-[10px] text-zinc-400 uppercase tracking-widest mt-12">
            System will auto-reload config within 30s of change
        </div>

      </div>
    </div>
  );
}