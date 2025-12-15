import { useState, useEffect } from 'react';
import { User, Power } from 'lucide-react'; // Removed BookOpen, ExternalLink
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LogoutModal } from './LogoutModal';

interface SideNavFooterProps {
  isCollapsed: boolean;
}

export function SideNavFooter({ isCollapsed }: SideNavFooterProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Modal State
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // User Identifiers
  const userId = user?.username || user?.signInDetails?.loginId || 'guest';
  const userEmail = user?.signInDetails?.loginId || "Unknown Operator";

  // Display Name State
  const [displayName, setDisplayName] = useState(userEmail);

  // Logout Handlers
  const handleLogoutClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click events
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success("TERMINAL_SESSION_CLOSED");
      navigate('/');
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

  // Name Resolution Effect
  useEffect(() => {
    const updateDisplayName = () => {
      if (userId === 'guest') {
        setDisplayName("Guest");
        return;
      }

      // Look up keys with the userId prefix
      const first = localStorage.getItem(`panoptes_user_${userId}_first_name`);
      const last = localStorage.getItem(`panoptes_user_${userId}_last_name`);

      if (first || last) {
        setDisplayName(`${first || ''} ${last || ''}`.trim());
      } else {
        setDisplayName(userEmail);
      }
    };

    updateDisplayName();
    window.addEventListener('user_profile_updated', updateDisplayName);
    return () => {
      window.removeEventListener('user_profile_updated', updateDisplayName);
    };
  }, [userId, userEmail]);

  return (
    <div className="mt-auto">
      {/* 2. User Profile Strip (Now the only item) */}
      <div className={cn(
        "border-t border-zinc-200 dark:border-zinc-800 p-2",
        isCollapsed ? "flex justify-center" : ""
      )}>
        {isCollapsed ? (
          // Collapsed: Show Logout Button
          <button
            onClick={handleLogoutClick}
            className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            title="Sign Out"
          >
            <Power className="w-5 h-5" />
          </button>
        ) : (
          // Expanded: Interactive Profile Strip
          <div 
            className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer group transition-colors"
            onClick={() => navigate('/profile')}
            title="View Profile"
          >
            {/* Avatar */}
            <div className="flex-shrink-0 w-9 h-9 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 rounded-sm">
              <User className="w-4 h-4" />
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {displayName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]">
                  {userEmail}
                </span>
              </div>
            </div>

            {/* Actions: Logout Button */}
            <button
              onClick={handleLogoutClick}
              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
              title="Sign Out"
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
        isLoading={isLoggingOut}
      />
    </div>
  );
}