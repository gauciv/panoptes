import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Github, 
  Shield, 
  Terminal, 
  Save, 
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  Settings as SettingsIcon,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// --- Types ---
interface SetupStatus {
  isConfigured: boolean;
  activeNetwork?: string;
  activeEndpoint?: string;
  configuredNetworks: string[]; // List of networks that have keys stored
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

const NETWORKS = [
    { id: 'Mainnet', label: 'Mainnet', color: 'bg-emerald-500', border: 'border-emerald-500/20' },
    { id: 'Preprod', label: 'Preprod', color: 'bg-blue-500', border: 'border-blue-500/20' },
    { id: 'Preview', label: 'Preview', color: 'bg-purple-500', border: 'border-purple-500/20' },
];

export default function Settings() {
  const navigate = useNavigate();
  
  // System State
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State (For the currently editing network)
  const [editingNetwork, setEditingNetwork] = useState<string | null>(null);
  const [grpcEndpoint, setGrpcEndpoint] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Operation States
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  
  // Feedback
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  useEffect(() => {
    fetchSetupStatus();
  }, []);

  const fetchSetupStatus = async () => {
    try {
      const response = await fetch('/setup/status');
      const data = await response.json();
      setSetupStatus(data);
    } catch (err) {
      toast.error('Failed to load system status');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (networkId: string) => {
    setEditingNetwork(networkId);
    setGrpcEndpoint(NETWORK_ENDPOINTS[networkId] || '');
    setApiKey(''); // Always clear for security
    setValidationResult(null);
  };

  const cancelEditing = () => {
    setEditingNetwork(null);
    setApiKey('');
    setValidationResult(null);
  };

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
            network: editingNetwork 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setValidationResult({ isValid: false, error: data.error || data.message });
      } else if (!data.isValid) {
        setValidationResult({ isValid: false, error: data.message });
      } else {
        setValidationResult({ isValid: true, chainTipSlot: data.chainTipSlot });
      }
    } catch (err) {
      setValidationResult({ isValid: false, error: 'Network Error' });
    } finally {
      setIsValidating(false);
    }
  };

  // 2. SAVE CREDENTIALS (Upsert)
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
            network: editingNetwork 
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      toast.success(`Configuration for ${editingNetwork} saved!`);
      setEditingNetwork(null);
      fetchSetupStatus();
      
