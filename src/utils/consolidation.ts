import { calculateHoldingMetrics, isCommodityCategory, getEffectiveTransactions } from '../services/portfolioCalculationService';
import type { HoldingMetrics } from '../services/portfolioCalculationService';
import type { Investment, Transaction } from '../types';
import { getInvestmentAge } from './calculations';

export interface ConsolidatedHolding {
  holdingKey: string;
  id: string; // Primary investment ID
  primaryInvestment: Investment;
  investments: Investment[];
  transactions: Transaction[];
  assetName: string;
  symbol?: string;
  category: string; // Normalized category
  displayType: string;
  broker: string;
  
  // Financial metrics from calculation engine
  metrics: HoldingMetrics;
  
  // Expressive metric fields
  totalBuyQuantity: number;
  totalSellQuantity: number;
  currentQuantity: number;
  averageBuyPrice: number;
  investedAmount: number;
  currentValue?: number | null;
  profitLoss?: number | null;
  returnPercent?: number | null;
  realizedPL: number;
  totalPL?: number;
  
  startedDate: string;
  age: string;
  txCount: number;
  isDemo: boolean;
}

const REVERSE_TYPE_MAPPING: Record<string, string> = {
  'Stocks': 'Stock',
  'ETFs': 'ETF',
  'IPOs': 'IPO',
  'Mutual Funds': 'Mutual Fund',
  'Gold': 'Digital Gold',
  'Silver': 'Digital Silver',
  'Platinum': 'Digital Platinum',
  'Crypto': 'Crypto',
  'Fixed Deposits': 'Fixed Deposit',
  'Bond': 'Bond',
  'Other': 'Other'
};

export const formatQuantityWithUnit = (quantity: number = 0, category?: string, weightUnit?: string): string => {
  const cat = normalizeCategory(category);
  const qty = quantity || 0;
  const qtyStr = qty % 1 === 0 ? qty.toString() : qty.toFixed(2);
  
  if (cat === 'Stocks') {
    return `${qtyStr} ${qty === 1 ? 'Share' : 'Shares'}`;
  }
  if (cat === 'ETFs' || cat === 'Mutual Funds') {
    return `${qtyStr} ${qty === 1 ? 'Unit' : 'Units'}`;
  }
  if (cat === 'Digital Gold' || cat === 'Digital Silver' || cat === 'Digital Platinum') {
    const unit = weightUnit || 'g';
    return `${qtyStr} ${unit}`;
  }
  if (cat === 'IPOs') {
    return `${qtyStr} ${qty === 1 ? 'Share' : 'Shares'}`;
  }
  return `${qtyStr} ${qty === 1 ? 'Unit' : 'Units'}`;
};

export const normalizeCategory = (cat?: string): string => {
  if (!cat) return 'Other';
  const clean = cat.trim();
  const lower = clean.toLowerCase();
  
  if (lower === 'stock' || lower === 'stocks') return 'Stocks';
  if (lower === 'etf' || lower === 'etfs') return 'ETFs';
  if (lower === 'mutual fund' || lower === 'mutual funds') return 'Mutual Funds';
  if (lower === 'ipo' || lower === 'ipos') return 'IPOs';
  if (lower === 'gold' || lower === 'digital gold') return 'Digital Gold';
  if (lower === 'silver' || lower === 'digital silver') return 'Digital Silver';
  if (lower === 'platinum' || lower === 'digital platinum') return 'Digital Platinum';
  if (lower === 'fixed deposit' || lower === 'fixed deposits') return 'Fixed Deposits';
  
  return clean;
};

/**
 * Returns a stable grouping key based on UNDERLYING ASSET + PLATFORM/ACCOUNT.
 * Keeps different assets separate.
 * Keeps same asset on different platforms (e.g. Gold PhonePe vs Gold Navi) separate.
 */
export const getHoldingGroupKey = (inv: {
  assetName: string;
  category?: string;
  assetType?: string;
  broker?: string;
  customBroker?: string;
  symbol?: string;
}): string => {
  const cat = normalizeCategory(inv.category || inv.assetType);
  const broker = (inv.broker === 'Other' && inv.customBroker ? inv.customBroker : (inv.broker || 'Other')).trim().toLowerCase();
  const assetName = inv.assetName.trim().toLowerCase().replace(/\s+/g, ' ');
  const symbol = inv.symbol ? inv.symbol.trim().toLowerCase() : '';
  
  return `${cat}::${broker}::${assetName}${symbol ? '::' + symbol : ''}`;
};

/**
 * Helper to determine if a consolidated holding or investment is currently active (user owns the asset).
 * For IPOs: ONLY 'Allotted' or 'Shares Received' with quantity > 0 is considered Active.
 * Applied / Pending Allotment, Not Allotted, Refunded, Withdrawn, Cancelled are NOT Active.
 */
