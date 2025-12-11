import { BrowserRouter as Router, Routes, Route, Navigate, useLocation} from 'react-router-dom';
import { createContext, useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import SubscriptionDetail from './pages/SubscriptionDetail';
import Settings from './pages/Settings';
import Health from './pages/Health';
import { DashboardLayout } from './layouts/DashboardLayout';
import Landing from './pages/Landing';
import { useAuth, AuthProvider } from './context/AuthContext'; // 1. Import AuthProvider

export const ThemeContext = createContext<{
  isDark: boolean;
  setIsDark: (v: boolean) => void;
}>({ isDark: false, setIsDark: () => {} });

// --- GUARDS ---

// 1. Auth Guard: Protects the Dashboard Routes
function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen bg-black" />; // Silent loading
  }

  if (!user) {
    // Redirect them to the Landing Page ("/") if not logged in
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// 2. Guest Guard: Redirects logged-in users away from Landing
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
    <ThemeContext.Provider value={{ isDark, setIsDark }}>
      {/* 2. WRAP EVERYTHING IN AUTHPROVIDER */}
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#333', color: '#fff' },
            success: {
              style: { background: '#10b981', color: '#fff' },
              iconTheme: { primary: '#fff', secondary: '#10b981' },
            },
            error: {
              style: { background: '#ef4444', color: '#fff' },
              iconTheme: { primary: '#fff', secondary: '#ef4444' },
            },
          }}
        />
        
        <Router>
          <Routes>
            {/* PUBLIC ROUTE: Landing Page 
                Wrapped in RedirectIfAuthenticated so logged-in users go straight to dashboard 
            */}
            <Route 
                path="/" 
                element={
                    <RedirectIfAuthenticated>
                        <Landing />
                    </RedirectIfAuthenticated>
                } 
            />

            {/* PROTECTED ROUTES: Dashboard Area 
                Moved to "/dashboard" to avoid conflict with Landing
            */}
            <Route 
                path="/dashboard" 
                element={
                    <RequireAuth>
                        <DashboardLayout />
                    </RequireAuth>
                }
            >
              <Route index element={<Dashboard />} />
              <Route path="analytics" element={<Dashboard />} />
              <Route path="health" element={<Health />} />
              <Route path="subscriptions/:id" element={<SubscriptionDetail />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </Router>
      </AuthProvider>
    </ThemeContext.Provider>
  );
}

export default App;