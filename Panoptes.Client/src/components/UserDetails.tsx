import { useEffect, useState } from 'react';
import { fetchUserAttributes } from 'aws-amplify/auth';

interface UserProfile {
  name: string;
  email: string;
  picture?: string;
  provider: string;
}

export function UserDetails() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Use the standard API to fetch profile data
        const attributes = await fetchUserAttributes();
        
        // Parse 'identities' to detect Google/Social login
        let provider = 'Email';
        if (attributes.identities) {
            try {
                // identities is a JSON string array: [{"userId":"...","providerName":"Google",...}]
                const identities = JSON.parse(attributes.identities);
                if (Array.isArray(identities) && identities.length > 0) {
                    provider = identities[0].providerName; // e.g., "Google"
                }
            } catch { /* ignore parsing errors */ }
        }

        setProfile({
          // Fallback chain: 'name' -> 'given_name' -> 'email' -> 'User'
          name: attributes.name || attributes.given_name || attributes.email || 'User',
          email: attributes.email || '',
          picture: attributes.picture,
          provider: provider
        });
      } catch (e) {
        console.error("Failed to fetch user attributes:", e);
      }
    };
    loadData();
  }, []);

  // If loading or no profile, return null so the parent can handle it 
  // (or render a skeleton if you prefer, but avoiding null fixes the "Unknown Operator" flash if data loads)
  if (!profile) return null;

  return (
    <div className="px-3 py-3 border-t border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        {/* Avatar Logic */}
        {profile.picture ? (
          <img 
            src={profile.picture} 
            alt="Profile" 
            className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover" 
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
             <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                {(profile.name[0] || 'U').toUpperCase()}
             </span>
          </div>
        )}
        
        {/* Text Info */}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 truncate" title={profile.name}>
            {profile.name}
          </div>
          <div className="text-[10px] text-zinc-500 truncate flex items-center gap-1">
            {profile.provider === 'Google' ? (
                <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Google Account
                </>
            ) : (
                profile.email
            )}
          </div>
        </div>
      </div>
    </div>
  );
}