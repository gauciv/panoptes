import { useState } from 'react';
import { BookOpen, ExternalLink, User, Power } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { LogoutModal } from './LogoutModal';

interface SideNavFooterProps {
  isCollapsed: boolean;
}

export function SideNavFooter({ isCollapsed }: SideNavFooterProps) {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success("TERMINAL_SESSION_CLOSED");
    } catch (error) {
      console.error("Logout failed", error);
      toast.error("Logout failed");
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  // Get email safely from Cognito user attributes
  const userEmail = user?.signInDetails?.loginId || "Unknown Operator";

  return (
    <div className="mt-auto">
      
      {/* 1. Documentation Promo (Only visible when expanded) */}
      {!isCollapsed && (
        <div className="p-3 m-2 mb-2 bg-gradient-to-br from-sentinel/10 to-sentinel/5 border border-sentinel/20 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-tech bg-sentinel/10 text-sentinel flex items-center justify-center mt-0.5">
              <BookOpen className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-sans font-semibold text-sm text-foreground mb-1">
                View Documentation
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Learn how to integrate and use Panoptes
              </p>
              <a 
                href="#" 
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-sentinel hover:bg-sentinel-hover text-white rounded-tech text-xs font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel focus-visible:ring-offset-2"
              >
                Read Docs
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 2. User Profile & Logout Section */}
      <div className={cn(
        "border-t border-border p-2",
        isCollapsed ? "flex justify-center" : ""
      )}>
        {isCollapsed ? (
          // Collapsed: Show only Logout Icon
          <button
            onClick={handleLogoutClick}
            className="p-2 text-muted-foreground hover:text-red-400 transition-colors"
            title="Sign Out"
          >
            <Power className="w-5 h-5" />
          </button>
        ) : (
          // Expanded: Show User Info + Logout Button
          <div className="flex items-center gap-3 px-2 py-2">
            {/* Square Avatar with subtle border */}
            <div className="flex-shrink-0 w-9 h-9 bg-sentinel/10 border border-sentinel/30 flex items-center justify-center text-sentinel">
              <User className="w-4 h-4" />
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate" title={userEmail}>
                {userEmail}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-muted-foreground">Active</span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogoutClick}
              className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
              title="Sign Out"
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
        isLoading={isLoggingOut}
      />
    </div>
  );
}