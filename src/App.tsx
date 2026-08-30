import React, { useEffect, useState } from 'react';
import { supabase } from './utils/supabase';
import { AppProvider, useApp } from './contexts/AppContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Investments } from './pages/Investments';
import { Portfolio } from './pages/Portfolio';

import { Monthly } from './pages/Monthly';
import { Goals } from './pages/Goals';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { MoneyTracker } from './pages/MoneyTracker';
import { Toast } from './components/Toast';
import { PageTransition } from './components/PageTransition';
import Login from './pages/Login';

const AppContent: React.FC = () => {
  const { activeTab } = useApp();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'investments':
        return <Investments />;
      case 'portfolio':
        return <Portfolio />;

      case 'monthly':
        return <Monthly />;
      case 'goals':
        return <Goals />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'money-tracker':
        return <MoneyTracker />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <DashboardLayout>
      <PageTransition>{renderActiveView()}</PageTransition>
      <Toast />
    </DashboardLayout>
  );
};

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;