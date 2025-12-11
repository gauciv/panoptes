import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { createContext, useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import SubscriptionDetail from './pages/SubscriptionDetail';
import Settings from './pages/Settings';
import Health from './pages/Health';
import { DashboardLayout } from './layouts/DashboardLayout';
import Landing from './pages/Landing';
import { AuthProvider, useAuth } from './context/AuthContext';

export const ThemeContext = createContext<{
  isDark: boolean;
  setIsDark: (v: boolean) => void;
}>({ isDark: false, setIsDark: () => {} });

// 1. Auth Guard: Protects the Dashboard
function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Silent loading state (or minimal spinner)
    return <div className="min-h-screen bg-black" />;
  }

  if (!user) {
    // If not logged in, kick them back to the Landing Page
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// 2. Guest Guard: Protects the Landing Page
// If they are already logged in, don't show them the landing page
function RedirectIfAuthenticated({ children }: { children: JSX.Element }) {
    const { user, loading } = useAuth();
    
    if (loading) return null;
    
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }
    
    return <>{children}</>;
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
    <AuthProvider>
      <ThemeContext.Provider value={{ isDark, setIsDark }}>
        <Toaster
            position="top-right"
            toastOptions={{
            style: { background: '#333', color: '#fff' },
            success: { style: { background: '#10b981', color: '#fff' } },
            error: { style: { background: '#ef4444', color: '#fff' } },
            }}
        />
        
        <Router>
            <Routes>
                {/* ROOT: Landing Page (Only for guests) */}
                <Route path="/" element={
                    <RedirectIfAuthenticated>
                        <Landing />
                    </RedirectIfAuthenticated>
                } />
                
                {/* APP: Protected Routes (Only for users) */}
                <Route element={<DashboardLayout />}>
                    {/* Dashboard is now at /dashboard, not / */}
                    <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
                    <Route path="/analytics" element={<RequireAuth><Dashboard /></RequireAuth>} />
                    <Route path="/health" element={<RequireAuth><Health /></RequireAuth>} />
                    <Route path="/subscriptions/:id" element={<RequireAuth><SubscriptionDetail /></RequireAuth>} />
                    <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
                </Route>

                {/* Catch-all: Send 404s back to root */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
      </ThemeContext.Provider>
    </AuthProvider>
  );
}

export default App;