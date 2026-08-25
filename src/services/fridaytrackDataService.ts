import { supabase } from '../utils/supabase';
import { storage } from '../utils/localStorage';
import type { Investment, Transaction, Goal, MoneyRecord } from '../types';

export interface FridayTrackData {
  investments: Investment[];
  transactions: Transaction[];
  goals: Goal[];
  money_records: MoneyRecord[];
  preferences: Record<string, any>;
  updated_at?: string;
}

/**
 * Retrieves the currently authenticated Supabase user.
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error fetching current user:', error);
    throw error;
  }
  return user;
};

/**
 * Loads real FridayTrack data for the authenticated user from the database.
 */
export const loadFridayTrackData = async (): Promise<FridayTrackData | null> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('No authenticated user found to load data.');
      return null;
    }

    const { data, error } = await supabase
      .from('fridaytrack_data')
      .select('investments, transactions, goals, money_records, preferences, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading FridayTrack data from Supabase:', error);
      throw error;
    }

    if (!data) return null;

    return {
      investments: Array.isArray(data.investments) ? (data.investments as Investment[]) : [],
      transactions: Array.isArray(data.transactions) ? (data.transactions as Transaction[]) : [],
      goals: Array.isArray(data.goals) ? (data.goals as Goal[]) : [],
      money_records: Array.isArray(data.money_records) ? (data.money_records as MoneyRecord[]) : [],
      preferences: data.preferences && typeof data.preferences === 'object' ? data.preferences : {},
      updated_at: data.updated_at || undefined,
    };
  } catch (error) {
    console.error('loadFridayTrackData failed:', error);
    throw error;
  }
};

/**
 * Saves/Upserts the authenticated user's FridayTrack data.
 * Automatically filters out any client-side demo records before sending.
 */
export const saveFridayTrackData = async (payload: FridayTrackData): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('No authenticated user found. Cannot save data.');
      return false;
    }

    // Filter out demo data before saving
    const realInvestments = (payload.investments || []).filter((i) => !i.isDemo);
    const realTransactions = (payload.transactions || []).filter((t) => !t.isDemo);
    const realGoals = (payload.goals || []).filter((g) => !g.isDemo);
    const realMoneyRecords = (payload.money_records || []).filter((m) => !m.isDemo);

    const { error } = await supabase
      .from('fridaytrack_data')
      .upsert(
        {
          user_id: user.id,
          investments: realInvestments,
          transactions: realTransactions,
          goals: realGoals,
          money_records: realMoneyRecords,
          preferences: payload.preferences || {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Error saving FridayTrack data to Supabase:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('saveFridayTrackData failed:', error);
    throw error;
  }
};

/**
 * Migrates real data from localStorage to Supabase, merging with existing cloud data.
 */
export const migrateLocalStorageToSupabase = async (): Promise<{
  success: boolean;
  message: string;
  syncedCount: {
    investments: number;
    transactions: number;
    goals: number;
    money_records: number;
  };
}> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: 'No authenticated user found.',
        syncedCount: { investments: 0, transactions: 0, goals: 0, money_records: 0 },
      };
    }

    // Load local storage items
    const localInvs = storage.get<Investment[]>('investments', []).filter((i) => !i.isDemo);
    const localTxs = storage.get<Transaction[]>('transactions', []).filter((t) => !t.isDemo);
    const localGoals = storage.get<Goal[]>('goals', []).filter((g) => !g.isDemo);
    const localMoneyRaw = storage.get<any[]>('moneyTracker', []) || storage.get<any[]>('money_records', []);

    // Standardize money records structure for local storage migration
    const localMoney = (localMoneyRaw || [])
      .map((r) => {
        if (r && r.type === undefined) {
          return {
            id: r.id,
            type: 'receive' as const,
            personName: r.personName || '',
            amount: r.amountGiven !== undefined ? r.amountGiven : (r.amount || 0),
            amountPaid: r.amountReceived !== undefined ? r.amountReceived : (r.amountPaid || 0),
            date: r.dateGiven || r.date || new Date().toISOString().split('T')[0],
            dueDate: r.expectedReturnDate || r.dueDate,
            note: r.note || '',
            isDemo: !!r.isDemo,
            createdAt: r.createdAt || new Date().toISOString(),
            updatedAt: r.updatedAt || new Date().toISOString(),
          };
        }
        return r as MoneyRecord;
      })
      .filter((m) => !m.isDemo);

    // Fetch existing cloud data
    const cloudData = await loadFridayTrackData();
    const cloudInvs = cloudData?.investments || [];
    const cloudTxs = cloudData?.transactions || [];
    const cloudGoals = cloudData?.goals || [];
    const cloudMoney = cloudData?.money_records || [];
    const cloudPrefs = cloudData?.preferences || {};

    // Merge and prevent duplicates by ID
    const mergedInvs = [...cloudInvs];
    localInvs.forEach((li) => {
      if (!mergedInvs.some((ci) => ci.id === li.id)) {
        mergedInvs.push(li);
      }
    });

    const mergedTxs = [...cloudTxs];
    localTxs.forEach((lt) => {
      if (!mergedTxs.some((ct) => ct.id === lt.id)) {
        mergedTxs.push(lt);
      }
    });

    const mergedGoals = [...cloudGoals];
    localGoals.forEach((lg) => {
      if (!mergedGoals.some((cg) => cg.id === lg.id)) {
        mergedGoals.push(lg);
      }
    });

    const mergedMoney = [...cloudMoney];
    localMoney.forEach((lm) => {
      if (!mergedMoney.some((cm) => cm.id === lm.id)) {
        mergedMoney.push(lm);
      }
    });

    // Save consolidated data
    const saveSuccess = await saveFridayTrackData({
      investments: mergedInvs,
      transactions: mergedTxs,
      goals: mergedGoals,
      money_records: mergedMoney,
      preferences: cloudPrefs,
    });

    if (saveSuccess) {
      localStorage.setItem('supabase_migrated_v1', 'true');
      return {
        success: true,
        message: 'Successfully migrated local data to Supabase.',
        syncedCount: {
          investments: localInvs.length,
          transactions: localTxs.length,
          goals: localGoals.length,
          money_records: localMoney.length,
        },
      };
    }

    return {
      success: false,
      message: 'Failed to write migrated data to Supabase.',
      syncedCount: { investments: 0, transactions: 0, goals: 0, money_records: 0 },
    };
  } catch (error: any) {
    console.error('Data migration failed:', error);
    return {
      success: false,
      message: error?.message || 'An error occurred during data migration.',
      syncedCount: { investments: 0, transactions: 0, goals: 0, money_records: 0 },
    };
  }
};
