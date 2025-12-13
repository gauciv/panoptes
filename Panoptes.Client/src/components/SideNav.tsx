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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(COLLAPSE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : false;
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

  // Modified to accept forceExpanded prop
  const NavContent = ({ forceExpanded = false }: { forceExpanded?: boolean }) => {
    // If forced expanded (mobile), ignore the isCollapsed state
    const effectiveCollapsed = forceExpanded ? false : isCollapsed;

    return (
      <>
        {/* Logo Section */}
        <div className="flex items-center justify-between p-4 border-b border-border">
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
      </div>
      {/* User Details when authenticated (shows Google info) */}
      {!isCollapsed && (
        <UserDetails />
      )}

        {/* Primary Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 min-h-0 nav-scrollbar">
          <div className="space-y-1">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <SideNavItem 
                key={item.path} 
                item={item} 
                isCollapsed={effectiveCollapsed} // Use effective state
                onClick={closeMobile}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-border" />

          {/* Secondary Navigation - General */}
          {!effectiveCollapsed && (
            <div className="px-2 mb-2">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                General
              </span>
            </div>
          )}
          <div className="space-y-1">
            {SECONDARY_NAV_ITEMS.map((item) => (
              <SideNavItem 
                key={item.path} 
                item={item} 
                isCollapsed={effectiveCollapsed} // Use effective state
                onClick={closeMobile}
              />
            ))}
            
            {/* Theme Toggle */}
            <div className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-tech transition-colors",
              effectiveCollapsed ? "justify-center" : ""
            )}>
              {!effectiveCollapsed && (
                <span className="text-sm font-mono text-muted-foreground">Theme</span>
              )}
              <ThemeToggle isDark={isDark} toggle={() => setIsDark(!isDark)} compact={effectiveCollapsed} />
            </div>
          </div>
        </div>

        {/* Documentation Footer */}
        <SideNavFooter isCollapsed={effectiveCollapsed} />
      </>
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
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
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <nav
        role="navigation"
        aria-label="Main navigation"
        className={cn(
          'lg:hidden fixed top-0 left-0 h-full w-64 bg-background border-r border-border z-40 transition-transform duration-300 ease-in-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Force expanded on mobile so text is always visible */}
        <NavContent forceExpanded={true} />
      </nav>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block relative z-30 h-screen sticky top-0">
        <nav
          role="navigation"
          aria-label="Main navigation"
          className={cn(
            'flex flex-col bg-background border-r border-border h-full transition-all duration-300 overflow-hidden relative z-20',
            isCollapsed ? 'w-16' : 'w-60'
          )}
        >
          {/* Default behavior on desktop */}
          <NavContent />
        </nav>
        
        {/* Center Edge Toggle Button - Light/Dark Mode */}
        <button
          onClick={toggleCollapse}
          className={cn(
            "fixed top-1/2 -translate-y-1/2 z-10 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border transition-[left] duration-300 ease-in-out",
            "bg-white dark:bg-[#050505] border border-border px-2 py-2 rounded-none hover:border-muted-foreground flex items-center justify-center",
            isCollapsed ? 'left-[56px]' : 'left-[232px]'
          )}
          aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
          title={isCollapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {isCollapsed ? (
            <ChevronRight 
              className="w-5 h-5 text-gray-700 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-200 ml-2" 
              strokeWidth={2.5}
              aria-hidden="true" 
            />
          ) : (
            <ChevronLeft 
              className="w-5 h-5 text-gray-700 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-200 ml-2" 
              strokeWidth={2.5}
              aria-hidden="true" 
            />
          )}
        </button>
      </div>
    </>
  );
}