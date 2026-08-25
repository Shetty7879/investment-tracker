import type { Investment, Transaction, Goal } from '../types';
import type { MarketPriceData } from './marketDataService';
import { calculateFDDetails, getMutualFundMetrics, getMutualFundTransactionMetrics } from '../utils/calculations';

export interface HoldingMetrics extends Investment {
  quantity: number;
  buyPrice: number;
  currentPrice?: number | null;
  investedAmount: number;
  currentValue?: number | null;
  profitLoss?: number | null;     // Unrealized P/L
  returnPercent?: number | null;    // Unrealized return %
  realizedPL: number;      // Realized P/L
  totalPL: number;         // Total P/L (Realized + Unrealized)
  priceStatus: 'live' | 'cached' | 'unavailable' | 'not_allocated';
  priceTimestamp?: number;
  priceSource?: string;
  priceMarketState?: 'open' | 'closed';
  priceChange?: number;
  priceChangePercent?: number;
  isValuationUnavailable?: boolean;
}

export interface PortfolioTotals {
  totalInvested: number;
  totalCurrent: number;
  unrealizedPL: number;
  realizedPL: number;
  totalPL: number;
  returnPercentage: number;       // Unrealized return %
  overallReturnPercentage: number; // Overall return % (Total PL / Total Invested)
}

export interface GoalMetrics {
  contributed: number;
  currentValue: number;
  target: number;
  remaining: number;
  progressPercent: number;
}

/**
 * Helper to identify if a category represents a commodity.
 */
export const isCommodityCategory = (cat?: string): boolean => {
  if (!cat) return false;
  const clean = cat.trim().toLowerCase();
  return clean === 'gold' || clean === 'silver' || clean === 'platinum' ||
         clean === 'digital gold' || clean === 'digital silver' || clean === 'digital platinum';
};

/**
 * Rounds value to 2 decimal places safely, preventing negative zero and handling NaN/Infinity.
 */
export const safeRound = (value: number | undefined | null): number => {
  if (value === undefined || value === null || isNaN(value) || !isFinite(value)) return 0;
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
};

/**
 * Checks if the Indian market is open based on the current timestamp.
 * Indian Stock Market hours: 09:15 - 15:30 IST, Monday - Friday.
 */
export const isIndianMarketOpen = (date: Date): boolean => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
      weekday: 'short'
    });
    const parts = formatter.formatToParts(date);
    const partMap: Record<string, string> = {};
    parts.forEach(p => {
      partMap[p.type] = p.value;
    });

    const weekday = partMap.weekday; // 'Mon', 'Tue', etc.
    if (weekday === 'Sat' || weekday === 'Sun') return false;

    const hour = parseInt(partMap.hour, 10);
    const minute = parseInt(partMap.minute, 10);
    const timeVal = hour * 100 + minute;

    return timeVal >= 915 && timeVal <= 1530;
  } catch {
    // Fallback if Intl fails
    const day = date.getDay();
    if (day === 0 || day === 6) return false;
    // Assume local machine offset is close or just fallback to simple check
    const hour = date.getHours();
    const min = date.getMinutes();
    const timeVal = hour * 100 + min;
    return timeVal >= 915 && timeVal <= 1530;
  }
};

/**
 * Generates virtual transactions list if transactions are empty or missing.
 */
