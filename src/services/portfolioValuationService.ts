import type { Investment, Transaction } from '../types';
import type { MarketPriceData } from './marketDataService';
import {
  calculateHoldingMarketValue,
  safeRound,
  isCommodityCategory
} from './portfolioCalculationService';
import { resolveMarketSymbol } from './marketSymbolService';

export interface HoldingValuationResult {
  holdingId: string;
  assetName: string;
  assetType: string;
  normalizedCategory: string;
  quantity: number;
  weightGrams?: number;
  weightUnit?: string;
  symbol: string;
  yahooSymbol: string;
  currentPrice: number | null;
  marketValue: number | null;
  investedAmount: number;
  valuationSource: string;
  isValued: boolean;
  reason?: string;
}

export interface AssetClassAllocationItem {
  name: string;
  value: number;
  percentage: number;
  holdingCount: number;
}

export interface PortfolioValuationSummary {
  totalMarketValue: number;
  totalInvested: number;
  assetClassTotals: Record<string, number>;
  allocations: AssetClassAllocationItem[];
  holdingsValuation: HoldingValuationResult[];
  unvaluedHoldingsCount: number;
}

export const normalizeValuationCategory = (category: string | undefined): string => {
  if (!category) return 'Others';
  const clean = category.trim().toLowerCase();

  if (clean === 'stock' || clean === 'stocks' || clean === 'equity' || clean === 'shares') return 'Stocks';
  if (clean === 'etf' || clean === 'etfs') return 'ETFs';
  if (clean === 'mutual fund' || clean === 'mutual funds' || clean === 'mf') return 'Mutual Funds';
  if (clean === 'fixed deposit' || clean === 'fixed deposits' || clean === 'fd') return 'Fixed Deposits';
  if (clean === 'gold' || clean === 'digital gold' || clean === 'sovereign gold bond' || clean === 'gold bond' || clean === 'sgb') return 'Gold';
  if (clean === 'silver' || clean === 'digital silver' || clean === 'physical silver') return 'Silver';
  if (clean === 'platinum' || clean === 'digital platinum') return 'Platinum';
  if (clean === 'savings/cash' || clean === 'savings' || clean === 'cash') return 'Savings/Cash';
  if (clean === 'ipo' || clean === 'ipos') return 'IPOs';
  if (clean === 'crypto' || clean === 'cryptocurrency') return 'Crypto';
  if (clean === 'bond' || clean === 'bonds') return 'Bonds';
  return 'Others';
};

export const getHoldingValuation = (
  inv: Investment,
  allTxs: Transaction[],
  marketPrices: Record<string, MarketPriceData>
): HoldingValuationResult => {
  const cat = (inv.category || inv.assetType || 'Stocks').trim();
  const rawSym = inv.symbol?.trim() || '';
  const resolved = resolveMarketSymbol(rawSym || inv.assetName, cat as any);

  const parentTxs = allTxs.filter(t => t.investmentId === inv.id);
  const valResult = calculateHoldingMarketValue(inv, parentTxs, marketPrices);

  const isCommodity = isCommodityCategory(cat);
  const weightUnit = isCommodity ? (inv.weightUnit || 'g') : undefined;
  const weightGrams = isCommodity ? (valResult.unitInGrams ?? inv.weightGrams ?? valResult.effectiveQuantity ?? inv.quantity ?? 0) : undefined;

  return {
    holdingId: inv.id,
    assetName: inv.assetName,
    assetType: cat,
    normalizedCategory: normalizeValuationCategory(cat),
    quantity: valResult.effectiveQuantity ?? inv.quantity ?? 0,
    weightGrams,
    weightUnit,
    symbol: rawSym,
    yahooSymbol: resolved.yahooSymbol,
    currentPrice: valResult.effectivePrice ?? inv.currentPrice ?? null,
    marketValue: valResult.marketValue,
    investedAmount: inv.investedAmount ?? 0,
    valuationSource: valResult.valuationSource,
    isValued: valResult.isValued && valResult.marketValue !== null,
    reason: valResult.reason
  };
};

export const getPortfolioValuation = (
  investments: Investment[],
  transactions: Transaction[],
  marketPrices: Record<string, MarketPriceData>,
  ownerFilter: string = 'All'
): PortfolioValuationSummary => {
  const activeHoldings = investments.filter(inv => {
    if (ownerFilter !== 'All' && inv.owner !== ownerFilter) return false;
    if (inv.category === 'IPOs' || inv.assetType === 'IPOs') {
      const status = inv.ipoAllotmentStatus || 'Applied';
      const isAllotted = status === 'Allotted' || status === 'Partially Allotted' || status === 'Listed' || status === 'Sold';
      if (!isAllotted) return false;
    }
    const qty = inv.quantity ?? inv.weightGrams ?? 0;
    if (qty <= 0) return false;
    return true;
  });

  const holdingsValuation: HoldingValuationResult[] = activeHoldings.map(inv =>
    getHoldingValuation(inv, transactions, marketPrices)
  );

  const CORE_6_CLASSES = ['Stocks', 'Mutual Funds', 'ETFs', 'Gold', 'Silver', 'Platinum'];

  const assetClassTotals: Record<string, number> = {
    'Stocks': 0,
    'Mutual Funds': 0,
    'ETFs': 0,
    'Gold': 0,
    'Silver': 0,
    'Platinum': 0
  };

  const holdingCounts: Record<string, number> = {
    'Stocks': 0,
    'Mutual Funds': 0,
    'ETFs': 0,
    'Gold': 0,
    'Silver': 0,
    'Platinum': 0
  };

  let unvaluedHoldingsCount = 0;
  let totalInvested = 0;

  holdingsValuation.forEach(hv => {
    totalInvested += hv.investedAmount;
    const cat = hv.normalizedCategory;
    if (CORE_6_CLASSES.includes(cat)) {
      holdingCounts[cat] = (holdingCounts[cat] || 0) + 1;
      if (hv.isValued && hv.marketValue !== null && hv.marketValue > 0) {
        assetClassTotals[cat] = (assetClassTotals[cat] || 0) + hv.marketValue;
      } else {
        unvaluedHoldingsCount++;
      }
    }
  });

  const totalMarketValue = Object.values(assetClassTotals).reduce((sum, val) => sum + val, 0);

  const allocations: AssetClassAllocationItem[] = CORE_6_CLASSES.map(name => {
    const value = assetClassTotals[name] || 0;
    const pct = totalMarketValue > 0 ? (value / totalMarketValue) * 100 : 0;
    return {
      name,
      value: safeRound(value),
      percentage: Math.round(pct * 10) / 10,
      holdingCount: holdingCounts[name] || 0
    };
  });

  return {
    totalMarketValue: safeRound(totalMarketValue),
    totalInvested: safeRound(totalInvested),
    assetClassTotals,
    allocations,
    holdingsValuation,
    unvaluedHoldingsCount
  };
};

export const getAssetClassAllocation = (
  investments: Investment[],
  transactions: Transaction[],
  marketPrices: Record<string, MarketPriceData>,
  ownerFilter: string = 'All'
): AssetClassAllocationItem[] => {
  return getPortfolioValuation(investments, transactions, marketPrices, ownerFilter).allocations;
};
