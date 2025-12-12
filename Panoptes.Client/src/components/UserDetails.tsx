import { useEffect, useState } from 'react';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

type Claims = {
  email?: string;
  name?: string;
  picture?: string;
  identities?: unknown;
};

export function UserDetails() {
  const [claims, setClaims] = useState<Claims | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const user = await getCurrentUser();
        // Amplify may set signInDetails when coming from OAuth
        const prov = (user as any)?.signInDetails?.loginId ?? (user as any)?.signInDetails?.authFlowType ?? null;
        setProvider(prov);
        const session = await fetchAuthSession();
        const idPayload = session.tokens?.idToken?.payload as Claims;
        setClaims({
          email: idPayload?.email,
          name: idPayload?.name || (idPayload as any)?.given_name || (idPayload as any)?.preferred_username,
          picture: idPayload?.picture,
          identities: idPayload?.identities,
        });
      } catch (e) {
        setClaims(null);
      }
    };
    load();
  }, []);

  if (!claims) return null;

  return (
    <div className="px-3 py-3 border-t border-border">
      <div className="flex items-center gap-3">
        {claims.picture ? (
          <img src={claims.picture} alt={`${claims.name || claims.email || 'User'}'s avatar`} className="w-8 h-8 rounded-full border border-border" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-accent border border-border" />
        )}
        <div className="min-w-0">
          <div className="text-sm font-mono text-foreground truncate">{claims.name || claims.email}</div>
          <div className="text-[10px] text-muted-foreground truncate">
            {provider?.toString().includes('Google') ? 'Signed in with Google' : 'Signed in'}
          </div>
        </div>
      </div>
    </div>
  );
}
