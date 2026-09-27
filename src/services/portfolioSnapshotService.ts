import type { Investment, Transaction, AssetType } from '../types';
import type { MarketPriceData } from './marketDataService';
import {
  isCommodityCategory,
  getEffectiveTransactionCost,
  calculateTotalInvested,
  safeRound,
  isDemoInvestment,
  isDemoTransaction
} from './portfolioCalculationService';
import { getHistoricalPriceForSymbol } from './historicalPriceService';
import { calculateFDDetails } from '../utils/calculations';

export interface HoldingSnapshotItem {
  investmentId: string;
  assetName: string;
  symbol?: string;
  category: AssetType;
  quantity: number;
  price: number | null;
  marketValue: number;
  investedCapital: number;
}

export interface PortfolioSnapshot {
  date: string; // 'YYYY-MM-DD'
  displayDate: string; // 'Sep 25, 2026'
  netInvested: number; // Actual cumulative net cash invested by user over time
  investedCapital: number; // Active cost basis in current holdings
  marketValue: number | null; // null if market prices missing for active assets
  hasPartialMarketData: boolean;
  holdingsBreakdown: HoldingSnapshotItem[];
}

/**
 * Parses YYYY-MM-DD safely into Date without timezone offsets.
 */
const parseDateString = (dateStr: string): Date => {
  const clean = dateStr.split('T')[0];
  const [y, m, d] = clean.split('-').map(v => parseInt(v, 10));
  return new Date(y, (m || 1) - 1, d || 1);
};

/**
 * Formats YYYY-MM-DD into "25 Sep 2026" or "Sep 25, 2026"
 */
export const formatSnapshotDate = (dateStr: string): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const clean = dateStr.split('T')[0];
  const [y, m, d] = clean.split('-').map(v => parseInt(v, 10));
  return `${d} ${months[(m || 1) - 1]} ${y}`;
};

/**
 * Checks if a transaction occurred on or before a given YYYY-MM-DD date.
 */
const isTxOnOrBeforeDate = (txDateStr: string, dateStr: string): boolean => {
  const txClean = txDateStr.split('T')[0];
  const targetClean = dateStr.split('T')[0];
  return txClean <= targetClean;
};

/**
 * Generates daily portfolio valuation snapshots from transaction history and price provider.
 */
