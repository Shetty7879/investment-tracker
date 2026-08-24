import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Investments } from './pages/Investments';
import { Monthly } from './pages/Monthly';
import { Goals } from './pages/Goals';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { MoneyTracker } from './pages/MoneyTracker';
import { Toast } from './components/Toast';

const AppContent: React.FC = () => {
  const { activeTab } = useApp();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'investments':
        return <Investments />;
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
      {renderActiveView()}
      <Toast />
    </DashboardLayout>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