export const getEffectiveTransactions = (inv: Investment, allTxs: Transaction[]): Transaction[] => {
  const holdingTxs = allTxs.filter(tx => tx.investmentId === inv.id);
  if (holdingTxs.length > 0) {
    const sorted = [...holdingTxs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const isMF = inv.category === 'Mutual Funds' || inv.assetType === 'Mutual Funds';
    if (isMF) {
      return sorted.map(tx => {
        const metrics = getMutualFundTransactionMetrics(tx, inv);
        return {
          ...tx,
          quantity: metrics.quantity,
          price: metrics.price,
          amount: metrics.amount
        };
      });
    }
    return sorted;
  }

  // Generate fallback transaction
  let qty = inv.quantity ?? 1;
  let price = inv.buyPrice ?? inv.currentPrice ?? 0;
  const category = inv.category || inv.assetType || 'Stocks';

  if (category === 'Mutual Funds') {
    const mf = getMutualFundMetrics(inv);
    qty = mf.units;
    price = mf.nav;
  } else if (isCommodityCategory(category)) {
    qty = inv.weightGrams ?? inv.quantity ?? 1;
    price = inv.buyPricePerGram ?? inv.buyPrice ?? 0;
  } else if (category === 'Fixed Deposits' || category === 'Savings/Cash') {
    qty = 1;
    price = inv.investedAmount ?? inv.buyPrice ?? 0;
  } else if (category === 'IPOs') {
    qty = inv.ipoQuantityApplied ?? inv.quantity ?? 1;
    price = inv.ipoAllotmentPrice ?? inv.buyPrice ?? 0;
  }

  return [
    {
      id: `fallback-tx-${inv.id}`,
      investmentId: inv.id,
      type: 'BUY',
      quantity: qty,
      price: price,
      amount: category === 'Mutual Funds'
        ? getMutualFundMetrics(inv).investedAmount
        : isCommodityCategory(category)
          ? (inv.investedAmount ?? 0)
          : (qty * price),
      charges: inv.charges ?? 0,
      date: inv.buyDate || inv.purchaseDate || '2026-01-01',
      isDemo: !!inv.isDemo,
      createdAt: new Date().toISOString()
    }
  ];
};

/**
 * Calculates financial metrics for a single investment holding.
 */
export const calculateHoldingMetrics = (
  inv: Investment,
  allTxs: Transaction[],
  marketPrices: Record<string, MarketPriceData>
): HoldingMetrics => {
  const category = inv.category || inv.assetType || 'Stocks';

  if (isCommodityCategory(category)) {
    const hasInvested = inv.investedAmount !== undefined && inv.investedAmount !== null && inv.investedAmount > 0;
    const hasCurrent = inv.currentValue !== undefined && inv.currentValue !== null && inv.currentValue > 0;
    return {
      ...inv,
      quantity: inv.weightGrams ?? inv.quantity ?? 0,
      buyPrice: inv.buyPricePerGram ?? inv.buyPrice ?? 0,
      currentPrice: inv.currentPricePerGram ?? inv.currentPrice ?? null,
      investedAmount: inv.investedAmount ?? 0,
      currentValue: inv.currentValue ?? undefined,
      profitLoss: undefined,
      returnPercent: undefined,
      realizedPL: 0,
      totalPL: 0,
      priceStatus: 'cached',
      priceSource: 'Manual Entry',
      isValuationUnavailable: !hasInvested && !hasCurrent
    };
  }

  const txList = getEffectiveTransactions(inv, allTxs);

  let currentQuantity = 0;
  let averageBuyPrice = 0;
  let totalInvestedCost = 0;
  let realizedPL = 0;

  // Process transaction logs
  txList.forEach(tx => {
    if (tx.type === 'BUY') {
      const grossCost = category === 'Mutual Funds' ? tx.amount : (tx.quantity * tx.price);
      const totalCost = grossCost + tx.charges;
      const nextQuantity = currentQuantity + tx.quantity;
      if (nextQuantity > 0) {
        averageBuyPrice = ((currentQuantity * averageBuyPrice) + totalCost) / nextQuantity;
      }
      currentQuantity = nextQuantity;
      totalInvestedCost = currentQuantity * averageBuyPrice;
    } else if (tx.type === 'SELL') {
      const sellQuantity = Math.min(tx.quantity, currentQuantity);
      if (sellQuantity > 0) {
        const grossProceeds = sellQuantity * tx.price;
        const netProceeds = grossProceeds - tx.charges;
        const costOfSold = sellQuantity * averageBuyPrice;

        realizedPL += (netProceeds - costOfSold);
        currentQuantity = currentQuantity - sellQuantity;
        totalInvestedCost = currentQuantity * averageBuyPrice;
        if (currentQuantity === 0) {
          averageBuyPrice = 0;
        }
      }
    } else if (tx.type === 'DIVIDEND' || tx.type === 'INTEREST') {
      realizedPL += (tx.amount - tx.charges);
    } else if (tx.type === 'CHARGE') {
      realizedPL -= (tx.amount + tx.charges);
    }
  });

  // IPO-specific holdings override
  let appliedAmount: number | undefined = undefined;
  let allocatedQuantity: number | undefined = undefined;

  if (category === 'IPOs') {
    const status = inv.ipoAllotmentStatus || 'Applied';
    appliedAmount = totalInvestedCost;

    const isAllotted = status === 'Allotted' || status === 'Partially Allotted' || status === 'Listed' || status === 'Sold';
    if (!isAllotted) {
      // Applied but NOT ALLOTTED (Applied, Payment Pending, Allocation Pending, Not Allotted, Refund Pending, Refunded)
      currentQuantity = 0;
      totalInvestedCost = 0;
      allocatedQuantity = 0;
      averageBuyPrice = 0;
    } else {
      // Allotted / Partially Allotted / Listed / Sold
      const allottedQty = (status === 'Partially Allotted' || status === 'Allotted' || status === 'Listed')
        ? (inv.ipoQuantityAllotted ?? currentQuantity)
        : currentQuantity;

      const issuePrice = inv.ipoAllotmentPrice ?? inv.buyPrice ?? 0;
      totalInvestedCost = allottedQty * issuePrice + (inv.charges ?? 0);
      allocatedQuantity = allottedQty;
      averageBuyPrice = issuePrice;

      if (status === 'Sold') {
        currentQuantity = 0;
      } else {
        currentQuantity = allottedQty;
      }
    }
  }

  // Determine current price and status
  let curPrice: number | null | undefined = undefined;
  let priceStatus: 'live' | 'cached' | 'unavailable' | 'not_allocated' = 'unavailable';
  let priceTimestamp: number | undefined = undefined;
  let priceSource: string | undefined = undefined;
  let priceMarketState: 'open' | 'closed' = 'closed';
  let priceChange: number | undefined = undefined;
  let priceChangePercent: number | undefined = undefined;
  let isValuationUnavailable = false;

  const isIPO = category === 'IPOs';
  const ipoStatus = inv.ipoAllotmentStatus || 'Applied';
  const isIPOAllotted = isIPO && (ipoStatus === 'Allotted' || ipoStatus === 'Partially Allotted' || ipoStatus === 'Listed' || ipoStatus === 'Sold');

  if (category === 'Stocks' || category === 'ETFs' || (isIPO && ipoStatus === 'Listed')) {
    const rawSym = inv.symbol?.trim().toUpperCase();
    if (rawSym && marketPrices && marketPrices[rawSym]) {
      const cache = marketPrices[rawSym];
      curPrice = cache.price;
      priceTimestamp = cache.timestamp;
      priceSource = cache.source;
      priceMarketState = cache.marketState;
      priceChange = cache.change;
      priceChangePercent = cache.changePercent;

      const ageMs = Date.now() - cache.timestamp;
      const marketOpen = isIndianMarketOpen(new Date());

      if (marketOpen && ageMs < 10 * 60 * 1000) {
        priceStatus = 'live';
      } else {
        priceStatus = 'cached';
      }
    } else {
      // No live or cached price exists in marketPrices map.
      if (isIPO) {
        // Fall back to listing price or allotment price for listed IPOs
        curPrice = inv.ipoListingPrice ?? inv.ipoAllotmentPrice ?? inv.buyPrice ?? 0;
        priceStatus = 'unavailable';
        priceSource = 'IPO Listing Price Fallback';
      } else {
        // Do NOT fall back to inv.currentPrice if it equals inv.buyPrice or is missing.
        if (inv.currentPrice !== undefined && inv.currentPrice !== null && inv.currentPrice > 0 && inv.currentPrice !== inv.buyPrice) {
          curPrice = inv.currentPrice;
          priceStatus = 'unavailable';
          priceSource = 'Manual Price';
        } else if (inv.currentValue !== undefined && inv.currentValue !== null && inv.currentValue > 0 && inv.currentValue !== (currentQuantity * inv.buyPrice)) {
          curPrice = currentQuantity > 0 ? inv.currentValue / currentQuantity : 0;
          priceStatus = 'unavailable';
          priceSource = 'Manual Value';
        } else {
          priceStatus = 'unavailable';
          isValuationUnavailable = true;
        }
      }
    }
  } else if (isIPO) {
    if (!isIPOAllotted) {
      curPrice = undefined;
      priceStatus = 'not_allocated';
      isValuationUnavailable = true;
    } else {
      // Allotted but not listed yet: current price is allotment price
      curPrice = inv.ipoAllotmentPrice ?? inv.buyPrice ?? 0;
      priceStatus = 'cached';
      priceSource = 'Allotment Price';
    }
  } else {
    // Non-Stock/ETF/IPO assets
    priceStatus = 'cached';
    priceSource = 'Manual Entry';
    if (category === 'Mutual Funds') {
      curPrice = inv.nav ?? inv.currentPrice ?? averageBuyPrice;
    } else if (category === 'Gold' || category === 'Silver' || category === 'Platinum') {
      curPrice = inv.currentPricePerGram ?? inv.currentPrice ?? averageBuyPrice;
    } else {
      curPrice = inv.currentPrice ?? averageBuyPrice;
    }
  }

  // Calculate currentValue based on asset types
  let currentValue: number | undefined | null = 0;
  if (isValuationUnavailable) {
    if (isIPO && !isIPOAllotted) {
      currentValue = 0;
    } else {
      currentValue = undefined;
    }
  } else if (category === 'Fixed Deposits') {
    const rate = inv.interestRate ?? 0;
    const start = inv.buyDate || inv.purchaseDate || '2026-01-01';
    const end = inv.maturityDate || start;
    const freq = inv.compoundingFrequency || 'Quarterly';
    const details = calculateFDDetails(totalInvestedCost, rate, start, end, freq);
    currentValue = details.accruedCurrentValue;
  } else if (category === 'Savings/Cash') {
    currentValue = currentQuantity;
  } else if (category === 'IPOs') {
    const status = inv.ipoAllotmentStatus || 'Applied';
    const isAllotted = status === 'Allotted' || status === 'Partially Allotted' || status === 'Listed' || status === 'Sold';
    if (!isAllotted) {
      currentValue = 0;
    } else if (status === 'Sold') {
      currentValue = 0;
    } else {
      const issuePrice = inv.ipoAllotmentPrice ?? inv.buyPrice ?? 0;
      const listPrice = inv.ipoListingPrice ?? issuePrice;
      const finalPrice = status === 'Listed' ? (curPrice ?? listPrice) : listPrice;
      currentValue = currentQuantity * finalPrice;
    }
  } else {
    // Stocks, ETFs, Mutual Funds, Commodities
    currentValue = currentQuantity * (curPrice ?? 0);
  }

  // Apply rounding safety
  totalInvestedCost = safeRound(totalInvestedCost);
  currentValue = currentValue !== undefined && currentValue !== null ? safeRound(currentValue) : undefined;
  realizedPL = safeRound(realizedPL);

  let unrealizedPL: number | undefined | null = undefined;
  let returnPercent: number | undefined | null = undefined;
  let totalPL = realizedPL;

  if (currentValue !== undefined && currentValue !== null) {
    unrealizedPL = safeRound(currentValue - totalInvestedCost);
    returnPercent = totalInvestedCost > 0 ? safeRound((unrealizedPL / totalInvestedCost) * 100) : 0;
    totalPL = safeRound(realizedPL + unrealizedPL);
  }

  return {
    ...inv,
    quantity: currentQuantity,
    buyPrice: safeRound(averageBuyPrice),
    currentPrice: curPrice !== undefined && curPrice !== null ? safeRound(curPrice) : undefined,
    investedAmount: totalInvestedCost,
    currentValue: currentValue ?? undefined,
    profitLoss: unrealizedPL ?? undefined,
    returnPercent: returnPercent ?? undefined,
    realizedPL,
    totalPL,
    priceStatus,
    priceTimestamp,
    priceSource,
    priceMarketState,
    priceChange: priceChange !== undefined ? safeRound(priceChange) : undefined,
    priceChangePercent: priceChangePercent !== undefined ? safeRound(priceChangePercent) : undefined,
    isValuationUnavailable,
    appliedAmount,
    allocatedQuantity
  };
};

/**
 * Calculates portfolio totals from a list of calculated holdings.
 */
export const calculatePortfolioTotals = (
  calculatedHoldings: HoldingMetrics[]
): PortfolioTotals => {
  let totalInvested = 0;
  let totalCurrent = 0;
  let totalRealized = 0;

  calculatedHoldings.forEach(h => {
    // Exclude unallotted IPOs and completely unavailable valuations from aggregates
    if (h.category === 'IPOs') {
      const status = h.ipoAllotmentStatus || 'Applied';
      const isAllotted = status === 'Allotted' || status === 'Partially Allotted' || status === 'Listed' || status === 'Sold';
      if (!isAllotted) return;
    }
    if (h.isValuationUnavailable) return;

    totalInvested += h.investedAmount;
    totalCurrent += h.currentValue ?? 0;
    totalRealized += h.realizedPL;
  });

  totalInvested = safeRound(totalInvested);
  totalCurrent = safeRound(totalCurrent);
  totalRealized = safeRound(totalRealized);

  const unrealizedPL = safeRound(totalCurrent - totalInvested);
  const totalPL = safeRound(totalRealized + unrealizedPL);
  const returnPercentage = totalInvested > 0 ? safeRound((unrealizedPL / totalInvested) * 100) : 0;
  const overallReturnPercentage = totalInvested > 0 ? safeRound((totalPL / totalInvested) * 100) : 0;

  return {
    totalInvested,
    totalCurrent,
    unrealizedPL,
    realizedPL: totalRealized,
    totalPL,
    returnPercentage,
    overallReturnPercentage
  };
};

/**
 * Calculates goals metrics, separating contribution principal and current investment value.
 */
export const calculateGoalMetrics = (
  goal: Goal,
  calculatedHoldings: HoldingMetrics[]
): GoalMetrics => {
  let contributed = goal.currentAmount;
  let currentValue = goal.currentAmount;
  const target = goal.targetAmount;

  if (goal.linkedAssetId) {
    const linked = calculatedHoldings.find(h => h.id === goal.linkedAssetId);
    if (linked) {
      contributed = linked.investedAmount;
      currentValue = linked.currentValue ?? 0;
    } else {
      // Linked asset deleted
      contributed = 0;
      currentValue = 0;
    }
  }

  contributed = safeRound(contributed);
  currentValue = safeRound(currentValue);

  const progressValue = goal.progressMode === 'Automatic' ? currentValue : contributed;
  const remaining = safeRound(Math.max(0, target - progressValue));
  const progressPercent = target > 0 ? safeRound((progressValue / target) * 100) : 0;

  return {
    contributed,
    currentValue,
    target,
    remaining,
    progressPercent
  };
};

/**
 * Groups BUY transactions YTD to get monthly principal investments (no appreciation).
 */
export const calculateMonthlyInvestments = (
  transactions: Transaction[],
  calculatedHoldings: HoldingMetrics[],
  year: number,
  monthlyTarget: number
): { month: string; target: number; actual: number; diff: number; percentage: number }[] => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return monthNames.map((name, index) => {
    const totalForMonth = transactions.reduce((sum, tx) => {
      // Skip demo/fake transactions generated for empty holdings
      if ((tx as any).isDemo) return sum;
      const pDate = new Date(tx.date);
      if (!isNaN(pDate.getTime()) && pDate.getMonth() === index && pDate.getFullYear() === year) {
        const parent = calculatedHoldings.find(h => h.id === tx.investmentId);
        // Exclude unallotted IPO buy transactions (Applied, Not Allotted, Refund Pending, etc.)
        if (parent && parent.category === 'IPOs') {
          const status = parent.ipoAllotmentStatus || 'Applied';
          const isAllotted = status === 'Allotted' || status === 'Partially Allotted' || status === 'Listed' || status === 'Sold';
          if (!isAllotted) return sum;
        }

        if (tx.type === 'BUY') {
          return sum + ((tx.amount ?? (tx.quantity * tx.price)) + tx.charges);
        }
      }
      return sum;
    }, 0);

    const actual = safeRound(totalForMonth);
    const diff = safeRound(actual - monthlyTarget);
    const percentage = monthlyTarget > 0 ? safeRound((actual / monthlyTarget) * 100) : 0;

    return {
      month: name,
      target: monthlyTarget,
      actual,
      diff,
      percentage
    };
  });
};
