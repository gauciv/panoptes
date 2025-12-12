import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const SUN_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 4.75a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5A.75.75 0 0112 4.75zM12 19.25a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5a.75.75 0 01-.75-.75zM4.75 12a.75.75 0 01-.75-.75v-.5a.75.75 0 011.5 0v.5A.75.75 0 014.75 12zM19.25 12a.75.75 0 01-.75-.75v-.5a.75.75 0 011.5 0v.5a.75.75 0 01-.75.75zM6.22 6.22a.75.75 0 011.06 0l.35.35a.75.75 0 11-1.06 1.06l-.35-.35a.75.75 0 010-1.06zM16.37 16.37a.75.75 0 011.06 0l.35.35a.75.75 0 11-1.06 1.06l-.35-.35a.75.75 0 010-1.06zM6.22 17.78a.75.75 0 010-1.06l.35-.35a.75.75 0 111.06 1.06l-.35.35a.75.75 0 01-1.06 0zM16.37 7.63a.75.75 0 010-1.06l.35-.35a.75.75 0 111.06 1.06l-.35.35a.75.75 0 01-1.06 0zM12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" />
  </svg>
);

const MOON_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
);

type Props = {
  isDark?: boolean;
  toggle?: () => void;
  compact?: boolean;
};

export default function ThemeToggle({ isDark: isDarkProp, toggle, compact }: Props): JSX.Element {
  const [isDarkLocal, setIsDarkLocal] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
    } catch (e) {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const isControlled = typeof isDarkProp === 'boolean';
  const isDark = isControlled ? (isDarkProp as boolean) : isDarkLocal;

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch (e) {}
  }, [isDark]);

  const handleClick = () => {
    if (isControlled) {
      toggle && toggle();
    } else {
      setIsDarkLocal(s => !s);
    }
  };
  
  // Only use portal when NOT controlled (i.e., when used standalone)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const usePortal = !isControlled;

  useEffect(() => {
    if (!usePortal) return;
    
    const settingsLink = document.querySelector('a[href="/settings"]');
    if (settingsLink && settingsLink.parentElement) {
      const container = document.createElement('div');
      container.className = 'mr-2 flex items-center';
      settingsLink.parentElement.insertBefore(container, settingsLink);
      setPortalTarget(container);

      return () => {
        try { container.remove(); } catch (e) {}
      };
    }
    return;
  }, [usePortal]);
 
   const toggleButton = compact ? (
    <button
      aria-pressed={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      onClick={handleClick}
      className="inline-flex items-center justify-center p-2 rounded-tech border border-border bg-transparent hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
    >
      <span className={isDark ? 'text-white' : 'text-yellow-400'}>{isDark ? MOON_ICON : SUN_ICON}</span>
    </button>
   ) : (
     <button
       role="switch"
       aria-checked={isDark}
       aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
       title={isDark ? 'Light mode' : 'Dark mode'}
       onClick={handleClick}
       className="relative inline-flex items-center p-1 w-14 h-8 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
     >
      {/* Background oblong: light green gradient when inactive, green->dark-green when active */}
      <span
        className={`absolute inset-0 rounded-full transition-colors bg-gradient-to-r ${isDark ? 'from-green-600 to-green-800 shadow-[0_6px_18px_rgba(0,106,51,0.14)]' : 'from-green-50 to-green-100'}`}
      />

      {/* Knob with icon inside */}
      <span
        className={`relative z-10 flex items-center justify-center bg-white w-7 h-7 rounded-full shadow-md transform transition-all ${isDark ? 'translate-x-5' : 'translate-x-0'}`}
      >
        <span className={isDark ? 'text-slate-700' : 'text-yellow-400'}>{isDark ? MOON_ICON : SUN_ICON}</span>
      </span>
     </button>
   );
 
   if (usePortal && portalTarget) return createPortal(toggleButton, portalTarget);
   return toggleButton;
}
