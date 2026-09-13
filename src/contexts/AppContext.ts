import { createContext, useContext } from 'react';
import type { Investment, Goal, Transaction, MoneyRecord, Dividend, ReinvestOptions } from '../types';
import type { MarketPriceData } from '../services/marketDataService';
import type { ProfileData as UserProfile } from '../components/ui/edit-profile';

export type { UserProfile };

export interface ToastData {
  message: string;
  type?: 'success' | 'info' | 'warning';
}

export type OwnerFilterType = 'Me' | 'Other' | 'All';
export type DataTypeFilterType = 'Real' | 'Demo' | 'All';

export interface AppContextType {
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
  dividends: Dividend[];
  addDividend: (div: Omit<Dividend, 'id' | 'createdAt'>, reinvestOptions?: ReinvestOptions) => void;
  updateDividend: (div: Dividend) => void;
  deleteDividend: (id: string) => void;
  markDividendPaid: (id: string) => void;
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
  userProfile: UserProfile;
  updateUserProfile: (profile: UserProfile) => Promise<boolean>;
  isEditProfileOpen: boolean;
  openEditProfile: () => void;
  closeEditProfile: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export { AppProvider } from './AppProvider';
