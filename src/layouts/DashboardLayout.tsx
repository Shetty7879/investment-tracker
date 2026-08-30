import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import SplashScreen from '../components/SplashScreen';
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  Target,
  BarChart3,
  Settings,
  Sun,
  Moon,
  User,
  Coins,
  Wallet,
  Menu,
  X
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [showSplash, setShowSplash] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timeout = prefersReduced ? 200 : 1300;
    const timer = setTimeout(() => setShowSplash(false), timeout);
    return () => clearTimeout(timer);
  }, []);
  const { theme, toggleTheme, activeTab, navigateTo } = useApp();

  const navigationItems = [
    { id: 'dashboard', name: '📊 Dashboard', icon: LayoutDashboard },
    { id: 'investments', name: '📈 Investments', icon: Briefcase },
    { id: 'portfolio', name: '💼 Portfolio', icon: Wallet },
    { id: 'monthly', name: '🗓️ Monthly', icon: Calendar },
    { id: 'goals', name: '🎯 Goals', icon: Target },
    { id: 'reports', name: '📑 Reports', icon: BarChart3 },
    { id: 'money-tracker', name: '💸 Money Tracker', icon: Coins },
    { id: 'settings', name: '⚙️ Settings', icon: Settings },
  ];

  // Map active tab to page headers
  const pageHeaders: Record<string, string> = {
    dashboard: '📊 Dashboard',
    investments: '📈 Investments Portfolio',
    portfolio: '💼 Portfolio',
    monthly: '🗓️ Monthly Target & Goals',
    goals: '🎯 Financial Goals',
    reports: '📑 Investment Reports',
    settings: '⚙️ System Settings',
    'money-tracker': '💸 Money Tracker',
  };

  const getTodayDateString = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    return new Date().toLocaleDateString('en-US', options);
  };

  const renderSidebarContent = (isMobile = false) => {
    return (
      <>
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-150 dark:border-slate-850 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Logo" className="h-9 w-9 object-contain" />
            <div>
              <span className="font-brand font-semibold text-xl bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-indigo-200 bg-clip-text text-transparent">
                Friday
              </span>
              <span className="block text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                INVEST TRACK
              </span>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navigationItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigateTo(item.id);
                  if (isMobile) setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer group ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 border-l-4 border-indigo-500 pl-3 shadow-sm'
                    : 'text-slate-550 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <Icon className={`h-5 w-5 group-hover:scale-105 transition-transform duration-150 ${isActive ? 'text-indigo-500' : 'text-slate-405 dark:text-slate-550'}`} />
                </div>
                <span className="text-left flex-1 select-none whitespace-normal leading-tight">
                  {item.name}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Profile Info */}
        <div className="p-4 border-t border-slate-150 dark:border-slate-855 bg-slate-50/50 dark:bg-slate-900/10">
          <button
            onClick={() => {
              navigateTo('settings');
              if (isMobile) setIsMobileSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 text-left transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-650 dark:text-indigo-400">
              <User className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <span className="block font-semibold text-sm truncate text-slate-900 dark:text-white">Investor Profile</span>
              <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate">Free Tier</span>
            </div>
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="min-height-screen flex flex-col bg-[#f8fafc] text-slate-800 dark:bg-[#08090d] dark:text-slate-100 min-h-screen transition-colors duration-200 animate-fade-in">
      {showSplash && <SplashScreen />}
      
      {/* Mobile Drawer Sidebar */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-200 ${
          isMobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Overlay backdrop */}
        <div
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
        {/* Drawer panel */}
        <aside
          className={`absolute inset-y-0 left-0 w-64 bg-white dark:bg-[#0d0f17] flex flex-col border-r border-slate-200 dark:border-slate-850 h-full shadow-2xl transition-transform duration-300 ease-out transform ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {renderSidebarContent(true)}
        </aside>
      </div>

      <div className="flex flex-1">
        {/* Desktop Sticky Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-850 bg-white dark:bg-[#0d0f17] shrink-0 sticky top-0 h-screen animate-slide-in">
          {renderSidebarContent(false)}
        </aside>

        {/* Main Content Pane */}
        <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
          {/* Header */}
          <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#08090d]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-855 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between transition-colors">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e111a] hover:bg-slate-55 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-405 cursor-pointer transition-all active:scale-95 flex items-center justify-center"
                aria-label="Open Navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-950 dark:text-white capitalize tracking-tight m-0">
                  {pageHeaders[activeTab] || 'Investment Tracker'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-550 mt-0.5">
                  {getTodayDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e111a] hover:bg-indigo-50/40 hover:border-indigo-500/20 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-95 shadow-sm cursor-pointer"
                aria-label={theme === 'dark' ? 'Activate Light Mode' : 'Activate Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-indigo-500" />}
              </button>

              {/* Profile Shortcut */}
              <button
                onClick={() => navigateTo('settings')}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e111a] hover:bg-indigo-50/40 hover:border-indigo-500/20 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-95 shadow-sm cursor-pointer"
                aria-label="Profile Settings"
              >
                <User className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* Main Dashboard Container */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto animate-fade-in">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0a0c14]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-850 px-1 py-2 flex items-center justify-around shadow-2xl">
        {navigationItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const cleanName = item.name.replace(/^[^\s]+\s+/, '');
          return (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer ${
                isActive
                  ? 'text-indigo-650 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title={cleanName}
            >
              <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[9px] font-bold tracking-wide hidden sm:block">{cleanName}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