      // Update LocalStorage for Client SideNav consistency
      if (setupStatus?.activeNetwork === editingNetwork) {
          localStorage.setItem('panoptes-network', editingNetwork);
      }
      
    } catch (err) {
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // 3. SWITCH NETWORK
  const handleSwitch = async (targetNetwork: string) => {
    if (isSwitching) return;
    
    setIsSwitching(targetNetwork);
    const toastId = toast.loading(`Switching to ${targetNetwork}...`);
    
    try {
      const response = await fetch('/setup/switch-network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network: targetNetwork }),
      });
      
      if (!response.ok) throw new Error('Switch failed');

      toast.success(`Active Network: ${targetNetwork}`, { id: toastId });
      localStorage.setItem('panoptes-network', targetNetwork); // Sync Client Side
      fetchSetupStatus();
    } catch (e) {
      toast.error('Failed to switch network', { id: toastId });
    } finally {
        setIsSwitching(null);
    }
  };

  const handleClear = async () => {
    if (!confirm('DANGER: This will wipe ALL credentials for ALL networks. Continue?')) return;

    try {
      await fetch('/setup/clear-credentials', { method: 'DELETE' });
      toast.success('System reset successful');
      fetchSetupStatus();
    } catch (err) {
      toast.error('Reset failed');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">Loading_System_Config...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div>
            <h1 className="text-xl font-bold font-mono uppercase tracking-tight flex items-center gap-2">
              <Terminal className="w-6 h-6 text-zinc-500" />
              Network_Manager
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-1">
               Manage connections to different Cardano networks.
            </p>
          </div>
          
          {/* Active Badge */}
          {setupStatus?.activeNetwork && (
             <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Current:</span>
                <span className="text-xs font-bold font-mono text-indigo-500">{setupStatus.activeNetwork}</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             </div>
          )}
        </div>

        {/* Network Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {NETWORKS.map((net) => {
                const isConfigured = setupStatus?.configuredNetworks.includes(net.id);
                const isActive = setupStatus?.activeNetwork === net.id;
                const isEditing = editingNetwork === net.id;

                return (
                    <div 
                        key={net.id} 
                        className={cn(
                            "relative flex flex-col bg-white dark:bg-zinc-900 border rounded-sm transition-all duration-300",
                            isActive ? "border-indigo-500 shadow-lg shadow-indigo-500/10" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
                            isEditing ? "md:col-span-3 ring-1 ring-zinc-200 dark:ring-zinc-800" : "" // Expand when editing
                        )}
                    >
                        {/* Status Bar */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-zinc-100 dark:bg-zinc-800">
                             <div className={cn("h-full transition-all duration-500", isActive ? net.color : "w-0")} style={{ width: isActive ? '100%' : '0%' }} />
                        </div>

                        {/* Card Header */}
                        <div className="p-6 flex items-start justify-between">
                             <div className="flex items-center gap-3">
                                 <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-zinc-50 dark:bg-zinc-950", isActive ? "text-indigo-500" : "text-zinc-400")}>
                                     <Globe className="w-5 h-5" />
                                 </div>
                                 <div>
                                     <h3 className="text-sm font-bold font-mono uppercase">{net.label}</h3>
                                     <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                         {isActive ? 'ACTIVE_WORKER_RUNNING' : (isConfigured ? 'READY_TO_SWITCH' : 'NOT_CONFIGURED')}
                                     </p>
                                 </div>
                             </div>
                             
                             {isConfigured && (
                                 <div className="flex items-center gap-1 text-emerald-500">
                                     <CheckCircle2 className="w-4 h-4" />
                                     <span className="text-[10px] font-bold font-mono">LINKED</span>
                                 </div>
                             )}
                        </div>

                        {/* Card Actions (Only visible if NOT editing) */}
                        {!isEditing && (
                            <div className="mt-auto p-6 pt-0 flex gap-3">
                                {isConfigured ? (
                                    isActive ? (
                                        <Button disabled className="w-full font-mono text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-0">
                                            Currently Active
                                        </Button>
                                    ) : (
                                        <Button 
                                            onClick={() => handleSwitch(net.id)}
                                            disabled={!!isSwitching}
                                            className="w-full font-mono text-xs uppercase bg-indigo-600 hover:bg-indigo-700 text-white"
                                        >
                                            {isSwitching === net.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 mr-2" />}
                                            Activate
                                        </Button>
                                    )
                                ) : (
                                    <Button 
                                        onClick={() => startEditing(net.id)}
                                        variant="outline" 
                                        className="w-full font-mono text-xs uppercase"
                                    >
                                        <SettingsIcon className="w-3 h-3 mr-2" />
                                        Configure
                                    </Button>
                                )}
                                
                                {isConfigured && (
                                    <Button 
                                        onClick={() => startEditing(net.id)}
                                        variant="ghost" 
                                        size="icon"
                                        className="shrink-0"
                                        title="Edit Configuration"
                                    >
                                        <SettingsIcon className="w-4 h-4 text-zinc-400" />
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* EDIT FORM (Visible only when editing this network) */}
                        {isEditing && (
                            <div className="px-6 pb-6 pt-2 border-t border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-top-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left: Inputs */}
                                    <div className="space-y-6">
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-mono font-bold uppercase text-zinc-500">gRPC Provider Endpoint</Label>
                                            <Input
                                                value={grpcEndpoint}
                                                onChange={(e) => setGrpcEndpoint(e.target.value)}
                                                className="font-mono text-sm border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950"
                                            />
                                        </div>
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
                                                    className="font-mono text-sm border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 pr-10"
                                                    placeholder={isConfigured ? "Enter new key to overwrite..." : "dmtr_utxorpc1..."}
                                                />
                                                <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                                                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Validation Result Box */}
                                        {validationResult && (
                                            <div className={cn(
                                                "p-3 rounded-md text-xs font-mono border",
                                                validationResult.isValid 
                                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-900 dark:text-emerald-400" 
                                                    : "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/10 dark:border-rose-900 dark:text-rose-400"
                                            )}>
                                                {validationResult.isValid ? (
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        <span>Connection Validated (Tip: {validationResult.chainTipSlot})</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <XCircle className="w-4 h-4" />
                                                        <span>{validationResult.error}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex gap-3 pt-2">
                                            <Button onClick={handleValidate} disabled={isValidating || !apiKey.trim()} variant="outline" className="flex-1 font-mono text-xs uppercase">
                                                {isValidating ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RefreshCw className="w-3 h-3 mr-2" />}
                                                Test Connection
                                            </Button>
                                            <Button onClick={handleSave} disabled={!validationResult?.isValid || isSaving} className="flex-1 font-mono text-xs uppercase bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black">
                                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Save className="w-3 h-3 mr-2" />}
                                                Save Config
                                            </Button>
                                            <Button onClick={cancelEditing} variant="ghost" className="font-mono text-xs uppercase">
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {/* Right: Info */}
                                    <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded border border-zinc-100 dark:border-zinc-800">
                                        <h4 className="text-xs font-bold font-mono uppercase mb-2">Configuration Guide</h4>
                                        <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
                                            You are configuring the <strong>{net.label}</strong> network profile. 
                                            Panoptes requires a dedicated UtxoRPC API key for each network you wish to monitor.
                                        </p>
                                        <ul className="text-xs text-zinc-500 space-y-2 list-disc pl-4">
                                            <li>Go to Demeter.run</li>
                                            <li>Create a project on <strong>{net.label}</strong></li>
                                            <li>Enable UtxoRPC extension</li>
                                            <li>Copy the API Key</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* 5. Help & Danger Zone */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-zinc-200 dark:border-zinc-800">
            {/* Help Panel */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-sm p-6">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono uppercase mb-4 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-zinc-500" /> Documentation
                </h3>
                <div className="space-y-3">
                    <Button variant="outline" onClick={() => { localStorage.removeItem('panoptes_onboarding_completed'); navigate('/dashboard'); }} className="w-full justify-between font-mono text-xs">
                        <span>Replay_Product_Tour</span> <ArrowLeft className="w-3 h-3 rotate-180" />
                    </Button>
                    <Button variant="outline" onClick={() => window.open('https://github.com/gauciv/panoptes/issues', '_blank')} className="w-full justify-between font-mono text-xs">
                        <span className="flex items-center gap-2"><Github className="w-3 h-3" /> Report_Bug</span> <ArrowLeft className="w-3 h-3 rotate-180" />
                    </Button>
                </div>
            </div>

            {/* Danger Zone */}
            {setupStatus?.isConfigured && (
                <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900 rounded-sm shadow-sm p-6">
                    <h3 className="text-sm font-bold text-rose-900 dark:text-rose-400 font-mono uppercase mb-4 flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Danger_Zone
                    </h3>
                    <p className="text-xs text-rose-800 dark:text-rose-300 font-mono mb-4">
                        Executing this command will wipe ALL credentials and halt ALL workers immediately.
                    </p>
                    <Button variant="destructive" onClick={handleClear} className="w-full font-mono text-xs uppercase bg-rose-600 hover:bg-rose-700 text-white">
                        Purge_All_Credentials
                    </Button>
                </div>
            )}
        </section>

        <div className="text-center font-mono text-[10px] text-zinc-400 uppercase tracking-widest mt-12">
            System requires restart after switching networks
        </div>
      </div>
    </div>
  );
}