export const isHoldingActive = (h: {
  category?: string;
  assetType?: string;
  quantity?: number;
  currentQuantity?: number;
  investedAmount?: number;
  currentValue?: number | null;
  ipoAllotmentStatus?: string;
  allotmentStatus?: string;
  primaryInvestment?: any;
}): boolean => {
  const category = normalizeCategory(h.category || h.assetType || (h.primaryInvestment?.category || h.primaryInvestment?.assetType));
  const qty = h.currentQuantity ?? h.quantity ?? 0;
  
  if (category === 'IPOs') {
    const rawStatus = (h.ipoAllotmentStatus || h.allotmentStatus || h.primaryInvestment?.ipoAllotmentStatus || h.primaryInvestment?.allotmentStatus || 'Applied').trim().toLowerCase();
    const isAllotted = rawStatus === 'allotted' || rawStatus === 'shares received';
    return isAllotted && qty > 0;
  }
  
  if (isCommodityCategory(category)) {
    const hasWeight = qty > 0;
    const hasInvested = (h.investedAmount ?? 0) > 0;
    const hasCurrent = (h.currentValue ?? 0) > 0;
    return hasWeight || hasInvested || hasCurrent;
  }
  
  return qty > 0;
};

/**
 * Helper to determine if a holding or investment has been completely sold.
 * For IPOs: Status === 'Sold' (or 'Allotted' with quantity 0).
 * Pending, Not Allotted, Withdrawn, Cancelled IPOs are NOT Sold.
 */
export const isHoldingSold = (h: {
  category?: string;
  assetType?: string;
  quantity?: number;
  currentQuantity?: number;
  investedAmount?: number;
  ipoAllotmentStatus?: string;
  allotmentStatus?: string;
  primaryInvestment?: any;
}): boolean => {
  const category = normalizeCategory(h.category || h.assetType || (h.primaryInvestment?.category || h.primaryInvestment?.assetType));
  const qty = h.currentQuantity ?? h.quantity ?? 0;
  
  if (category === 'IPOs') {
    const rawStatus = (h.ipoAllotmentStatus || h.allotmentStatus || h.primaryInvestment?.ipoAllotmentStatus || h.primaryInvestment?.allotmentStatus || '').trim().toLowerCase();
    if (rawStatus === 'sold') return true;
    if ((rawStatus === 'allotted' || rawStatus === 'shares received') && qty === 0) return true;
    return false;
  }
  
  return qty === 0;
};

export interface HoldingStatusBadgeInfo {
  label: string;
  colorClass: string;
  isStatusVisible: boolean;
}

/**
 * Returns badge info for rendering status tags (Applied, Allotted, Not Allotted, Sold, Withdrawn).
 */
export const getHoldingStatusBadgeInfo = (h: {
  category?: string;
  assetType?: string;
  quantity?: number;
  currentQuantity?: number;
  investedAmount?: number;
  ipoAllotmentStatus?: string;
  allotmentStatus?: string;
  primaryInvestment?: any;
}): HoldingStatusBadgeInfo => {
  const category = normalizeCategory(h.category || h.assetType || (h.primaryInvestment?.category || h.primaryInvestment?.assetType));
  const isSold = isHoldingSold(h);
  
  if (category === 'IPOs') {
    const rawStatus = (h.ipoAllotmentStatus || h.allotmentStatus || h.primaryInvestment?.ipoAllotmentStatus || h.primaryInvestment?.allotmentStatus || 'Applied').trim();
    const lower = rawStatus.toLowerCase();
    
    if (lower === 'applied' || lower === 'pending allotment' || lower === 'pending') {
      return {
        label: 'Applied',
        colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/25',
        isStatusVisible: true
      };
    }
    if (lower === 'allotted' || lower === 'shares received') {
      if (isSold) {
        return {
          label: 'Sold',
          colorClass: 'bg-rose-500/10 text-rose-500 border-rose-500/25',
          isStatusVisible: true
        };
      }
      return {
        label: 'Allotted',
        colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25',
        isStatusVisible: true
      };
    }
    if (lower === 'not allotted' || lower === 'rejected' || lower === 'refund pending' || lower === 'refunded') {
      return {
        label: 'Not Allotted',
        colorClass: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/25',
        isStatusVisible: true
      };
    }
    if (lower === 'withdrawn' || lower === 'cancelled') {
      return {
        label: 'Withdrawn',
        colorClass: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/25',
        isStatusVisible: true
      };
    }
    if (lower === 'sold') {
      return {
        label: 'Sold',
        colorClass: 'bg-rose-500/10 text-rose-500 border-rose-500/25',
        isStatusVisible: true
      };
    }
    return {
      label: rawStatus,
      colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/25',
      isStatusVisible: true
    };
  }
  
  if (isSold) {
    return {
      label: 'Sold',
      colorClass: 'bg-rose-500/10 text-rose-500 border-rose-500/25',
      isStatusVisible: true
    };
  }

  return {
    label: 'Active',
    colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25',
    isStatusVisible: false
  };
};

