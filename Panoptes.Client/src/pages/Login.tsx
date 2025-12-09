import { useState, useEffect } from 'react';
import { LoginForm } from '../components/LoginForm';
import { OAuthButtons } from '../components/OAuthButtons';

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Apply dark mode for login page
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    return () => {};
  }, []);

  

  return (

    <div className="min-h-screen flex items-center justify-center bg-background dark:bg-void">
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-lg overflow-hidden shadow-2xl">
        {/* Left Side - Login Form */}
        <div className="bg-void text-ghost p-8 lg:p-12 flex flex-col justify-center">
          {/* Logo */}
          <div className="mb-8 lg:mb-12">
            <div className="flex items-center gap-2">
              <img src="/logo_panoptes.svg" alt="Panoptes Logo" className="h-8 w-8" />
              <span className="font-michroma text-sm tracking-[0.18em] uppercase text-foreground truncate">
                Panoptes
            </span>
            </div>
          </div>

          {/* Welcome Heading */}
          <div className="mb-8">
            <h1 className="text-4xl lg:text-2xl font-sans font-bold text-ghost mb-3">
              {mode === 'signin' ? 'WELCOME BACK' : 'CREATE ACCOUNT'}
            </h1>
            <p className="text-ghost/70 text-base font-mono tracking-tighter">
              {mode === 'signin'
                ? 'Enter your email and password to access your account.'
                : 'Sign up to start managing your webhooks and operations.'}
            </p>
          </div>

          {/* Forms */}
          <div className="flex-1">
            <OAuthButtons />
            <div className="flex items-center gap-4 my-6">
              <div className="flex-grow border-t border-ghost-dim"></div>
              <span className="text-ghost/70 text-sm font-medium">OR</span>
              <div className="flex-grow border-t border-ghost-dim"></div>
            </div>
            <LoginForm mode={mode} />
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-ghost-dim">
            {mode === 'signin' ? (
              <p className="text-ghost/70 text-sm font-mono">
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-sentinel hover:text-sentinel/80 font-semibold transition-colors"
                >
                  Sign up here
                </button>
              </p>
            ) : (
              <p className="text-ghost/70 text-sm">
                Already have an account?{' '}
                <button
                  onClick={() => setMode('signin')}
                  className="text-sentinel hover:text-sentinel/80 font-semibold transition-colors"
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Right Side - Hero Image */}
        <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-primary via-primary to-primary/80 p-12 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl -ml-20 -mb-20"></div>

          {/* Content */}
          <div className="relative z-10 text-center max-w-md">
            
          </div>
        </div>
      </div>
    </div>
  );
}
