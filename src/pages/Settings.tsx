import React, { useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { Moon, Sun, RotateCcw, ShieldAlert, Download, Upload, Trash2, Target, Settings as SettingsIcon } from 'lucide-react';

export const Settings: React.FC = () => {
  const {
    theme,
    toggleTheme,
    currency,
    setCurrency,
    monthlyTarget,
    setMonthlyTarget,
    loadDemoData,
    clearDemoData,
    hasDemoData,
    loadDemoGoals,
    clearDemoGoals,
    hasDemoGoals,
    clearAllData,
    exportData,
    importData,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 0) {
      setMonthlyTarget(val);
    } else if (e.target.value === '') {
      setMonthlyTarget(0);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          importData(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const currencies: { code: 'INR' | 'USD' | 'EUR'; symbol: string; label: string }[] = [
    { code: 'INR', symbol: '₹', label: 'Indian Rupee (INR)' },
    { code: 'USD', symbol: '$', label: 'US Dollar (USD)' },
    { code: 'EUR', symbol: '€', label: 'Euro (EUR)' },
  ];

  return (
    <div className="space-y-6 animate-slide-in max-w-3xl mx-auto pb-8">
      {/* Header Banner */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold m-0">⚙️ Settings</h2>
          <p className="text-sm text-slate-405 dark:text-slate-500 m-0">
            Configure application theme, currency settings, targets, and local database actions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Appearance Configuration */}
        <section className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0 mb-4 pb-2 border-b border-slate-100 dark:border-slate-850 uppercase tracking-wider text-[11px] text-slate-400 dark:text-slate-500">
            Theme Configuration
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-250">
                Application Style Mode
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">
                Toggle between Light mode and Dark mode layouts.
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition-all"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 text-amber-500" />
                  <span>Light Theme</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-indigo-500" />
                  <span>Dark Theme</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Currency Preferences */}
        <section className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0 mb-4 pb-2 border-b border-slate-100 dark:border-slate-850 uppercase tracking-wider text-[11px] text-slate-400 dark:text-slate-500">
            Currency Selector
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-550 mb-4">
            Select the currency prefix for all assets rendering. Internal numerical values are safe from corruption.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {currencies.map(curr => {
              const isSelected = currency === curr.code;
              return (
                <button
                  key={curr.code}
                  onClick={() => setCurrency(curr.code)}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="text-lg font-bold select-none h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 flex-shrink-0">
                    {curr.symbol}
                  </span>
                  <div>
                    <span className="block text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase">
                      {curr.code}
                    </span>
                    <span className="block text-xs truncate">
                      {curr.label.split(' ')[0]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Savings targets */}
        <section className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0 mb-4 pb-2 border-b border-slate-100 dark:border-slate-850 uppercase tracking-wider text-[11px] text-slate-400 dark:text-slate-500">
            Monthly Target Setup
          </h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="target-input" className="block text-sm font-semibold text-slate-850 dark:text-slate-200 mb-1">
                Target Monthly Investment
              </label>
              <p className="text-xs text-slate-400 dark:text-slate-550 mb-3">
                Specify your savings target. All progress calculators evaluate actual logs against this threshold.
              </p>
            </div>
            <div className="relative max-w-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-450 dark:text-slate-500 font-bold text-sm">
                {currency === 'INR' ? '₹' : currency === 'USD' ? '$' : '€'}
              </div>
              <input
                id="target-input"
                type="number"
                value={monthlyTarget || ''}
                onChange={handleTargetChange}
                placeholder="0"
                min="0"
                className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-3 pl-9 pr-4 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </section>

        {/* Database administration */}
        <section className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0 mb-4 pb-2 border-b border-slate-100 dark:border-slate-850 uppercase tracking-wider text-[11px] text-slate-400 dark:text-slate-500">
            Data Portability & Portfolios
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-550 mb-4">
            Import or export your local portfolio backup logs. Wiping the database resets configurations instantly.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Load demo investments */}
            <button
              onClick={loadDemoData}
              className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left transition-all cursor-pointer"
            >
              <div>
                <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">Load Mock Portfolio</span>
                <span className="block text-xs text-slate-400 dark:text-slate-550 mt-0.5">Populate demo investments</span>
              </div>
              <RotateCcw className="h-5 w-5 text-indigo-500 flex-shrink-0" />
            </button>

            {/* Load demo goals */}
            <button
              onClick={loadDemoGoals}
              className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left transition-all cursor-pointer"
            >
              <div>
                <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">Load Demo Goals</span>
                <span className="block text-xs text-slate-400 dark:text-slate-550 mt-0.5">Populate sample milestone goals</span>
              </div>
              <Target className="h-5 w-5 text-purple-500 flex-shrink-0" />
            </button>

            {/* Clear Demo Investments */}
            {hasDemoData && (
              <button
                onClick={clearDemoData}
                className="flex items-center justify-between p-4 rounded-xl border border-amber-500/10 hover:border-amber-500/30 bg-amber-505/5 hover:bg-amber-500/10 text-left transition-all cursor-pointer"
              >
                <div>
                  <span className="block text-sm font-bold text-amber-650 dark:text-amber-400">Clear Demo Investments</span>
                  <span className="block text-xs text-slate-405 dark:text-slate-500 mt-0.5">Remove preloaded investments</span>
                </div>
                <Trash2 className="h-5 w-5 text-amber-500 flex-shrink-0" />
              </button>
            )}

            {/* Clear Demo Goals */}
            {hasDemoGoals && (
              <button
                onClick={clearDemoGoals}
                className="flex items-center justify-between p-4 rounded-xl border border-amber-500/10 hover:border-amber-500/30 bg-amber-505/5 hover:bg-amber-500/10 text-left transition-all cursor-pointer"
              >
                <div>
                  <span className="block text-sm font-bold text-amber-650 dark:text-amber-400">Clear Demo Goals</span>
                  <span className="block text-xs text-slate-405 dark:text-slate-500 mt-0.5">Remove preloaded goals</span>
                </div>
                <Trash2 className="h-5 w-5 text-amber-500 flex-shrink-0" />
              </button>
            )}

            {/* Export JSON */}
            <button
              onClick={exportData}
              className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left transition-all"
            >
              <div>
                <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">Export JSON Backup</span>
                <span className="block text-xs text-slate-400 dark:text-slate-550 mt-0.5">Save logs to file</span>
              </div>
              <Download className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            </button>

            {/* Import JSON */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFile}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={triggerFileSelect}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left transition-all"
              >
                <div>
                  <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">Import Portfolio Backup</span>
                  <span className="block text-xs text-slate-400 dark:text-slate-550 mt-0.5">Load previously saved JSON</span>
                </div>
                <Upload className="h-5 w-5 text-sky-500 flex-shrink-0" />
              </button>
            </div>

            {/* Wipe database */}
            <button
              onClick={() => {
                if (window.confirm('Are you sure? This will permanently delete all locally stored investment data.')) {
                  clearAllData();
                }
              }}
              className="flex items-center justify-between p-4 rounded-xl border border-red-500/10 hover:border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-left transition-all"
            >
              <div>
                <span className="block text-sm font-bold text-red-650 dark:text-red-400">Clear All Database Logs</span>
                <span className="block text-xs text-slate-405 dark:text-slate-500 mt-0.5">Permanently wipe files</span>
              </div>
              <Trash2 className="h-5 w-5 text-red-500 flex-shrink-0" />
            </button>
          </div>
        </section>

        {/* Privacy Notices Card */}
        <section className="bg-indigo-500/5 dark:bg-indigo-950/10 border border-indigo-500/15 rounded-2xl p-5 flex items-start gap-3.5">
          <ShieldAlert className="h-6 w-6 text-indigo-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-indigo-650 dark:text-indigo-400 m-0">Local Privacy Policy</h4>
            <p className="text-xs text-indigo-900/70 dark:text-slate-350 leading-relaxed mt-1 mb-0">
              Your investment data is stored locally in this browser. No broker credentials, trading credentials, financial account passwords, API keys, bank PINs, or card details are requested or stored.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
};