/**
 * Consolidates individual investments & transaction history into unified holdings
 * grouped strictly by UNDERLYING ASSET + PLATFORM/ACCOUNT.
 */
export const getConsolidatedHoldings = (
  investments: Investment[],
  allTransactions: Transaction[],
  marketPrices: Record<string, any> = {}
): ConsolidatedHolding[] => {
  const groupMap: Record<string, Investment[]> = {};

  investments.forEach(inv => {
    const key = getHoldingGroupKey(inv);
    if (!groupMap[key]) {
      groupMap[key] = [];
    }
    groupMap[key].push(inv);
  });

  const results: ConsolidatedHolding[] = [];

  Object.entries(groupMap).forEach(([holdingKey, groupInvs]) => {
    if (groupInvs.length === 0) return;

    const primaryInv = groupInvs[0];
    const groupInvIds = new Set(groupInvs.map(i => i.id));

    // Aggregate all transactions belonging to all investments in this group
    const groupTxs: Transaction[] = [];
    const seenTxIds = new Set<string>();

    // 1. Gather explicit transactions from allTransactions
    allTransactions.forEach(tx => {
      if (groupInvIds.has(tx.investmentId) && !seenTxIds.has(tx.id)) {
        seenTxIds.add(tx.id);
        groupTxs.push(tx);
      }
    });

    // 2. Fallback: generate implicit initial BUY transaction for any inv that doesn't have a BUY tx logged
    groupInvs.forEach(inv => {
      const hasBuyTx = groupTxs.some(t => t.investmentId === inv.id && t.type === 'BUY');
      if (!hasBuyTx) {
        const implicitTxs = getEffectiveTransactions(inv, []);
        implicitTxs.forEach(itx => {
          if (!seenTxIds.has(itx.id)) {
            seenTxIds.add(itx.id);
            groupTxs.push(itx);
          }
        });
      }
    });

    // Sort transactions by date ascending (oldest first)
    groupTxs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate holding metrics using the central engine for primaryInv with all group transactions
    const mappedGroupTxs = groupTxs.map(t => ({ ...t, investmentId: primaryInv.id }));
    const metrics = calculateHoldingMetrics(primaryInv, mappedGroupTxs, marketPrices);

    // Calculate sum of BUYs and SELLs
    const totalBuyQuantity = groupTxs
      .filter(t => t.type === 'BUY')
      .reduce((sum, t) => sum + (t.quantity || 0), 0);

    const totalSellQuantity = groupTxs
      .filter(t => t.type === 'SELL')
      .reduce((sum, t) => sum + (t.quantity || 0), 0);

    // Determine earliest buy date across all investments & transactions in group
    let earliestDate = '';
    groupInvs.forEach(inv => {
      const dateStr = inv.buyDate || inv.purchaseDate || inv.applicationDate;
      if (dateStr && (!earliestDate || dateStr < earliestDate)) {
        earliestDate = dateStr;
      }
    });
    groupTxs.forEach(tx => {
      if (tx.date && (!earliestDate || tx.date < earliestDate)) {
        earliestDate = tx.date;
      }
    });
    if (!earliestDate) earliestDate = '2026-01-01';

    const age = getInvestmentAge(earliestDate);
    const category = normalizeCategory(primaryInv.category || primaryInv.assetType);
    const displayType = REVERSE_TYPE_MAPPING[category] || REVERSE_TYPE_MAPPING[primaryInv.assetType] || 'Other';
    const broker = (primaryInv.broker === 'Other' && primaryInv.customBroker ? primaryInv.customBroker : (primaryInv.broker || 'Other')).trim();

    results.push({
      holdingKey,
      id: primaryInv.id,
      primaryInvestment: primaryInv,
      investments: groupInvs,
      transactions: groupTxs,
      assetName: primaryInv.assetName,
      symbol: primaryInv.symbol,
      category,
      displayType,
      broker,
      metrics,
      totalBuyQuantity,
      totalSellQuantity,
      currentQuantity: metrics.quantity,
      averageBuyPrice: metrics.buyPrice,
      investedAmount: metrics.investedAmount,
      currentValue: metrics.currentValue,
      profitLoss: metrics.profitLoss,
      returnPercent: metrics.returnPercent,
      realizedPL: metrics.realizedPL,
      totalPL: metrics.totalPL,
      startedDate: earliestDate,
      age,
      txCount: groupTxs.length,
      isDemo: !!primaryInv.isDemo
    });
  });

  return results;
};

/**
 * Single source of truth calculation for Active Holdings Count across the application.
 * Groups investments by asset identity & platform, excludes pending/rejected/withdrawn IPOs & fully sold assets,
 * and counts unique currently owned assets (currentQuantity > 0).
 */
export const calculateActiveHoldings = (
  investments: Investment[],
  allTransactions: Transaction[] = [],
  marketPrices: Record<string, any> = {}
): number => {
  const consolidated = getConsolidatedHoldings(investments, allTransactions, marketPrices);
  return consolidated.filter(isHoldingActive).length;
};
