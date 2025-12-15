import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Menu, X, Globe, Check, Settings, Lock } from 'lucide-react';
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from '../config/navigation';
import { SideNavItem } from './SideNavItem';
import { SideNavFooter } from './SideNavFooter';
import { ThemeContext } from '../App';
import ThemeToggle from '../ThemeToggle';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

const COLLAPSE_STORAGE_KEY = 'panoptes-sidenav-collapsed';

// Available Networks Definition
const NETWORKS = [
  { id: 'Preprod', label: 'Preprod', color: 'bg-blue-500' },
  { id: 'Mainnet', label: 'Mainnet', color: 'bg-emerald-500' },
  { id: 'Preview', label: 'Preview', color: 'bg-purple-500' }
];

export function SideNav() {
  const { isDark, setIsDark } = useContext(ThemeContext);
  const navigate = useNavigate();
  
  // --- Sidebar State ---
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(COLLAPSE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : false;
    } catch (e) {
      return false;
    }
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);

  // --- Network State ---
  const [activeNetwork, setActiveNetwork] = useState<string>('Preprod');
  const [configuredNetworks, setConfiguredNetworks] = useState<string[]>([]);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Fetch Network Status on Mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/setup/status');
        if (response.ok) {
            const data = await response.json();
            if (data.isConfigured) {
                setActiveNetwork(data.activeNetwork || 'Preprod');
                setConfiguredNetworks(data.configuredNetworks || []);
            }
        }
      } catch (e) {
        console.error("Failed to fetch network status");
      }
    };
    fetchStatus();
  }, []);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);
  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);
  const closeMobile = () => setIsMobileOpen(false);

  const handleNetworkSwitch = async (targetNetwork: string) => {
    // 1. Check if configured
    if (!configuredNetworks.includes(targetNetwork)) {
        toast.error(`Configuration missing for ${targetNetwork}`);
        navigate('/settings');
        closeMobile();
        return;
    }

    // 2. Prevent switching to same network
    if (targetNetwork === activeNetwork) return;

    // 3. Perform Switch
    setIsSwitching(true);
    const toastId = toast.loading(`Switching to ${targetNetwork}...`);
    
    try {
        const response = await fetch('/setup/switch-network', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ network: targetNetwork }),
        });

        if (!response.ok) throw new Error('Switch failed');

        toast.success(`Active: ${targetNetwork}`, { id: toastId });
        setActiveNetwork(targetNetwork);
        
        // Slight delay to allow backend to restart worker before UI reload
        setTimeout(() => {
            window.location.reload();
        }, 1000);

    } catch (e) {
        toast.error("Failed to switch network", { id: toastId });
        setIsSwitching(false);
    }
  };

  // Content Component
  const NavContent = ({ forceExpanded = false }: { forceExpanded?: boolean }) => {
    const effectiveCollapsed = forceExpanded ? false : isCollapsed;
    const currentNetObj = NETWORKS.find(n => n.id === activeNetwork) || NETWORKS[0];

    return (
      <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0">
              <img src="/logo_panoptes.svg" alt="Panoptes Logo" className="w-8 h-8" />
            </div>
            {!effectiveCollapsed && (
              <span className="font-michroma text-sm tracking-[0.18em] uppercase text-zinc-900 dark:text-zinc-100 truncate animate-in fade-in">
                Panoptes
              </span>
            )}
          </div>

          {/* MOBILE CLOSE BUTTON */}
          {forceExpanded && (
            <button 
              onClick={closeMobile}
              className="lg:hidden p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Scrollable Items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 min-h-0">
          <div className="space-y-1">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <SideNavItem key={item.path} item={item} isCollapsed={effectiveCollapsed} onClick={closeMobile} />
            ))}
          </div>
          
          <div className="my-4 border-t border-zinc-200 dark:border-zinc-800" />
          
          {/* NETWORK SWITCHER */}
          <div className="mb-2">
            {!effectiveCollapsed && (
                <div className="px-3 mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Network</span>
                    <button 
                        onClick={() => { navigate('/settings'); closeMobile(); }}
                        className="text-[10px] text-zinc-500 hover:text-indigo-500 flex items-center gap-1 transition-colors"
                    >
                        <Settings className="w-3 h-3" /> Config
                    </button>
                </div>
            )}
            
            <div className="relative">
              <button
                disabled={isSwitching}
                onClick={() => !effectiveCollapsed && setShowNetworkMenu(!showNetworkMenu)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors border border-transparent",
                  "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                  effectiveCollapsed ? "justify-center" : "justify-between",
                  showNetworkMenu && "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                )}
                title={effectiveCollapsed ? `Active: ${currentNetObj.label}` : undefined}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full ring-2 ring-opacity-50 animate-pulse", currentNetObj.color, "ring-current")} />
                  {!effectiveCollapsed && <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{currentNetObj.label}</span>}
                </div>
                {!effectiveCollapsed && (
                    <ChevronRight className={cn("w-4 h-4 text-zinc-400 transition-transform", showNetworkMenu && "rotate-90")} />
                )}
              </button>

              {/* Network Dropdown */}
              {!effectiveCollapsed && showNetworkMenu && (
                <div className="mt-2 mx-1 p-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-lg animate-in slide-in-from-top-2 duration-200 z-50">
                  {NETWORKS.map((net) => {
                    const isConfigured = configuredNetworks.includes(net.id);
                    const isActive = activeNetwork === net.id;
                    
                    return (
                        <button
                          key={net.id}
                          onClick={() => {
                            handleNetworkSwitch(net.id);
                            setShowNetworkMenu(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-all mb-1 last:mb-0",
                            isActive 
                              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold" 
                              : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200"
                          )}
                        >
                          <div className="flex items-center gap-2">
                             <div className={cn("w-1.5 h-1.5 rounded-full", net.color, !isConfigured && "opacity-30")} />
                             <span className={cn(!isConfigured && "opacity-50")}>{net.label}</span>
                          </div>
                          
                          {isActive && <Check className="w-3 h-3 text-emerald-500" />}
                          {!isConfigured && !isActive && <Lock className="w-3 h-3 text-zinc-300 dark:text-zinc-700" />}
                        </button>
                    );
                  })}
                  
                  <div className="border-t border-zinc-100 dark:border-zinc-800 mt-1 pt-1">
                    <button
                        onClick={() => { navigate('/settings'); setShowNetworkMenu(false); closeMobile(); }}
                        className="w-full text-center py-1.5 text-[10px] text-zinc-400 hover:text-indigo-500 font-mono uppercase tracking-wider transition-colors"
                    >
                        + Configure New
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="my-4 border-t border-zinc-200 dark:border-zinc-800" />

          <div className="space-y-1">
            {SECONDARY_NAV_ITEMS.map((item) => (
              <SideNavItem key={item.path} item={item} isCollapsed={effectiveCollapsed} onClick={closeMobile} />
            ))}
            <div className={cn("flex items-center gap-3 px-3 py-2 rounded-md mt-2 hover:bg-zinc-100 dark:hover:bg-zinc-800", effectiveCollapsed ? "justify-center" : "")}>
              {!effectiveCollapsed && <span className="text-sm font-mono text-zinc-500 dark:text-zinc-400 flex-1">Theme</span>}
              <ThemeToggle isDark={isDark} toggle={() => setIsDark(!isDark)} compact={effectiveCollapsed} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <SideNavFooter isCollapsed={effectiveCollapsed} />
        </div>
      </div>
    );
  };

  return (
    <>
      {/* --- MOBILE TOGGLE BUTTON --- */}
      <button 
        onClick={toggleMobile} 
        className={cn(
          "lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
          isMobileOpen && "hidden"
        )}
      >
        <Menu className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
      </button>

      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={closeMobile} />
      )}

      <nav className={cn(
        'lg:hidden fixed top-0 left-0 h-full w-72 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 z-40 transition-transform duration-300',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <NavContent forceExpanded={true} />
      </nav>

      {/* --- DESKTOP SIDEBAR --- */}
      <div 
        className={cn(
            "hidden lg:block sticky top-0 h-screen z-30",
            "transition-all duration-300 ease-in-out",
            isCollapsed ? "w-[calc(80px+1.5rem)]" : "w-[calc(256px+1.5rem)]"
        )}
      >
        <div className="h-full py-4 pl-4 flex flex-col justify-center">
            <div className={cn(
                "relative h-full transition-all duration-300",
                isCollapsed ? "w-20" : "w-64"
            )}>
                
                <nav className="h-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg overflow-hidden flex flex-col shadow-sm">
                    <NavContent />
                </nav>
                
                <button
                    onClick={toggleCollapse}
                    className={cn(
                        "hidden lg:flex",
                        "absolute top-1/2 -translate-y-1/2 z-50",
                        "-right-3",
                        "bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 w-6 h-12 rounded-r-sm",
                        "items-center justify-center",
                        "hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
                        "focus-visible:outline-none transition-colors"
                    )}
                    aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

            </div>
        </div>
      </div>
    </>
  );
}