export const generatePortfolioSnapshots = (params: {
  investments: Investment[];
  transactions: Transaction[];
  marketPrices?: Record<string, MarketPriceData>;
  historicalPricesCache?: Record<string, Record<string, number>>;
  dateFilter?: '1-month' | '3-months' | '6-months' | '1-year' | 'all-time' | 'custom' | string;
  customStart?: string;
  customEnd?: string;
  dataTypeFilter?: 'All' | 'Real' | 'Demo';
  ownerFilter?: string;
}): PortfolioSnapshot[] => {
  const {
    investments,
    transactions,
    marketPrices = {},
    dateFilter = 'all-time',
    customStart,
    customEnd,
    dataTypeFilter = 'All',
    ownerFilter = 'All'
  } = params;

  // Filter raw investments by data type and owner filter
  const filteredInvs = investments.filter(inv => {
    const isDemo = isDemoInvestment(inv);
    if (dataTypeFilter === 'Real' && isDemo) return false;
    if (dataTypeFilter === 'Demo' && !isDemo) return false;
    if (ownerFilter !== 'All' && inv.owner !== ownerFilter) return false;
    return true;
  });

  // Filter raw transactions by data type and owner filter
  const filteredTxs = transactions.filter(tx => {
    const isDemo = isDemoTransaction(tx, investments);
    if (dataTypeFilter === 'Real' && isDemo) return false;
    if (dataTypeFilter === 'Demo' && !isDemo) return false;
    const parent = investments.find(inv => inv.id === tx.investmentId);
    if (parent && ownerFilter !== 'All' && parent.owner !== ownerFilter) return false;
    return true;
  });

  if (filteredInvs.length === 0) return [];

  // Find date bounds
  let minDateStr = '2026-01-01';
  const allDates: string[] = [];

  filteredInvs.forEach(inv => {
    const buyDate = inv.buyDate || inv.purchaseDate;
    if (buyDate) allDates.push(buyDate.split('T')[0]);
  });

  filteredTxs.forEach(tx => {
    if (tx.date) allDates.push(tx.date.split('T')[0]);
  });

  if (allDates.length > 0) {
    allDates.sort();
    minDateStr = allDates[0];
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (minDateStr > todayStr) {
    minDateStr = todayStr;
  }

  // Generate continuous list of dates from minDateStr to todayStr
  const snapshotDates: string[] = [];
  let currDate = parseDateString(minDateStr);
  const endDate = parseDateString(todayStr);

  while (currDate <= endDate) {
    const y = currDate.getFullYear();
    const m = String(currDate.getMonth() + 1).padStart(2, '0');
    const d = String(currDate.getDate()).padStart(2, '0');
    snapshotDates.push(`${y}-${m}-${d}`);
    currDate.setDate(currDate.getDate() + 1);
  }

  const snapshots: PortfolioSnapshot[] = [];

  // Perform daily valuation for each snapshot date
  snapshotDates.forEach((dStr, idx) => {
    const isToday = idx === snapshotDates.length - 1;
    let totalInvestedCost = 0;
    let totalNetCashInvested = 0;
    let totalMarketValue = 0;
    let missingPriceCount = 0;
    let activeHoldingCount = 0;

    const items: HoldingSnapshotItem[] = [];

    filteredInvs.forEach(inv => {
      const category = inv.category || inv.assetType || 'Stocks';

      // 1. IPO Check
      if (category === 'IPOs') {
        const status = inv.ipoAllotmentStatus || inv.allotmentStatus || 'Applied';
        const isAllotted = ['Allotted', 'Partially Allotted', 'Listed', 'Sold'].includes(status);
        if (!isAllotted) {
          // Unallotted / Applied IPO: ₹0 invested, ₹0 market value, 0 shares
          return;
        }

        const allotmentDate = inv.buyDate || inv.purchaseDate || '2026-01-01';
        if (!isTxOnOrBeforeDate(allotmentDate, dStr)) {
          // Not allotted yet as of date dStr
          return;
        }

        const allottedQty = inv.ipoQuantityAllotted ?? inv.quantity ?? 0;
        const issuePrice = inv.ipoAllotmentPrice ?? inv.buyPrice ?? 0;
        totalNetCashInvested += (allottedQty * issuePrice) + (inv.charges ?? 0);
      } else {
        // Net Cash Invested tracking for regular assets
        const parentTxsForNet = filteredTxs.filter(tx => tx.investmentId === inv.id && isTxOnOrBeforeDate(tx.date || '2026-01-01', dStr));

        if (parentTxsForNet.length > 0) {
          parentTxsForNet.forEach(tx => {
            if (tx.type === 'BUY') {
              const cost = isCommodityCategory(category)
                ? (tx.price ?? 0)
                : getEffectiveTransactionCost(tx, inv);
              totalNetCashInvested += cost + (tx.charges ?? 0);
            } else if (tx.type === 'SELL') {
              const netProceeds = (tx.quantity * tx.price) - (tx.charges ?? 0);
              totalNetCashInvested -= Math.max(0, netProceeds);
            }
          });
        } else {
          const invDate = inv.buyDate || inv.purchaseDate || '2026-01-01';
          if (isTxOnOrBeforeDate(invDate, dStr)) {
            totalNetCashInvested += inv.investedAmount ?? ((inv.buyPrice ?? 0) * (inv.quantity ?? 1));
          }
        }
      }

      // 2. Reconstruct holdings & cost basis up to date dStr
      const parentTxs = filteredTxs.filter(tx => tx.investmentId === inv.id && isTxOnOrBeforeDate(tx.date || '2026-01-01', dStr));

      let qty = 0;
      let costBasis = 0;

      if (parentTxs.length > 0) {
        // Sort chronologically up to date dStr
        const sortedTxs = [...parentTxs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        sortedTxs.forEach(tx => {
          if (tx.type === 'BUY') {
            const cost = isCommodityCategory(category)
              ? (tx.price ?? 0)
              : getEffectiveTransactionCost(tx, inv);
            qty += tx.quantity;
            costBasis += cost + (tx.charges ?? 0);
          } else if (tx.type === 'SELL') {
            const soldQty = Math.min(tx.quantity, qty);
            if (soldQty > 0) {
              const avgPriceBeforeSell = qty > 0 ? costBasis / qty : 0;
              qty -= soldQty;
              costBasis = qty * avgPriceBeforeSell;
            }
          } else if (tx.type === 'SPLIT') {
            const ratioParts = (tx.ratio || '1:1').split(':');
            const oldR = parseFloat(ratioParts[0]) || 1;
            const newR = parseFloat(ratioParts[1]) || 1;
            if (oldR > 0 && newR > 0) {
              qty = qty * (newR / oldR);
            }
          }
        });
      } else {
        // Fallback for legacy investments without explicit tx records
        const invDate = inv.buyDate || inv.purchaseDate || '2026-01-01';
        if (isTxOnOrBeforeDate(invDate, dStr)) {
          qty = inv.quantity ?? 1;
          costBasis = inv.investedAmount ?? ((inv.buyPrice ?? 0) * qty);
        }
      }

      // Zero-quantity asset handling: quantity = 0 => ₹0 market value, ₹0 invested capital
      if (qty <= 0) {
        return;
      }

      activeHoldingCount++;
      costBasis = safeRound(costBasis);
      totalInvestedCost += costBasis;

      // 3. Resolve historical price & market value on date dStr
      let price: number | null = null;
      let marketVal = 0;

      if (category === 'Fixed Deposits') {
        const rate = inv.interestRate ?? 0;
        const start = inv.buyDate || inv.purchaseDate || '2026-01-01';
        const end = inv.maturityDate || start;
        const freq = inv.compoundingFrequency || 'Quarterly';
        const details = calculateFDDetails(costBasis, rate, start, dStr < end ? dStr : end, freq);
        marketVal = details.accruedCurrentValue;
        price = costBasis > 0 ? marketVal / qty : 0;
      } else if (category === 'Savings/Cash') {
        marketVal = costBasis;
        price = 1;
      } else if (category === 'IPOs') {
        const issuePrice = inv.ipoAllotmentPrice ?? inv.buyPrice ?? 0;
        const status = inv.ipoAllotmentStatus || inv.allotmentStatus || 'Applied';
        if (status === 'Listed') {
          // Check historical market price if listed
          const histP = isToday
            ? (marketPrices[inv.symbol?.toUpperCase() || '']?.price ?? getHistoricalPriceForSymbol(inv.symbol, category, dStr))
            : getHistoricalPriceForSymbol(inv.symbol, category, dStr);
          price = histP ?? inv.ipoListingPrice ?? issuePrice;
        } else {
          price = issuePrice;
        }
        marketVal = qty * (price ?? 0);
      } else {
        // Stocks, ETFs, Mutual Funds, Gold/Silver, Crypto, Bonds, etc.
        const rawSym = inv.symbol?.trim().toUpperCase();

        if (isToday) {
          // On current date: resolve price from live marketPrices map, historical cache, or investment properties
          if (rawSym && marketPrices[rawSym] && marketPrices[rawSym].price > 0) {
            price = marketPrices[rawSym].price;
          } else {
            const histP = getHistoricalPriceForSymbol(inv.symbol, category, dStr);
            if (histP !== null && histP > 0) {
              price = histP;
            } else if (category === 'Mutual Funds') {
              price = inv.nav ?? inv.currentPrice ?? (costBasis > 0 && qty > 0 ? costBasis / qty : null);
            } else if (isCommodityCategory(category)) {
              price = inv.currentPricePerGram ?? inv.currentPrice ?? (costBasis > 0 && qty > 0 ? costBasis / qty : null);
            } else if (inv.currentPrice && inv.currentPrice !== inv.buyPrice && inv.currentPrice > 0) {
              price = inv.currentPrice;
            } else if (inv.currentValue && inv.currentValue > 0 && qty > 0) {
              price = inv.currentValue / qty;
            } else {
              price = null;
            }
          }
        } else {
          // On historical dates: strictly resolve historical price from provider
          price = getHistoricalPriceForSymbol(inv.symbol, category, dStr);
        }

        if (price !== null && price > 0) {
          marketVal = qty * price;
        } else {
          // Strict financial accuracy: if historical market price is unavailable, set price to null
          // Do NOT fall back to buyPrice or currentPrice to estimate fake historical valuation
          price = null;
          marketVal = 0;
          missingPriceCount++;
        }
      }

      marketVal = safeRound(marketVal);
      totalMarketValue += marketVal;

      items.push({
        investmentId: inv.id,
        assetName: inv.assetName,
        symbol: inv.symbol,
        category,
        quantity: qty,
        price,
        marketValue: marketVal,
        investedCapital: costBasis
      });
    });

    const roundedNetInvested = safeRound(Math.max(0, totalNetCashInvested));
    const roundedInvested = safeRound(totalInvestedCost);
    const roundedMarket = safeRound(totalMarketValue);

    // Calculate final marketValue: if active holdings exist and any price is missing, set to null
    const finalMarketValue = activeHoldingCount > 0 && missingPriceCount > 0 ? null : (activeHoldingCount === 0 ? 0 : roundedMarket);

    // Debug logging for latest snapshot (current date)
    if (isToday) {
      console.log(`[Portfolio Growth Debug]`);
      console.log(`Date: ${dStr}`);
      console.log(`Net Invested: ₹${roundedNetInvested}`);
      console.log(`Market Value: ${finalMarketValue !== null ? `₹${finalMarketValue}` : 'null (missing price data)'}`);
      console.log(`Holdings:`);
      if (items.length === 0) {
        console.log(`  No active holdings on this date.`);
      } else {
        items.forEach(item => {
          if (item.price !== null) {
            console.log(`  ${item.symbol || item.assetName} | Qty: ${item.quantity} | Price: ₹${item.price} | Value: ₹${item.marketValue}`);
          } else {
            console.log(`  ${item.symbol || item.assetName} | Qty: ${item.quantity} | EXCLUDED (Historical price unavailable)`);
          }
        });
      }
    }

    snapshots.push({
      date: dStr,
      displayDate: formatSnapshotDate(dStr),
      netInvested: roundedNetInvested,
      investedCapital: roundedInvested,
      marketValue: finalMarketValue,
      hasPartialMarketData: missingPriceCount > 0,
      holdingsBreakdown: items
    });
  });

  // Reconcile final snapshot invested capital with current total invested
  if (snapshots.length > 0) {
    const finalSnap = snapshots[snapshots.length - 1];
    const currentTotalInvested = calculateTotalInvested(filteredInvs, filteredTxs);

    if (Math.abs(finalSnap.investedCapital - currentTotalInvested) > 1) {
      console.warn(
        `[Transaction Reconciliation Warning] Snapshot final invested capital (${finalSnap.investedCapital}) != calculateTotalInvested (${currentTotalInvested})`
      );
    }
  }

  // Filter snapshots according to dateFilter
  return filterSnapshotsByRange(snapshots, dateFilter, customStart, customEnd);
};

/**
 * Filters generated snapshots based on time range selection (1M, 3M, 6M, 1Y, ALL, Custom)
 */
export const filterSnapshotsByRange = (
  snapshots: PortfolioSnapshot[],
  range: string,
  customStart?: string,
  customEnd?: string
): PortfolioSnapshot[] => {
  if (snapshots.length === 0) return [];
  if (range === 'all-time' || range === 'ALL') return snapshots;

  const lastDate = parseDateString(snapshots[snapshots.length - 1].date);
  let cutoffDate = new Date(lastDate);

  if (range === '1-month' || range === '1M' || range === 'this-month') {
    cutoffDate.setMonth(cutoffDate.getMonth() - 1);
  } else if (range === '3-months' || range === '3M') {
    cutoffDate.setMonth(cutoffDate.getMonth() - 3);
  } else if (range === '6-months' || range === '6M') {
    cutoffDate.setMonth(cutoffDate.getMonth() - 6);
  } else if (range === '1-year' || range === '1Y') {
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
  } else if (range === 'custom' && customStart) {
    cutoffDate = parseDateString(customStart);
  }

  const cutoffStr = cutoffDate.toISOString().split('T')[0];
  const endStr = customEnd ? customEnd.split('T')[0] : '9999-12-31';

  const filtered = snapshots.filter(s => s.date >= cutoffStr && s.date <= endStr);
  return filtered.length > 0 ? filtered : snapshots;
};
