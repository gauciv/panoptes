import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  signIn, 
  signOut, 
  signUp, 
  getCurrentUser, 
  SignInInput,
  SignUpInput,
  AuthUser
} from 'aws-amplify/auth';
import { configureAuth } from '../config/auth';

configureAuth();

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (input: SignInInput) => Promise<any>;
  register: (input: SignUpInput) => Promise<any>;
  logout: () => Promise<void>;
  checkUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUser();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('CognitoIdentityServiceProvider') || e.key?.includes('amplify')) {
        checkUser();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkUser();
      }
    };

    const handleAuthLogout = () => {
      setUser(null);
      window.location.href = '/';
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('auth:logout', handleAuthLogout);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('auth:logout', handleAuthLogout);
    };
  }, [checkUser]);

  const login = async ({ username, password }: SignInInput) => {
    const result = await signIn({ username, password });
    if (result.isSignedIn) {
      await checkUser();
    }
    return result;
  };

  const register = async ({ username, password, options }: SignUpInput) => {
    return await signUp({ username, password, options });
  };

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};