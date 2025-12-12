import { BrowserRouter as Router, Routes, Route, Navigate, useLocation} from 'react-router-dom';
import { createContext, useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import SubscriptionDetail from './pages/SubscriptionDetail';
import Settings from './pages/Settings';
import Health from './pages/Health';
import { DashboardLayout } from './layouts/DashboardLayout';
import Landing from './pages/Landing';
import { useScrollbarTheme } from './hooks/useScrollbarTheme';
import { useAuth, AuthProvider } from './context/AuthContext'; // 1. Import AuthProvider
import { CustomCursor } from './pages/landing/components/Cursor';


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

  // Apply scrollbar theme dynamically
  useScrollbarTheme(isDark);

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark }}>
      <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'font-mono text-sm', 
            style: {
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '12px 16px',
              color: '#F0F0F0',
              backgroundColor: '#050505', 
              borderRadius: '2px', 
            },
            
            success: {
              iconTheme: {
                primary: '#00FF94', 
                secondary: 'black',
              },
              style: {
                border: '1px solid rgba(0, 255, 148, 0.2)',
              },
            },

            error: {
              iconTheme: {
                primary: '#EF4444', 
                secondary: 'black',
              },
              style: {
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                color: '#FFDDDD',
              },
            },
          }}
        />
      <CustomCursor/>
      <AuthProvider>
        
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