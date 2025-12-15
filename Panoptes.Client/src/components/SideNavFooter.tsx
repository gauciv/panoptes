import { useState, useEffect } from 'react';
import { User } from 'lucide-react'; 
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
// ✅ IMPORTED: Needed to get email from Google/Social logins
import { fetchUserAttributes } from 'aws-amplify/auth';

interface SideNavFooterProps {
  isCollapsed: boolean;
}

export function SideNavFooter({ isCollapsed }: SideNavFooterProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // User Identifiers
  const userId = user?.username || user?.signInDetails?.loginId || 'guest';
  
  // State for resolved data
  const [userEmail, setUserEmail] = useState<string>("Unknown Operator");
  const [displayName, setDisplayName] = useState("Loading...");

  // ✅ 1. Fetch Real Email (Handles Google/Federated Logins)
  useEffect(() => {
    const resolveUserEmail = async () => {
      if (!user) return;

      // Plan A: Try standard login details
      if (user.signInDetails?.loginId) {
        setUserEmail(user.signInDetails.loginId);
        return;
      }

      // Plan B: Fetch attributes for Social Logins (Google)
      try {
        const attributes = await fetchUserAttributes();
        if (attributes.email) {
          setUserEmail(attributes.email);
        } else {
          setUserEmail("External Account");
        }
      } catch (e) {
        // Fallback if everything fails
        setUserEmail("Unknown Operator");
      }
    };

    resolveUserEmail();
  }, [user]);

  // ✅ 2. Name Resolution Effect (Updates when Profile is saved)
  useEffect(() => {
    const updateDisplayName = () => {
      if (userId === 'guest') {
        setDisplayName("Guest");
        return;
      }

      const first = localStorage.getItem(`panoptes_user_${userId}_first_name`);
      const last = localStorage.getItem(`panoptes_user_${userId}_last_name`);

      // If user set a custom name, use it. Otherwise default to the resolved email.
      if (first || last) {
        setDisplayName(`${first || ''} ${last || ''}`.trim());
      } else {
        setDisplayName(userEmail);
      }
    };

    // Run immediately when email or ID changes
    updateDisplayName();

    // Listen for updates from Profile page
    window.addEventListener('user_profile_updated', updateDisplayName);
    return () => {
      window.removeEventListener('user_profile_updated', updateDisplayName);
    };
  }, [userId, userEmail]);

  const handleProfileClick = () => {
    navigate('/dashboard/profile');
  };

  // Logic to determine secondary text (The status line)
  // If the Name is the same as the Email, show "Active Session".
  // If the Email is "Unknown Operator", show "Active Session".
  // Otherwise, show the Email.
  const secondaryText = (displayName !== userEmail && userEmail !== "Unknown Operator") 
    ? userEmail 
    : "Active Session";

  return (
    <div className="mt-auto">
      <div className={cn(
        "border-t border-zinc-200 dark:border-zinc-800 p-2",
        isCollapsed ? "flex justify-center" : ""
      )}>
        {isCollapsed ? (
          <button
            onClick={handleProfileClick}
            className="p-2 text-zinc-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors"
            title="View Profile"
          >
            <User className="w-5 h-5" />
          </button>
        ) : (
          <div 
            className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer group transition-colors"
            onClick={handleProfileClick}
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
              
              {/* Status Line */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]">
                  {secondaryText}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}