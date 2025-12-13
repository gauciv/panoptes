import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  MoreVertical, 
  Copy, 
  Check, 
  Zap, 
  Settings, 
  Trash2
} from 'lucide-react';
import { WebhookSubscription } from '../types';

interface SubscriptionCardProps {
  subscription: WebhookSubscription;
  onSelect: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onToggleActive: (id: string) => Promise<void>;
  onReset?: (id: string) => Promise<void>;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ 
  subscription, 
  onSelect,
  onEdit, 
  onDelete, 
  onTest,
  onToggleActive,
  onReset
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Shared loading state for menu actions
  const menuRef = useRef<HTMLDivElement>(null);

  // --- STATUS LOGIC ---
  let currentStatus: 'active' | 'paused' | 'disabled' = 'paused';
  let isDisabled = false;
  
  if (subscription.isRateLimited || subscription.isCircuitBroken) {
    currentStatus = 'disabled';
    isDisabled = true;
  } else if (subscription.isActive) {
    currentStatus = 'active';
  }

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessing) return;
    setIsProcessing(true);
    try { 
        await onToggleActive(subscription.id); 
        setMenuOpen(false);
    } finally { 
        setIsProcessing(false); 
    }
  };

  const handleReset = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onReset || isProcessing) return;
    setIsProcessing(true);
    try { 
        await onReset(subscription.id); 
        setMenuOpen(false);
    } finally { 
        setIsProcessing(false); 
    }
  };

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(subscription.targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- DATA MAPPING ---
  const limits = {
    minute: subscription.webhooksInLastMinute || 0,
    minuteLimit: subscription.maxWebhooksPerMinute || 60,
    hour: subscription.webhooksInLastHour || 0,
    hourLimit: subscription.maxWebhooksPerHour || 1000
  };

  const getLimitPercentage = (current: number, max: number) => {
    if (max === 0) return 0;
    return Math.min(100, Math.round((current / max) * 100));
  };

  // --- VISUAL CONFIGURATION ---
  const getStatusConfig = (status: 'active' | 'paused' | 'disabled') => {
    switch (status) {
      case 'active':
        return {
          border: 'border-l-emerald-600',
          text: 'OP:NORMAL',
          textCol: 'text-emerald-700 dark:text-emerald-400',
        };
      case 'paused':
        return {
          border: 'border-l-amber-500',
          text: 'OP:STANDBY',
          textCol: 'text-amber-700 dark:text-amber-400',
        };
      case 'disabled':
        return {
          border: 'border-l-rose-600',
          text: 'OP:LIMIT_HIT',
          textCol: 'text-rose-700 dark:text-rose-400',
        };
    }
  };

  const config = getStatusConfig(currentStatus);

  // --- HIGH CONTRAST TOOLTIP ---
  const Tooltip = ({ text }: { text: string }) => (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/btn:block z-50 whitespace-nowrap pointer-events-none">
        <div className="
            text-[10px] font-mono font-bold py-1.5 px-2.5 rounded-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]
            border bg-zinc-900 text-white border-zinc-700
            dark:bg-white dark:text-black dark:border-zinc-300
        ">
            {text}
        </div>
        <div className="w-2 h-2 absolute border-r border-b bg-zinc-900 border-zinc-700 dark:bg-white dark:border-zinc-300 -bottom-1 left-1/2 -translate-x-1/2 rotate-45"></div>
    </div>
  );

  return (
    <div
      onClick={onSelect}
      className={`
        relative flex flex-col md:flex-row 
        bg-white dark:bg-zinc-900 
        border border-zinc-300 dark:border-zinc-700 
        border-l-4 ${config.border}
        shadow-sm hover:shadow-md 
        transition-all duration-200 cursor-pointer
        group
      `}
    >
      {/* --- LEFT PANEL: INFO --- */}
      <div className="flex-1 p-3 md:p-4 flex flex-col justify-center min-w-0">
        
        {/* MODIFIED HEADER: Title separated from Metadata */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-y-2 mb-2">
            
            {/* Title Container */}
            <h3 className="font-bold text-zinc-800 dark:text-zinc-100 text-sm md:text-base truncate">
                {subscription.name}
            </h3>
            
            {/* Metadata Container: Tag + Status */}
            <div className="flex items-center gap-2">
                 <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-600 uppercase tracking-tight">
                  {subscription.eventType}
                </span>
                <span className={`text-[9px] font-mono font-bold tracking-widest uppercase ${config.textCol}`}>
                   {config.text}
                </span>
            </div>
        </div>

        {/* URL Box */}
        <div 
            onClick={(e) => e.stopPropagation()} 
            className="flex items-center justify-between gap-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 p-1.5 border border-zinc-200 dark:border-zinc-800 select-text"
        >
          <div className="flex items-center gap-2 overflow-hidden text-zinc-600 dark:text-zinc-400">
            <span className="truncate select-all">{subscription.targetUrl}</span>
          </div>
          
          <button 
            onClick={handleCopyUrl}
            className="shrink-0 relative group/btn p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 rounded-sm transition-colors"
          >
            {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
                <Copy className="w-3.5 h-3.5" />
            )}
            <Tooltip text={copied ? "COPIED" : "COPY_URL"} />
          </button>
        </div>
      </div>

      {/* --- RIGHT PANEL: METRICS & CONTROLS --- */}
      <div className="flex flex-row items-stretch border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-900/30">
        
        {/* Metric Bars */}
        <div className="flex-1 flex flex-col justify-center px-4 py-2 gap-2 min-w-[120px] md:w-48">
           {['minute', 'hour'].map((key) => {
            const current = limits[key as keyof typeof limits] as number;
            const max = limits[`${key}Limit` as keyof typeof limits] as number;
            const pct = getLimitPercentage(current, max);
            const isHigh = pct > 90;
            const isMed = pct > 70;
            
            return (
              <div key={key} className="flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 font-mono tracking-wider">{key.substring(0,3)}</span>
                  <span className={`text-[9px] font-mono ${isHigh ? 'text-rose-600 font-bold' : 'text-zinc-500 dark:text-zinc-400'}`}>{current}/{max}</span>
                </div>
                <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                  <div 
                    className={`h-full ${isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-zinc-400 dark:bg-zinc-500'}`}
                    style={{ width: `${pct}%` }} 
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* --- CONTROL TOWER (Just the Menu now) --- */}
        <div ref={menuRef} className="w-14 relative border-l border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 group/menu">
            <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className={`
                    w-full h-full flex items-center justify-center transition-all duration-200
                    ${menuOpen 
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' 
                        : 'text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }
                `}
            >
                {isProcessing ? (
                     <RefreshCw className="animate-spin w-5 h-5" />
                ) : (
                    <MoreVertical className="w-5 h-5" />
                )}
            </button>

            {/* --- DROPDOWN MENU --- */}
            {menuOpen && (
                <div className="absolute right-full mr-1 bottom-0 w-48 bg-zinc-900 dark:bg-zinc-100 border border-zinc-700 dark:border-zinc-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] z-50 flex flex-col py-1 animate-in fade-in zoom-in-95 slide-in-from-right-2 duration-100 rounded-sm">
                    
                    {/* SECTION 1: STATE CONTROL */}
                    {isDisabled ? (
                        <button 
                            onClick={handleReset}
                            className="flex items-center gap-3 px-3 py-2.5 text-xs font-mono font-bold text-rose-400 dark:text-rose-600 hover:bg-rose-900/30 dark:hover:bg-rose-100/50 text-left w-full transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            RESET_CIRCUIT
                        </button>
                    ) : subscription.isActive ? (
                        <button 
                            onClick={handleToggle}
                            className="flex items-center gap-3 px-3 py-2.5 text-xs font-mono font-bold text-amber-400 dark:text-amber-600 hover:bg-amber-900/30 dark:hover:bg-amber-100/50 text-left w-full transition-colors"
                        >
                            <Pause className="w-3.5 h-3.5" />
                            PAUSE_FEED
                        </button>
                    ) : (
                        <button 
                            onClick={handleToggle}
                            className="flex items-center gap-3 px-3 py-2.5 text-xs font-mono font-bold text-emerald-400 dark:text-emerald-600 hover:bg-emerald-900/30 dark:hover:bg-emerald-100/50 text-left w-full transition-colors"
                        >
                            <Play className="w-3.5 h-3.5" />
                            RESUME_FEED
                        </button>
                    )}

                    {/* SEPARATOR */}
                    <div className="h-px bg-zinc-700 dark:bg-zinc-300 my-1 mx-2" />

                    {/* SECTION 2: CONFIGURATION */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onTest(subscription.id); setMenuOpen(false); }}
                        className="flex items-center gap-3 px-3 py-2 text-xs font-mono font-bold text-zinc-400 dark:text-zinc-600 hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:text-white dark:hover:text-black text-left w-full transition-colors"
                    >
                        <Zap className="w-3.5 h-3.5" />
                        TEST_CONN
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(subscription.id); setMenuOpen(false); }}
                        className="flex items-center gap-3 px-3 py-2 text-xs font-mono font-bold text-zinc-400 dark:text-zinc-600 hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:text-white dark:hover:text-black text-left w-full transition-colors"
                    >
                        <Settings className="w-3.5 h-3.5" />
                        CONFIG
                    </button>

                    {/* SEPARATOR */}
                    <div className="h-px bg-zinc-700 dark:bg-zinc-300 my-1 mx-2" />

                    {/* SECTION 3: DANGER ZONE */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(subscription.id); setMenuOpen(false); }}
                        className="flex items-center gap-3 px-3 py-2 text-xs font-mono font-bold text-rose-500 hover:bg-rose-900/30 dark:hover:bg-rose-100 hover:text-rose-400 dark:hover:text-rose-600 text-left w-full transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        TERMINATE
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};