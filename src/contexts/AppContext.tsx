import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/localStorage';
import type { Investment, Goal, Transaction, MoneyRecord } from '../types';
import {
  DEFAULT_INVESTMENTS,
  DEFAULT_GOALS
} from '../data/demoData';
import { fetchMarketPrices } from '../services/marketDataService';
import type { MarketPriceData } from '../services/marketDataService';
import { isIndianMarketOpen } from '../services/portfolioCalculationService';
import {
  loadFridayTrackData,
  saveFridayTrackData,
  migrateLocalStorageToSupabase
} from '../services/fridaytrackDataService';

const migrateMoneyRecords = (records: any[]): MoneyRecord[] => {
  if (!records || !Array.isArray(records)) return [];
  return records.map(r => {
    if (r && r.type === undefined) {
      return {
        id: r.id,
        type: 'receive',
        personName: r.personName || '',
        amount: r.amountGiven !== undefined ? r.amountGiven : (r.amount || 0),
        amountPaid: r.amountReceived !== undefined ? r.amountReceived : (r.amountPaid || 0),
        date: r.dateGiven || r.date || new Date().toISOString().split('T')[0],
        dueDate: r.expectedReturnDate || r.dueDate,
        note: r.note || '',
        isDemo: !!r.isDemo,
        createdAt: r.createdAt || new Date().toISOString(),
        updatedAt: r.updatedAt || new Date().toISOString()
      };
    }
    return r;
  });
};

interface ToastData {
  message: string;
  type?: 'success' | 'info' | 'warning';
}

type OwnerFilterType = 'Me' | 'Other' | 'All';
type DataTypeFilterType = 'Real' | 'Demo' | 'All';

