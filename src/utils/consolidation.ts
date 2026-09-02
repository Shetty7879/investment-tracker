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
 * Helper to determine if a consolidated holding or metric is active.
 */
export const isHoldingActive = (h: {
  category: string;
  quantity?: number;
  currentQuantity?: number;
  investedAmount?: number;
  currentValue?: number | null;
  ipoAllotmentStatus?: string;
  allotmentStatus?: string;
}): boolean => {
  const category = h.category || '';
  const qty = h.currentQuantity ?? h.quantity ?? 0;
  
  if (category === 'IPOs') {
    const status = h.ipoAllotmentStatus || h.allotmentStatus || 'Applied';
    const inactiveStatuses = ['Not Allotted', 'Refund Pending', 'Refunded', 'Withdrawn', 'Sold'];
    return !inactiveStatuses.includes(status);
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
