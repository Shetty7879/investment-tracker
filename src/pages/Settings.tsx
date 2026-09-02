import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { ShieldAlert, Download, Upload, Trash2, Settings as SettingsIcon, RefreshCw } from 'lucide-react';
import { SwitchMode } from '../components/ui/switch-mode';

export const Settings: React.FC = () => {
  const {
    currency,
    setCurrency,
    monthlyTarget,
    setMonthlyTarget,
    clearAllData,
    exportData,
    importData,
    lastSyncedAt,
    migrateLocalData,
    isSyncing,
    userProfile,
    openEditProfile,
  } = useApp();

  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    import('../utils/supabase').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          setUserEmail(data.user.email || 'Authenticated User');
        }
      });
    });
  }, []);

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

        {/* Investor Profile Card */}
        <section className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0 mb-4 pb-2 border-b border-slate-100 dark:border-slate-850 uppercase tracking-wider text-[11px] text-slate-400 dark:text-slate-500">
            Investor Profile
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={userProfile.avatarUrl}
                alt="Profile Avatar"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop';
                }}
                className="h-14 w-14 rounded-full object-cover shadow-sm ring-2 ring-indigo-500/20"
              />
              <div>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white m-0">
                  {userProfile.fullName}
                </h4>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                  {userProfile.email}
                </p>
                <span className="inline-block mt-1 text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40">
                  {userProfile.investorTier || 'Free Tier'}
                </span>
              </div>
            </div>
            <button
              onClick={openEditProfile}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <span>Edit Profile</span>
            </button>
          </div>
        </section>

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
            <SwitchMode width={64} height={32} />
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
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-semibold shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-transparent hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
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
            {/* Export JSON */}
            <button
              onClick={exportData}
              className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 text-left transition-all cursor-pointer"
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
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 text-left transition-all cursor-pointer"
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
              className="flex items-center justify-between p-4 rounded-xl border border-red-200 hover:border-red-300 dark:border-red-500/10 dark:hover:border-red-500/30 bg-red-50 hover:bg-red-100 dark:bg-red-500/5 dark:hover:bg-red-500/10 text-left transition-all cursor-pointer"
            >
              <div>
                <span className="block text-sm font-bold text-red-650 dark:text-red-400">Clear All Database Logs</span>
                <span className="block text-xs text-slate-405 dark:text-slate-500 mt-0.5">Permanently wipe files</span>
              </div>
              <Trash2 className="h-5 w-5 text-red-500 flex-shrink-0" />
            </button>
          </div>
        </section>

        {/* Cloud Sync Configuration */}
        <section className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0 mb-4 pb-2 border-b border-slate-100 dark:border-slate-850 uppercase tracking-wider text-[11px] text-slate-400 dark:text-slate-555">
            Cloud Synchronization
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-250">
                  FridayTrack Cloud Service
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">
                  Securely backing up real investments to your personal cloud database.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${userEmail ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`}></span>
                <span className={`text-xs font-semibold ${userEmail ? 'text-emerald-600 dark:text-emerald-450' : 'text-slate-400 dark:text-slate-500'}`}>
                  {userEmail ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>

            {userEmail && (
              <div className="text-xs text-slate-450 dark:text-slate-500">
                Logged in as: <span className="font-semibold text-slate-650 dark:text-slate-350">{userEmail}</span>
              </div>
            )}

            <div className="border-t border-slate-100 dark:border-slate-850/60 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="block text-xs font-semibold text-slate-400 dark:text-slate-550">
                  Last Cloud Sync
                </span>
                <span className="block text-sm font-bold text-slate-700 dark:text-slate-200 mt-1">
                  {lastSyncedAt ? (
                    new Date(lastSyncedAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })
                  ) : (
                    'Not synced yet'
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    await migrateLocalData();
                  }}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Local Data'}</span>
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-400 dark:text-slate-555/80 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-850/60 rounded-xl p-3">
              Migration Status: <span className="font-semibold text-slate-700 dark:text-slate-300">
                {localStorage.getItem('supabase_migrated_v1') === 'true' ? 'Migrated' : 'Not migrated'}
              </span>
            </div>
          </div>
        </section>

        {/* Account & Security */}
        <section className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0 mb-4 pb-2 border-b border-slate-100 dark:border-slate-850 uppercase tracking-wider text-[11px] text-slate-400 dark:text-slate-500">
            Account & Security
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-250">
                Log Out of Account
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">
                Sign out of your session on this device.
              </p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to log out?')) {
                  import('../utils/supabase').then(({ supabase }) => supabase.auth.signOut());
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/10 hover:bg-red-50 dark:hover:bg-red-500/5 text-red-650 dark:text-red-450 font-semibold text-xs transition-all cursor-pointer"
            >
              Log Out
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
