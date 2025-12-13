import { useState, useEffect, useContext } from 'react';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from '../config/navigation';
import { SideNavItem } from './SideNavItem';
import { SideNavFooter } from './SideNavFooter';
import { ThemeContext } from '../App';
import ThemeToggle from '../ThemeToggle';
import { cn } from '../lib/utils';

const COLLAPSE_STORAGE_KEY = 'panoptes-sidenav-collapsed';

export function SideNav() {
  const { isDark, setIsDark } = useContext(ThemeContext);
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(COLLAPSE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : false;
    } catch (e) {
      return false;
    }
  });
  
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);
  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);
  const closeMobile = () => setIsMobileOpen(false);

  // Content Component
  const NavContent = ({ forceExpanded = false }: { forceExpanded?: boolean }) => {
    const effectiveCollapsed = forceExpanded ? false : isCollapsed;
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

          {/* MOBILE CLOSE BUTTON - Right Aligned */}
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
            {/* RELATIVE WRAPPER */}
            <div className={cn(
                "relative h-full transition-all duration-300",
                isCollapsed ? "w-20" : "w-64"
            )}>
                
                {/* THE FLOATING CARD */}
                <nav className="h-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg overflow-hidden flex flex-col">
                    <NavContent />
                </nav>
                
                {/* THE BUTTON */}
                <button
                    onClick={toggleCollapse}
                    className={cn(
                        "hidden lg:flex",
                        "absolute top-1/2 -translate-y-1/2 z-50",
                        // Anchored flush to the right border
                        "-right-3",
                        // Industrial Style: Square/Sharp corners (rounded-r-sm), Solid Border, No Shadow
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