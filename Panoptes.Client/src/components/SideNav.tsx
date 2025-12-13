import { useState, useEffect, useContext } from 'react';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from '../config/navigation';
import { SideNavItem } from './SideNavItem';
import { SideNavFooter } from './SideNavFooter';
import { ThemeContext } from '../App';
import { UserDetails } from './UserDetails';
import ThemeToggle from '../ThemeToggle';
import { cn } from '../lib/utils';

const COLLAPSE_STORAGE_KEY = 'panoptes-sidenav-collapsed';

export function SideNav() {
  const { isDark, setIsDark } = useContext(ThemeContext);
  
  // Initialize state from local storage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(COLLAPSE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : false;
    } catch (e) {
      return false;
    }
  });
  
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobile = () => {
    setIsMobileOpen(false);
  };

  // Internal component for the sidebar content
  const NavContent = ({ forceExpanded = false }: { forceExpanded?: boolean }) => {
    // If forced expanded (mobile), ignore the isCollapsed state
    const effectiveCollapsed = forceExpanded ? false : isCollapsed;

    return (
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0">
              <img 
                src="/logo_panoptes.svg" 
                alt="Panoptes Logo" 
                className="w-8 h-8"
              />
            </div>
            {!effectiveCollapsed && (
              <span className="font-michroma text-sm tracking-[0.18em] uppercase text-foreground truncate">
                Panoptes
              </span>
            )}
          </div>
        </div>

        {/* Navigation Links (Scrollable Area) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 min-h-0 nav-scrollbar">
          {/* Primary Items */}
          <div className="space-y-1">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <SideNavItem 
                key={item.path} 
                item={item} 
                isCollapsed={effectiveCollapsed} 
                onClick={closeMobile}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-border" />

          {/* Secondary Items Header */}
          {!effectiveCollapsed && (
            <div className="px-2 mb-2">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                General
              </span>
            </div>
          )}

          {/* Secondary Items */}
          <div className="space-y-1">
            {SECONDARY_NAV_ITEMS.map((item) => (
              <SideNavItem 
                key={item.path} 
                item={item} 
                isCollapsed={effectiveCollapsed} 
                onClick={closeMobile}
              />
            ))}
            
            {/* Theme Toggle */}
            <div className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-tech transition-colors mt-2",
              effectiveCollapsed ? "justify-center" : ""
            )}>
              {!effectiveCollapsed && (
                <span className="text-sm font-mono text-muted-foreground flex-1">Theme</span>
              )}
              <ThemeToggle isDark={isDark} toggle={() => setIsDark(!isDark)} compact={effectiveCollapsed} />
            </div>
          </div>
        </div>

        {/* Footer (Documentation/Version) */}
        <div className="shrink-0">
          <SideNavFooter isCollapsed={effectiveCollapsed} />
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Menu Button (Hamburger) */}
      <button
        onClick={toggleMobile}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-background border border-border rounded-tech shadow-lg hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel"
        aria-label="Toggle navigation menu"
      >
        {isMobileOpen ? (
          <X className="w-6 h-6 text-foreground" aria-hidden="true" />
        ) : (
          <Menu className="w-6 h-6 text-foreground" aria-hidden="true" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity backdrop-blur-sm"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer (Slide-out) */}
      <nav
        role="navigation"
        aria-label="Main navigation"
        className={cn(
          'lg:hidden fixed top-0 left-0 h-full w-72 bg-background border-r border-border z-40 transition-transform duration-300 ease-in-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <NavContent forceExpanded={true} />
      </nav>

      {/* Desktop Sidebar (Collapsible) */}
      <div className="hidden lg:block relative z-30 h-screen sticky top-0">
        <nav
          role="navigation"
          aria-label="Main navigation"
          className={cn(
            'flex flex-col bg-background border-r border-border h-full transition-all duration-300 overflow-hidden relative z-20',
            isCollapsed ? 'w-16' : 'w-60'
          )}
        >
          <NavContent />
        </nav>
        
        {/* Desktop Collapse Toggle Button */}
        <button
          onClick={toggleCollapse}
          className={cn(
            "fixed top-1/2 -translate-y-1/2 z-10 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border transition-[left] duration-300 ease-in-out",
            "bg-background border border-border w-6 h-12 rounded-r-md hover:border-sentinel hover:bg-accent flex items-center justify-center shadow-md",
            isCollapsed ? 'left-[64px]' : 'left-[240px]' // Adjusted precisely to border width
          )}
          aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
          title={isCollapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {isCollapsed ? (
            <ChevronRight 
              className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" 
              strokeWidth={2.5}
            />
          ) : (
            <ChevronLeft 
              className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" 
              strokeWidth={2.5}
            />
          )}
        </button>
      </div>
    </>
  );
}