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

  const NavContent = () => (
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
          {!isCollapsed && (
            <span className="font-michroma text-sm tracking-[0.18em] uppercase text-foreground truncate">
              Panoptes
            </span>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={toggleCollapse}
            className="hidden lg:block p-1 rounded-tech hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel focus-visible:ring-offset-2"
            aria-label="Collapse navigation"
            title="Collapse navigation"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Primary Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 min-h-0 nav-scrollbar">
        <div className="space-y-1">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <SideNavItem 
              key={item.path} 
              item={item} 
              isCollapsed={isCollapsed}
              onClick={closeMobile}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-border" />

        {/* Secondary Navigation - General */}
        <div className="px-2 mb-2">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            General
          </span>
        </div>
        <div className="space-y-1">
          {SECONDARY_NAV_ITEMS.map((item) => (
            <SideNavItem 
              key={item.path} 
              item={item} 
              isCollapsed={isCollapsed}
              onClick={closeMobile}
            />
          ))}
          
          {/* Theme Toggle */}
          <div className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-tech transition-colors",
            isCollapsed ? "justify-center" : ""
          )}>
            {!isCollapsed && (
              <span className="text-sm font-mono text-muted-foreground">Theme</span>
            )}
            <ThemeToggle isDark={isDark} toggle={() => setIsDark(!isDark)} compact={isCollapsed} />
          </div>
        </div>
      </div>

      {/* Documentation Footer */}
      <SideNavFooter isCollapsed={isCollapsed} />

      {/* Expand Button (when collapsed) */}
      {isCollapsed && (
        <div className="p-2 border-t border-border hidden lg:block">
          <button
            onClick={toggleCollapse}
            className="w-full p-3 rounded-tech hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel focus-visible:ring-offset-2"
            aria-label="Expand navigation"
            title="Expand navigation"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground mx-auto" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );

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
        <NavContent />
      </nav>

      {/* Desktop Sidebar */}
      <nav
        role="navigation"
        aria-label="Main navigation"
        className={cn(
          'hidden lg:flex flex-col bg-background border-r border-border h-screen sticky top-0 transition-all duration-300 overflow-hidden',
          isCollapsed ? 'w-16' : 'w-60'
        )}
      >
        <NavContent />
      </nav>
    </>
  );
}
