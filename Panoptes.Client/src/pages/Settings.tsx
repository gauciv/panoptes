import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Loader2, 
  CheckCircle2, 
  HelpCircle, 
  Github, 
  Shield, 
  Terminal, 
  Zap, 
  Settings as SettingsIcon, 
  Globe,
  BookOpen, 
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { SetupWizard } from '@/components/SetupWizard';
import { ConfigureNetworkModal } from '@/components/ConfigureNetworkModal';

// --- Types ---
interface SetupStatus {
  isConfigured: boolean;
  activeNetwork?: string;
  activeEndpoint?: string;
  configuredNetworks: string[];
}

const NETWORK_ENDPOINTS: Record<string, string> = {
  Mainnet: 'https://cardano-mainnet.utxorpc-m1.demeter.run',
  Preprod: 'https://cardano-preprod.utxorpc-m1.demeter.run',
  Preview: 'https://cardano-preview.utxorpc-m1.demeter.run',
};

const NETWORKS = [
    { id: 'Mainnet', label: 'Mainnet', color: 'bg-emerald-500' },
    { id: 'Preprod', label: 'Preprod', color: 'bg-blue-500' },
    { id: 'Preview', label: 'Preview', color: 'bg-purple-500' },
];

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // System State
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [editingNetworkId, setEditingNetworkId] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  
  // Wizard State
  const [showWizard, setShowWizard] = useState(false);

  // --- LOGGING MOUNT ---
  useEffect(() => {
    console.log("[Settings Page] Mounted.");
  }, []);

  // --- WIZARD TRIGGER ---
  useEffect(() => {
    const shouldSetup = searchParams.get('setup');
    if (shouldSetup === 'true') {
        setShowWizard(true);
        setSearchParams(params => {
            params.delete('setup');
            return params;
        });
    }
  }, [searchParams, setSearchParams]);

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

  const handleConfigSave = () => {
    toast.success('Configuration updated');
    fetchSetupStatus();
    setEditingNetworkId(null);
  };

  // SWITCH NETWORK
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
      localStorage.setItem('panoptes-network', targetNetwork);
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
  
  const handleWizardComplete = () => {
      setShowWizard(false);
      fetchSetupStatus();
      toast.success('System Initialized via Wizard');
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

                return (
                    <div 
                        key={net.id} 
                        className={cn(
                            "relative flex flex-col bg-white dark:bg-zinc-900 border rounded-sm transition-all duration-300",
                            isActive ? "border-indigo-500 shadow-lg shadow-indigo-500/10" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
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

                        {/* Card Actions */}
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
                                    onClick={() => setEditingNetworkId(net.id)}
                                    variant="outline" 
                                    className="w-full font-mono text-xs uppercase"
                                >
                                    <SettingsIcon className="w-3 h-3 mr-2" />
                                    Configure
                                </Button>
                            )}
                            
                            {isConfigured && (
                                <Button 
                                    onClick={() => setEditingNetworkId(net.id)}
                                    variant="ghost" 
                                    size="icon"
                                    className="shrink-0"
                                    title="Edit Configuration"
                                >
                                    <SettingsIcon className="w-4 h-4 text-zinc-400" />
                                </Button>
                            )}
                        </div>
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
                  <Button 
                      variant="outline" 
                      // CHANGE: from window.open('#') to navigate('/docs')
                      onClick={() => navigate('/docs')} 
                      className="w-full justify-between font-mono text-xs"
                  >
                      <span className="flex items-center gap-2"><BookOpen className="w-3 h-3" /> Read_Documentation</span> 
                      <ExternalLink className="w-3 h-3" />
                  </Button>
                    
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
      
      {/* Wizard Modal */}
      {showWizard && (
         <SetupWizard 
            onComplete={handleWizardComplete} 
            onClose={() => setShowWizard(false)} 
         />
      )}

      {/* Configuration Modal */}
      {editingNetworkId && (
        <ConfigureNetworkModal
            networkId={editingNetworkId}
            networkLabel={NETWORKS.find(n => n.id === editingNetworkId)?.label || editingNetworkId}
            initialEndpoint={NETWORK_ENDPOINTS[editingNetworkId] || ''}
            onClose={() => setEditingNetworkId(null)}
            onSaveSuccess={handleConfigSave}
        />
      )}

    </div>
  );
}