import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { OwnerDashboard } from './components/OwnerDashboard';
import { StaffDashboard } from './components/StaffDashboard';
// ...existing code...
import { supabase, functionsBase } from './utils/supabase/info';

export type User = {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'staff' | 'admin';
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'login' | 'register'>('login');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkSession();
  }, []);
  // Helper that races fetch against a timeout to avoid hanging the UI.
  const fetchWithTimeout = (resource: RequestInfo, options: RequestInit = {}, timeout = 8000) => {
    return Promise.race([
      fetch(resource, options),
      new Promise((_res, rej) => setTimeout(() => rej(new Error('Fetch timeout')), timeout)),
    ]) as Promise<Response>;
  };

  const fetchUserProfile = async (token: string): Promise<boolean> => {
    try {
      console.debug('Fetching profile from functions at', functionsBase);
      const response = await fetchWithTimeout(`${functionsBase}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      }, 8000);

      if (!response.ok) {
        console.warn('Profile fetch returned non-OK status', response.status);
        return false;
      }

      const data = await response.json();
      if (!data.profile || typeof data.profile !== 'object' || !data.profile.id) {
        setUser(null);
        return false;
      }
      setUser(data.profile);
      return true;
    } catch (error) {
      console.error('Profile fetch error:', error);
      return false;
    }
  };

  const checkSession = async () => {
    console.debug('Checking session...');
    try {
      const { data } = await supabase.auth.getSession();

      if (data?.session?.access_token) {
        const token = data.session.access_token;
        setAccessToken(token);
        const ok = await fetchUserProfile(token);
        setIsAuthenticated(!!ok);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
      console.debug('Session check complete, isAuthenticated=', isAuthenticated);
    }
  };

  const handleLoginSuccess = async (token: string) => {
    setAccessToken(token);
    await fetchUserProfile(token);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setAccessToken(null);
    setUser(null);
    setView('login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent to-accent-blue">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent to-accent-blue">
        {view === 'login' ? (
          <Login onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setView('register')} />
        ) : (
          <Register onRegisterSuccess={handleLoginSuccess} onSwitchToLogin={() => setView('login')} />
        )}

        {/* QuickLogin fallback removed for production */}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600">Error: No user data available.</h2>
          <p className="mt-2 text-gray-600">Please log in again or contact support.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {user.role === 'owner' ? (
        <OwnerDashboard 
          user={user} 
          accessToken={accessToken!} 
          onLogout={handleLogout}
        />
      ) : (
        <StaffDashboard 
          user={user} 
          accessToken={accessToken!} 
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}