interface AppContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  currency: 'INR' | 'USD' | 'EUR';
  setCurrency: (currency: 'INR' | 'USD' | 'EUR') => void;
  monthlyTarget: number;
  setMonthlyTarget: (target: number) => void;
  investments: Investment[];
  addInvestment: (inv: Omit<Investment, 'id'>) => void;
  updateInvestment: (inv: Investment) => void;
  deleteInvestment: (id: string) => void;
  goals: Goal[];
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (goal: Goal) => void;
  deleteGoal: (id: string) => void;
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (tx: Transaction) => void;
  moneyRecords: MoneyRecord[];
  addMoneyRecord: (record: Omit<MoneyRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMoneyRecord: (record: MoneyRecord) => void;
  deleteMoneyRecord: (id: string) => void;
  markMoneyRecordReceived: (id: string) => void;
  resetData: () => void;
  loadDemoData: () => void;
  clearDemoData: () => void;
  hasDemoData: boolean;
  loadDemoGoals: () => void;
  clearDemoGoals: () => void;
  hasDemoGoals: boolean;
  clearAllData: () => void;
  exportData: () => void;
  importData: (jsonStr: string) => boolean;
  formatCurrency: (value: number) => string;
  toast: ToastData | null;
  showToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
  hideToast: () => void;
  activeTab: string;
  navigateTo: (tab: string) => void;
  ownerFilter: OwnerFilterType;
  setOwnerFilter: (filter: OwnerFilterType) => void;
  dataTypeFilter: DataTypeFilterType;
  setDataTypeFilter: (filter: DataTypeFilterType) => void;
  marketPrices: Record<string, MarketPriceData>;
  refreshMarketPrices: () => Promise<void>;
  isRefreshingPrices: boolean;
  isCloudDataLoading: boolean;
  lastSyncedAt: string | null;
  migrateLocalData: () => Promise<boolean>;
  isSyncing: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 15);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return storage.get<'dark' | 'light'>('theme_pref', 'light');
  });

  const [currency, setCurrencyState] = useState<'INR' | 'USD' | 'EUR'>(() => {
    return storage.get<'INR' | 'USD' | 'EUR'>('currency_pref', 'INR');
  });

  const [monthlyTarget, setMonthlyTargetState] = useState<number>(() => {
    return storage.get<number>('monthly_target_pref', 0);
  });

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [moneyRecords, setMoneyRecords] = useState<MoneyRecord[]>([]);
  const [isCloudDataLoading, setIsCloudDataLoading] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const migrateLocalData = async (): Promise<boolean> => {
    if (isSyncing) return false;
    setIsSyncing(true);
    try {
      showToast('Syncing local data with cloud...', 'info');
      const result = await migrateLocalStorageToSupabase();
      if (result.success) {
        showToast('Sync complete! Local data is now secured in the cloud.', 'success');
        const updatedCloud = await loadFridayTrackData();
        if (updatedCloud) {
          setInvestments(updatedCloud.investments);
          setTransactions(updatedCloud.transactions);
          setGoals(updatedCloud.goals);
          setMoneyRecords(updatedCloud.money_records);
          if (updatedCloud.updated_at) {
            setLastSyncedAt(updatedCloud.updated_at);
          }
        }
        return true;
      } else {
        showToast(`Sync failed: ${result.message}`, 'warning');
        return false;
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'An error occurred during local data sync.', 'warning');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const [toast, setToast] = useState<ToastData | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilterType>('Me');
  const [dataTypeFilter, setDataTypeFilter] = useState<DataTypeFilterType>('Real');

  const [marketPrices, setMarketPrices] = useState<Record<string, MarketPriceData>>(() => {
    const rawCache = storage.get<Record<string, MarketPriceData>>('market_price_cache', {});
    const normalized: Record<string, MarketPriceData> = {};
    Object.entries(rawCache).forEach(([key, val]) => {
      normalized[key.toUpperCase()] = val;
    });
    return normalized;
  });
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);

  // Hash-based Router State
  const [activeTab, setActiveTab] = useState<string>(() => {
    const hash = window.location.hash.replace('#/', '');
    const validTabs = ['dashboard', 'investments', 'monthly', 'goals', 'reports', 'settings', 'money-tracker'];
    return validTabs.includes(hash) ? hash : 'dashboard';
  });

  // Helper to push state changes to Supabase
  const syncWithCloud = async (
    nextInvs: Investment[],
    nextTxs: Transaction[],
    nextGoals: Goal[],
    nextMoney: MoneyRecord[]
  ): Promise<boolean> => {
    try {
      const success = await saveFridayTrackData({
        investments: nextInvs,
        transactions: nextTxs,
        goals: nextGoals,
        money_records: nextMoney,
        preferences: { theme, currency, monthlyTarget }
      });
      if (success) {
        setLastSyncedAt(new Date().toISOString());
      }
      return success;
    } catch (err: any) {
      console.error('Cloud synchronization error:', err);
      showToast(err.message || 'Failed to sync with FridayTrack cloud database.', 'warning');
      return false;
    }
  };

  // Initial cloud loading and migration flow
  useEffect(() => {
    let active = true;

    const initData = async () => {
      try {
        const cloudData = await loadFridayTrackData();
        if (!active) return;

        if (cloudData) {
          setInvestments(cloudData.investments);
          setTransactions(cloudData.transactions);
          setGoals(cloudData.goals);
          setMoneyRecords(cloudData.money_records);

          if (cloudData.preferences) {
            const prefs = cloudData.preferences;
            if (prefs.theme && (prefs.theme === 'dark' || prefs.theme === 'light')) {
              setTheme(prefs.theme);
            }
            if (prefs.currency && (prefs.currency === 'INR' || prefs.currency === 'USD' || prefs.currency === 'EUR')) {
              setCurrencyState(prefs.currency);
            }
            if (typeof prefs.monthlyTarget === 'number') {
              setMonthlyTargetState(prefs.monthlyTarget);
            }
          }
        }

        // Local storage one-time migration check
        const isMigrated = localStorage.getItem('supabase_migrated_v1') === 'true';
        if (!isMigrated) {
          const localInvs = storage.get<Investment[]>('investments', []).filter(i => !i.isDemo);
          const localTxs = storage.get<Transaction[]>('transactions', []).filter(t => !t.isDemo);
          const localGoals = storage.get<Goal[]>('goals', []).filter(g => !g.isDemo);
          const localMoneyRaw = storage.get<any[]>('moneyTracker', []) || storage.get<any[]>('money_records', []);
          const hasLocalRealData = localInvs.length > 0 || localTxs.length > 0 || localGoals.length > 0 || localMoneyRaw.some(m => !m.isDemo);

          if (hasLocalRealData) {
            showToast('Syncing local data with cloud...', 'info');
            const migrationResult = await migrateLocalStorageToSupabase();
            if (migrationResult.success) {
              showToast('Sync complete! Local data is now secured in the cloud.', 'success');
              const updatedCloud = await loadFridayTrackData();
              if (updatedCloud && active) {
                setInvestments(updatedCloud.investments);
                setTransactions(updatedCloud.transactions);
                setGoals(updatedCloud.goals);
                setMoneyRecords(updatedCloud.money_records);
              }
            } else {
              showToast(`Local sync warning: ${migrationResult.message}`, 'warning');
            }
          } else {
            localStorage.setItem('supabase_migrated_v1', 'true');
          }
        }
      } catch (err: any) {
        console.error('Initial data load failed:', err);
        showToast('Failed to load cloud profile. Operating in local mode.', 'warning');
      } finally {
        if (active) {
          setIsCloudDataLoading(false);
        }
      }
    };

    initData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    storage.set('theme_pref', theme);
  }, [theme]);

  // Handle toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Handle routing state on hash change
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      const validTabs = ['dashboard', 'investments', 'monthly', 'goals', 'reports', 'settings', 'money-tracker'];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      } else if (hash === '') {
        setActiveTab('dashboard');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (tab: string) => {
    window.location.hash = `#/${tab}`;
    setActiveTab(tab);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    storage.set('theme_pref', nextTheme);
    saveFridayTrackData({
      investments,
      transactions,
      goals,
      money_records: moneyRecords,
      preferences: { theme: nextTheme, currency, monthlyTarget }
    }).catch(err => console.error('Failed to sync theme preference:', err));
  };

  const setCurrency = (curr: 'INR' | 'USD' | 'EUR') => {
    setCurrencyState(curr);
    storage.set('currency_pref', curr);
    saveFridayTrackData({
      investments,
      transactions,
      goals,
      money_records: moneyRecords,
      preferences: { theme, currency: curr, monthlyTarget }
    }).catch(err => console.error('Failed to sync currency preference:', err));
  };

  const setMonthlyTarget = (target: number) => {
    setMonthlyTargetState(target);
    storage.set('monthly_target_pref', target);
    saveFridayTrackData({
      investments,
      transactions,
      goals,
      money_records: moneyRecords,
      preferences: { theme, currency, monthlyTarget: target }
    }).catch(err => console.error('Failed to sync monthly target preference:', err));
  };

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

  // CRUD for Investments (User additions set isDemo: false and default owner to Me)
  const addInvestment = async (inv: Omit<Investment, 'id'>) => {
    const buyDate = inv.buyDate || inv.purchaseDate || new Date().toISOString().split('T')[0];
    const category = inv.category || inv.assetType || 'Stocks';

    const newInv: Investment = {
      ...inv,
      id: generateId(),
      category,
      assetType: category,
      buyDate,
      purchaseDate: buyDate,
      quantity: inv.quantity ?? 1,
      buyPrice: inv.buyPrice ?? 0,
      currentPrice: (category === 'Stocks' || category === 'ETFs') ? inv.currentPrice : (inv.currentPrice ?? inv.buyPrice ?? 0),
      charges: inv.charges ?? 0,
      owner: inv.owner || 'Me',
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const firstTx: Transaction = {
      id: generateId(),
      investmentId: newInv.id,
      type: 'BUY',
      quantity: newInv.quantity,
      price: newInv.buyPrice,
      amount: newInv.quantity * newInv.buyPrice,
      charges: newInv.charges,
      date: buyDate,
      notes: 'Initial purchase',
      isDemo: false,
      createdAt: new Date().toISOString()
    };

    const nextInvs = [...investments, newInv];
    const nextTxs = [...transactions, firstTx];

    const success = await syncWithCloud(nextInvs, nextTxs, goals, moneyRecords);
    if (success) {
      setInvestments(nextInvs);
      setTransactions(nextTxs);
      showToast('Investment added successfully!', 'success');
    }
  };

  const updateInvestment = async (updated: Investment) => {
    const nextInvs = investments.map(inv => {
      if (inv.id === updated.id) {
        return {
          ...inv,
          ...updated,
          updatedAt: new Date().toISOString()
        };
      }
      return inv;
    });

    const success = await syncWithCloud(nextInvs, transactions, goals, moneyRecords);
    if (success) {
      setInvestments(nextInvs);
      showToast('Investment updated successfully!', 'success');
    }
  };

  const deleteInvestment = async (id: string) => {
    const nextInvs = investments.filter(inv => inv.id !== id);
    const nextTxs = transactions.filter(tx => tx.investmentId !== id);

    const success = await syncWithCloud(nextInvs, nextTxs, goals, moneyRecords);
    if (success) {
      setInvestments(nextInvs);
      setTransactions(nextTxs);
      showToast('Investment removed successfully.', 'info');
    }
  };

  // CRUD for Transactions
  const addTransaction = async (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...tx,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    const nextTxs = [...transactions, newTx];

    const success = await syncWithCloud(investments, nextTxs, goals, moneyRecords);
    if (success) {
      setTransactions(nextTxs);
      showToast('Transaction added successfully!', 'success');
    }
  };

  const deleteTransaction = async (id: string) => {
    const nextTxs = transactions.filter(t => t.id !== id);

    const success = await syncWithCloud(investments, nextTxs, goals, moneyRecords);
    if (success) {
      setTransactions(nextTxs);
      showToast('Transaction deleted successfully.', 'info');
    }
  };

  const updateTransaction = async (updated: Transaction) => {
    const nextTxs = transactions.map(t => t.id === updated.id ? updated : t);

    const success = await syncWithCloud(investments, nextTxs, goals, moneyRecords);
    if (success) {
      setTransactions(nextTxs);
      showToast('Transaction updated successfully!', 'success');
    }
  };

  // CRUD for Goals (automatically set owner = "Me" and isDemo = false)
  const addGoal = async (goal: Omit<Goal, 'id'>) => {
    const newGoal: Goal = {
      ...goal,
      id: generateId(),
      owner: 'Me',
      isDemo: false,
      isCompleted: false,
      progressMode: goal.progressMode || 'Manual'
    };
    const nextGoals = [...goals, newGoal];

    const success = await syncWithCloud(investments, transactions, nextGoals, moneyRecords);
    if (success) {
      setGoals(nextGoals);
      showToast('Financial goal created!', 'success');
    }
  };

  const updateGoal = async (updated: Goal) => {
    const nextGoals = goals.map(g => g.id === updated.id ? updated : g);

    const success = await syncWithCloud(investments, transactions, nextGoals, moneyRecords);
    if (success) {
      setGoals(nextGoals);
      showToast('Goal updated successfully!', 'success');
    }
  };

  const deleteGoal = async (id: string) => {
    const nextGoals = goals.filter(g => g.id !== id);

    const success = await syncWithCloud(investments, transactions, nextGoals, moneyRecords);
    if (success) {
      setGoals(nextGoals);
      showToast('Goal deleted.', 'info');
    }
  };

  // CRUD for Money Tracker Records
  const addMoneyRecord = async (payload: Omit<MoneyRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRecord: MoneyRecord = {
      ...payload,
      id: 'mr_' + Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const nextMoney = [newRecord, ...moneyRecords];

    const success = await syncWithCloud(investments, transactions, goals, nextMoney);
    if (success) {
      setMoneyRecords(nextMoney);
      showToast('Money record added successfully!', 'success');
    }
  };

  const updateMoneyRecord = async (record: MoneyRecord) => {
    const nextMoney = moneyRecords.map(r => r.id === record.id ? { ...record, updatedAt: new Date().toISOString() } : r);

    const success = await syncWithCloud(investments, transactions, goals, nextMoney);
    if (success) {
      setMoneyRecords(nextMoney);
      showToast('Money record updated successfully!', 'success');
    }
  };

  const deleteMoneyRecord = async (id: string) => {
    const nextMoney = moneyRecords.filter(r => r.id !== id);

    const success = await syncWithCloud(investments, transactions, goals, nextMoney);
    if (success) {
      setMoneyRecords(nextMoney);
      showToast('Money record deleted successfully!', 'success');
    }
  };

  const markMoneyRecordReceived = async (id: string) => {
    const nextMoney = moneyRecords.map(r => r.id === id ? {
      ...r,
      amountPaid: r.amount,
      updatedAt: new Date().toISOString()
    } : r);

    const success = await syncWithCloud(investments, transactions, goals, nextMoney);
    if (success) {
      setMoneyRecords(nextMoney);
      showToast('Record marked as fully paid!', 'success');
    }
  };

  // Load Demo Investments Data (State-only)
  const loadDemoData = () => {
    if (window.confirm('Load sample investment data for testing?')) {
      const demoWithFlags = DEFAULT_INVESTMENTS.map(inv => {
        const buyDate = inv.buyDate || inv.purchaseDate || '2026-01-01';
        const category = inv.category || inv.assetType || 'Stocks';
        return {
          ...inv,
          buyDate,
          purchaseDate: buyDate,
          category,
          assetType: category,
          isDemo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });

      // Extract transaction lists from mock items
      const demoTxs: Transaction[] = [];
      demoWithFlags.forEach(inv => {
        if (inv.transactions) {
          inv.transactions.forEach((tx: any, idx: number) => {
            demoTxs.push({
              ...tx,
              id: tx.id || `demo-tx-${inv.id}-${idx}`,
              investmentId: inv.id,
              type: tx.type || 'BUY',
              quantity: tx.quantity ?? 1,
              price: tx.price ?? 0,
              amount: (tx.quantity ?? 1) * (tx.price ?? 0),
              charges: tx.charges ?? 0,
              date: tx.date || inv.buyDate,
              isDemo: true,
              createdAt: new Date().toISOString()
            });
          });
        }
      });

      const demoMoneyRecords: MoneyRecord[] = [
        {
          id: 'demo-mr-1',
          type: 'receive',
          personName: 'Rahul',
          amount: 5000,
          amountPaid: 2000,
          date: '2026-08-20',
          dueDate: '2026-08-30',
          note: 'Emergency loan',
          isDemo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'demo-mr-2',
          type: 'receive',
          personName: 'Priya',
          amount: 1500,
          amountPaid: 1500,
          date: '2026-08-15',
          dueDate: '2026-08-25',
          note: 'Dinner split',
          isDemo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'demo-mr-3',
          type: 'receive',
          personName: 'Amit',
          amount: 8500,
          amountPaid: 0,
          date: '2026-08-22',
          dueDate: '2026-09-05',
          note: 'Business advance',
          isDemo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'demo-mr-4',
          type: 'give',
          personName: 'Sanjay',
          amount: 3000,
          amountPaid: 1000,
          date: '2026-08-18',
          dueDate: '2026-08-28',
          note: 'Office contribution',
          isDemo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      setInvestments(prev => {
        const withoutDemo = prev.filter(inv => !inv.isDemo);
        return [...withoutDemo, ...demoWithFlags];
      });

      setTransactions(prev => {
        const withoutDemo = prev.filter(tx => !tx.isDemo);
        return [...withoutDemo, ...demoTxs];
      });

      setMoneyRecords(prev => {
        const withoutDemo = prev.filter(r => !r.isDemo);
        return [...withoutDemo, ...demoMoneyRecords];
      });

      // Force filter to All so loaded demo data is immediately displayed
      setDataTypeFilter('All');
      showToast('Demo dataset loaded successfully.', 'success');
      navigateTo('dashboard');
    }
  };

  // Clear Demo Investments Data (State-only)
  const clearDemoData = () => {
    setInvestments(prev => prev.filter(inv => !inv.isDemo));
    setTransactions(prev => prev.filter(tx => !tx.isDemo));
    setMoneyRecords(prev => prev.filter(r => !r.isDemo));
    setDataTypeFilter('Real'); // Toggle filter back to Real Data
    showToast('Demo dataset cleared.', 'info');
  };

  const hasDemoData = investments.some(inv => inv.isDemo);

  // Load Demo Goals (State-only)
  const loadDemoGoals = () => {
    if (window.confirm('Load sample financial goals for testing?')) {
      const demoGoalsWithFlags = DEFAULT_GOALS.map(g => ({
        ...g,
        isDemo: true,
        owner: 'Me' as 'Me' | 'Other',
        progressMode: 'Manual' as const
      }));
      setGoals(prev => {
        const withoutDemo = prev.filter(g => !g.isDemo);
        return [...withoutDemo, ...demoGoalsWithFlags];
      });
      // Force filter to All so loaded demo data is immediately displayed
      setDataTypeFilter('All');
      showToast('Demo goals loaded successfully.', 'success');
      navigateTo('goals');
    }
  };

  // Clear Demo Goals (State-only)
  const clearDemoGoals = () => {
    setGoals(prev => prev.filter(g => !g.isDemo));
    setDataTypeFilter('Real'); // Toggle filter back to Real Data
    showToast('Demo goals cleared.', 'info');
  };

  const hasDemoGoals = goals.some(g => g.isDemo);

  // Clear Database (Syncs empty state to Supabase)
  const clearAllData = async () => {
    if (window.confirm('Wipe all cloud and local data permanently?')) {
      const success = await syncWithCloud([], [], [], []);
      if (success) {
        setInvestments([]);
        setTransactions([]);
        setGoals([]);
        setMoneyRecords([]);
        
        // Remove backups/caches
        storage.remove('investments');
        storage.remove('transactions');
        storage.remove('goals');
        storage.remove('money_records');
        storage.remove('moneyTracker');
        
        showToast('All database and local data deleted.', 'warning');
        navigateTo('dashboard');
      }
    }
  };

  // Backup - Export Data as JSON
  const exportData = () => {
    try {
      const dataStr = JSON.stringify({
        investments,
        transactions,
        goals,
        moneyRecords,
        preferences: {
          theme,
          currency,
          monthlyTarget
        }
      }, null, 2);

      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invest_track_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Backup JSON exported successfully!', 'success');
    } catch {
      showToast('Failed to export backup data.', 'warning');
    }
  };

  // Backup - Import Data from JSON (Syncs imported real records to Supabase)
  const importData = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed === 'object') {
        const validInvs = Array.isArray(parsed.investments);
        const validTxs = Array.isArray(parsed.transactions);
        const validGoals = Array.isArray(parsed.goals);

        if (!validInvs && !validTxs && !validGoals) {
          showToast('Invalid backup file structure.', 'warning');
          return false;
        }

        const newInvs = parsed.investments || [];
        const newTxs = parsed.transactions || [];
        const newGoals = parsed.goals || [];
        const newMoneyRecords = migrateMoneyRecords(parsed.moneyRecords || []);

        syncWithCloud(newInvs, newTxs, newGoals, newMoneyRecords).then(success => {
          if (success) {
            setInvestments(newInvs);
            setTransactions(newTxs);
            setGoals(newGoals);
            setMoneyRecords(newMoneyRecords);

            if (parsed.preferences) {
              const prefs = parsed.preferences;
              if (prefs.theme) {
                setTheme(prefs.theme);
                storage.set('theme_pref', prefs.theme);
              }
              if (prefs.currency) {
                setCurrencyState(prefs.currency);
                storage.set('currency_pref', prefs.currency);
              }
              if (prefs.monthlyTarget) {
                setMonthlyTargetState(prefs.monthlyTarget);
                storage.set('monthly_target_pref', prefs.monthlyTarget);
              }
            }

            showToast('Backup restored and cloud synced successfully!', 'success');
            navigateTo('dashboard');
          } else {
            showToast('Restore aborted: cloud synchronization failed.', 'warning');
          }
        }).catch(err => {
          console.error(err);
          showToast('Error syncing restored data to cloud.', 'warning');
        });

        return true;
      }
      showToast('Invalid backup file format.', 'warning');
      return false;
    } catch {
      showToast('Failed to parse backup JSON.', 'warning');
      return false;
    }
  };

  const refreshMarketPrices = useCallback(async () => {
    if (isRefreshingPrices) return;
    setIsRefreshingPrices(true);
    try {
      const eligible = investments
        .filter(inv => {
          if (dataTypeFilter === 'Real' && inv.isDemo) return false;
          if (dataTypeFilter === 'Demo' && !inv.isDemo) return false;
          return (inv.category === 'Stocks' || inv.category === 'ETFs' || (inv.category === 'IPOs' && inv.ipoAllotmentStatus === 'Listed')) && inv.symbol;
        })
        .map(inv => ({
          symbol: inv.symbol || '',
          category: inv.category
        }));

      if (eligible.length > 0) {
        const fetched = await fetchMarketPrices(eligible);
        setMarketPrices(prev => {
          const next = { ...prev };
          Object.entries(fetched).forEach(([sym, data]) => {
            next[sym.toUpperCase()] = {
              ...data,
              status: 'live'
            };
          });
          storage.set('market_price_cache', next);
          return next;
        });
      }
    } catch (_) {
      console.error("refreshMarketPrices error:", _);
    } finally {
      setIsRefreshingPrices(false);
    }
  }, [investments, dataTypeFilter, isRefreshingPrices]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    refreshMarketPrices();

    const timer = setInterval(() => {
      if (isIndianMarketOpen(new Date())) {
        refreshMarketPrices();
      }
    }, 2 * 60 * 1000); // 2-minute polling during market hours

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshMarketPrices();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshMarketPrices]);

  // Deprecated resetting - clears real records from cloud, initializes local demo
  const resetData = () => {
    if (window.confirm('Reset all values to system default demo data?')) {
      const demoWithFlags = DEFAULT_INVESTMENTS.map(inv => ({
        ...inv,
        isDemo: true,
        buyDate: inv.buyDate || inv.purchaseDate || '2026-01-01',
        purchaseDate: inv.buyDate || inv.purchaseDate || '2026-01-01',
        category: inv.category || inv.assetType || 'Stocks',
        assetType: inv.category || inv.assetType || 'Stocks',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      const demoGoalsWithFlags = DEFAULT_GOALS.map(g => ({
        ...g,
        isDemo: true,
        owner: 'Me' as const,
        progressMode: 'Manual' as const
      }));

      syncWithCloud([], [], [], []).then(success => {
        if (success) {
          setInvestments(demoWithFlags);
          setGoals(demoGoalsWithFlags);
          setMoneyRecords([]);

          storage.set('investments', demoWithFlags);
          storage.set('goals', demoGoalsWithFlags);
          storage.set('money_records', []);
          storage.set('moneyTracker', []);

          showToast('Workspace reset to defaults.', 'info');
          navigateTo('dashboard');
        }
      });
    }
  };

  const formatCurrency = (value: number): string => {
    let locale = 'en-IN';
    let currencyCode = 'INR';

    if (currency === 'USD') {
      locale = 'en-US';
      currencyCode = 'USD';
    } else if (currency === 'EUR') {
      locale = 'de-DE';
      currencyCode = 'EUR';
    }

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: value % 1 === 0 ? 0 : 2,
      }).format(value);
    } catch {
      const symbols = { INR: '₹', USD: '$', EUR: '€' };
      return `${symbols[currency] || '₹'}${value.toLocaleString()}`;
    }
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        currency,
        setCurrency,
        monthlyTarget,
        setMonthlyTarget,
        investments,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
        transactions,
        addTransaction,
        deleteTransaction,
        updateTransaction,
        moneyRecords,
        addMoneyRecord,
        updateMoneyRecord,
        deleteMoneyRecord,
        markMoneyRecordReceived,
        resetData,
        loadDemoData,
        clearDemoData,
        hasDemoData,
        loadDemoGoals,
        clearDemoGoals,
        hasDemoGoals,
        clearAllData,
        exportData,
        importData,
        formatCurrency,
        toast,
        showToast,
        hideToast,
        activeTab,
        navigateTo,
        ownerFilter,
        setOwnerFilter,
        dataTypeFilter,
        setDataTypeFilter,
        marketPrices,
        refreshMarketPrices,
        isRefreshingPrices,
        isCloudDataLoading,
        lastSyncedAt,
        migrateLocalData,
        isSyncing
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react/only-export-components, react-refresh/only-export-components
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
