import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import React, { createContext, useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import SubscriptionDetail from './pages/SubscriptionDetail';
import Settings from './pages/Settings';
import ThemeToggle from './ThemeToggle';

export const ThemeContext = createContext<{
  isDark: boolean;
  setIsDark: (v: boolean) => void;
}>({ isDark: false, setIsDark: () => {} });

function RoutesWithToggle() {
  const location = useLocation();
  const { isDark, setIsDark } = React.useContext(ThemeContext);

  return (
    <>
      {/* Conditionally render the toggle on the dashboard upper-right */}
      {location.pathname === '/' && (
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle isDark={isDark} toggle={() => setIsDark(!isDark)} />
        </div>
      )}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/subscriptions/:id" element={<SubscriptionDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </>
  );
}

function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
    } catch (e) {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch (e) {}
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark }}>
      <Router>
        <RoutesWithToggle />
      </Router>
    </ThemeContext.Provider>
  );
}

export default App;

