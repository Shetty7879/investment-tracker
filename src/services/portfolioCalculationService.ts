import type { Investment, Transaction, Goal } from '../types';
import type { MarketPriceData } from './marketDataService';
import { calculateFDDetails, getMutualFundMetrics, getMutualFundTransactionMetrics } from '../utils/calculations';
import { getConsolidatedHoldings, isHoldingActive } from '../utils/consolidation';
import { resolveMarketSymbol } from './marketSymbolService';

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
  priceUnavailableReason?: string;
}

export interface PortfolioTotals {
  valuationStatus: 'complete' | 'partial' | 'unavailable';
  totalActiveAssets: number;
  pricedAssetsCount: number;
  missingPriceAssetsCount: number;
  totalInvested: number;
  totalCurrent: number;
  pricedMarketValue: number;
  unpricedInvestedCapital: number;
  unrealizedPL: number;
  realizedPL: number;
  totalPL: number;
  returnPercentage: number;       // Unrealized return %
  overallReturnPercentage: number; // Overall return % (Total PL / Total Invested)
  activeHoldingsCount: number;
  unavailablePriceCount: number;
  hasUnavailablePrices: boolean;
  missingAssets: HoldingMetrics[];
  pricedAssets: HoldingMetrics[];
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
          ? (() => {
              if (inv.investedAmount !== undefined && inv.investedAmount !== null) {
                const parsed = typeof inv.investedAmount === 'number' ? inv.investedAmount : parseFloat(inv.investedAmount as any);
                return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
              }
              return 0;
            })()
          : (qty * price),
      charges: inv.charges ?? 0,
      date: inv.buyDate || inv.purchaseDate || '2026-01-01',
      isDemo: !!inv.isDemo,
      createdAt: new Date().toISOString()
    }
  ];
};

export interface MarketValueResult {
  marketValue: number | null;
  valuationSource: string;
  isValued: boolean;
  reason?: string;
  unitInGrams?: number;
  pricePerGram?: number;
  effectiveQuantity?: number;
  effectivePrice?: number | null;
}

/**
 * Normalized helper to calculate Gold / Silver / Platinum holding market value.
 * Converts mg -> grams (grams = mg / 1000).
 * Distinguishes price-per-gram vs total holding value.
 */
export const getGoldHoldingValue = (
  inv: Investment,
  marketPrices?: Record<string, MarketPriceData>
): MarketValueResult & { weightGrams: number } => {
  const unitClean = (inv.weightUnit || (inv as any).unit || '').trim().toLowerCase();
  const rawQty = inv.weightGrams ?? inv.quantity ?? 0;
  const isMg = unitClean === 'mg';
  const weightGrams = isMg ? rawQty / 1000 : rawQty;

  const rawSym = inv.symbol?.trim().toUpperCase();
  const liveQuote = (rawSym && marketPrices && marketPrices[rawSym] && marketPrices[rawSym].price > 0)
    ? marketPrices[rawSym].price
    : null;

  if (liveQuote !== null && liveQuote > 0 && weightGrams > 0) {
    return {
      marketValue: safeRound(weightGrams * liveQuote),
      valuationSource: 'live_commodity_rate',
      isValued: true,
      weightGrams,
      unitInGrams: weightGrams,
      pricePerGram: liveQuote
    };
  }

  if (inv.currentPricePerGram !== undefined && inv.currentPricePerGram !== null && inv.currentPricePerGram > 0 && weightGrams > 0) {
    return {
      marketValue: safeRound(weightGrams * inv.currentPricePerGram),
      valuationSource: 'stored_price_per_gram',
      isValued: true,
      weightGrams,
      unitInGrams: weightGrams,
      pricePerGram: inv.currentPricePerGram
    };
  }

  if (inv.currentPrice !== undefined && inv.currentPrice !== null && inv.currentPrice > 0) {
    const invested = typeof inv.investedAmount === 'number' ? inv.investedAmount : parseFloat(inv.investedAmount as any || '0');
    const isTotalValue = isMg ||
      (invested > 0 && Math.abs(inv.currentPrice - invested) < 1) ||
      (weightGrams > 0 && weightGrams < 1 && inv.currentPrice < 1000);

    if (isTotalValue) {
      return {
        marketValue: safeRound(inv.currentPrice),
        valuationSource: 'stored_total_value',
        isValued: true,
        weightGrams,
        unitInGrams: weightGrams,
        pricePerGram: weightGrams > 0 ? safeRound(inv.currentPrice / weightGrams) : undefined
      };
    } else if (weightGrams > 0) {
      return {
        marketValue: safeRound(weightGrams * inv.currentPrice),
        valuationSource: 'stored_price_per_gram',
        isValued: true,
        weightGrams,
        unitInGrams: weightGrams,
        pricePerGram: inv.currentPrice
      };
    }
  }

  if (inv.currentValue !== undefined && inv.currentValue !== null && inv.currentValue > 0) {
    const val = typeof inv.currentValue === 'number' ? inv.currentValue : parseFloat(inv.currentValue as any);
    if (!isNaN(val) && isFinite(val)) {
      return {
        marketValue: safeRound(val),
        valuationSource: 'stored_total_value',
        isValued: true,
        weightGrams,
        unitInGrams: weightGrams,
        pricePerGram: weightGrams > 0 ? safeRound(val / weightGrams) : undefined
      };
    }
  }

  if (inv.buyPricePerGram !== undefined && inv.buyPricePerGram !== null && inv.buyPricePerGram > 0 && weightGrams > 0) {
    return {
      marketValue: safeRound(weightGrams * inv.buyPricePerGram),
      valuationSource: 'purchase_price_per_gram',
      isValued: true,
      weightGrams,
      unitInGrams: weightGrams,
      pricePerGram: inv.buyPricePerGram
    };
  }

  if (inv.investedAmount !== undefined && inv.investedAmount !== null && inv.investedAmount > 0) {
    const val = typeof inv.investedAmount === 'number' ? inv.investedAmount : parseFloat(inv.investedAmount as any);
    if (!isNaN(val) && isFinite(val)) {
      return {
        marketValue: safeRound(val),
        valuationSource: 'stored_total_value',
        isValued: true,
        weightGrams,
        unitInGrams: weightGrams,
        pricePerGram: weightGrams > 0 ? safeRound(val / weightGrams) : undefined
      };
    }
  }

  return {
    marketValue: null,
    valuationSource: 'unavailable',
    isValued: false,
    reason: 'No valid market price or weight for commodity holding',
    weightGrams,
    unitInGrams: weightGrams
  };
};

/**
 * Single valuation engine helper for every holding.
 * Returns marketValue, valuationSource, isValued, and optional reason.
 */
export const calculateHoldingMarketValue = (
  inv: Investment,
  allTxs: Transaction[],
  marketPrices: Record<string, MarketPriceData>
): MarketValueResult => {
  const cat = (inv.category || inv.assetType || 'Stocks').trim();
  const cleanCat = cat.toLowerCase();

  // 1. COMMODITIES
  if (isCommodityCategory(cat)) {
    return getGoldHoldingValue(inv, marketPrices);
  }

  // Calculate effective transactions and active quantity
  const txList = getEffectiveTransactions(inv, allTxs);
  let currentQuantity = 0;
  let averageBuyPrice = 0;
  let totalInvestedCost = 0;

  txList.forEach(tx => {
    if (tx.type === 'BUY') {
      const grossCost = cat === 'Mutual Funds' ? tx.amount : (tx.quantity * tx.price);
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
        currentQuantity = currentQuantity - sellQuantity;
        totalInvestedCost = currentQuantity * averageBuyPrice;
        if (currentQuantity === 0) averageBuyPrice = 0;
      }
    } else if (tx.type === 'SPLIT') {
      const ratioParts = (tx.ratio || '1:1').split(':');
      const oldRatio = parseFloat(ratioParts[0]) || 1;
      const newRatio = parseFloat(ratioParts[1]) || 1;
      if (oldRatio > 0 && newRatio > 0) {
        currentQuantity = currentQuantity * (newRatio / oldRatio);
        averageBuyPrice = averageBuyPrice * (oldRatio / newRatio);
        totalInvestedCost = currentQuantity * averageBuyPrice;
      }
    }
  });

  if (currentQuantity <= 0 && inv.quantity && inv.quantity > 0 && txList.length === 0) {
    currentQuantity = inv.quantity;
  }

  if (currentQuantity <= 0) {
    return {
      marketValue: 0,
      valuationSource: 'zero_quantity',
      isValued: true,
      effectiveQuantity: 0,
      effectivePrice: 0
    };
  }

  // 2. MUTUAL FUNDS
  if (cleanCat === 'mutual funds' || cleanCat === 'mutual fund' || cleanCat === 'mf') {
    const rawSym = inv.symbol?.trim().toUpperCase();
    const livePrice = (rawSym && marketPrices && marketPrices[rawSym] && marketPrices[rawSym].price > 0)
      ? marketPrices[rawSym].price
      : null;

    const validNav = (inv.nav && inv.nav > 0) ? inv.nav : undefined;
    const validBuyPrice = (inv.buyPrice && inv.buyPrice > 0) ? inv.buyPrice : undefined;

    let validCurrentPrice: number | undefined = undefined;
    if (inv.currentPrice && inv.currentPrice > 0) {
      const isTotalValueTypo = (
        (inv.investedAmount && Math.abs(inv.currentPrice - inv.investedAmount) < 1) ||
        (validBuyPrice && inv.currentPrice > validBuyPrice * 3)
      );
      if (!isTotalValueTypo) {
        validCurrentPrice = inv.currentPrice;
      }
    }

    const resolvedNav = livePrice ?? validNav ?? validCurrentPrice ?? null;
    const fallbackNav = resolvedNav ?? (validBuyPrice || (averageBuyPrice > 0 ? averageBuyPrice : (totalInvestedCost > 0 && currentQuantity > 0 ? totalInvestedCost / currentQuantity : null)));

    if (fallbackNav !== null && fallbackNav > 0) {
      const units = currentQuantity;
      return {
        marketValue: safeRound(units * fallbackNav),
        valuationSource: livePrice ? 'live_nav' : (validNav ? 'nav' : 'purchase_nav_fallback'),
        isValued: true,
        effectiveQuantity: units,
        effectivePrice: fallbackNav
      };
    }

    return {
      marketValue: null,
      valuationSource: 'unavailable',
      isValued: false,
      reason: 'No valid NAV available for Mutual Fund',
      effectiveQuantity: currentQuantity
    };
  }

  // 3. FIXED DEPOSITS
  if (cleanCat === 'fixed deposits' || cleanCat === 'fixed deposit' || cleanCat === 'fd') {
    const rate = inv.interestRate ?? 0;
    const start = inv.buyDate || inv.purchaseDate || '2026-01-01';
    const end = inv.maturityDate || start;
    const freq = inv.compoundingFrequency || 'Quarterly';
    const details = calculateFDDetails(totalInvestedCost || (inv.investedAmount ?? 0), rate, start, end, freq);
    return {
      marketValue: safeRound(details.accruedCurrentValue),
      valuationSource: 'fd_accrued_value',
      isValued: true,
      effectiveQuantity: 1,
      effectivePrice: details.accruedCurrentValue
    };
  }

  // 4. SAVINGS / CASH
  if (cleanCat === 'savings/cash' || cleanCat === 'savings' || cleanCat === 'cash') {
    const val = totalInvestedCost || (inv.investedAmount ?? currentQuantity);
    return {
      marketValue: safeRound(val),
      valuationSource: 'cash_balance',
      isValued: true,
      effectiveQuantity: val,
      effectivePrice: 1
    };
  }

  // 5. IPOs
  if (cleanCat === 'ipos' || cleanCat === 'ipo') {
    const status = inv.ipoAllotmentStatus || 'Applied';
    const isAllotted = status === 'Allotted' || status === 'Partially Allotted' || status === 'Listed' || status === 'Sold';
    if (!isAllotted) {
      return {
        marketValue: null,
        valuationSource: 'not_allocated',
        isValued: false,
        reason: 'IPO not allotted',
        effectiveQuantity: 0
      };
    }
    if (status === 'Sold') {
      return {
        marketValue: 0,
        valuationSource: 'ipo_sold',
        isValued: true,
        effectiveQuantity: 0
      };
    }
    const issuePrice = inv.ipoAllotmentPrice ?? inv.buyPrice ?? 0;
    const listPrice = inv.ipoListingPrice ?? issuePrice;
    const rawSym = inv.symbol?.trim().toUpperCase();
    const livePrice = (rawSym && marketPrices && marketPrices[rawSym] && marketPrices[rawSym].price > 0) ? marketPrices[rawSym].price : null;
    const finalPrice = status === 'Listed' ? (livePrice ?? listPrice) : listPrice;
    return {
      marketValue: safeRound(currentQuantity * finalPrice),
      valuationSource: livePrice ? 'live_market' : 'allotment_price',
      isValued: true,
      effectiveQuantity: currentQuantity,
      effectivePrice: finalPrice
    };
  }

  // 6. STOCKS & ETFs & OTHERS
  const rawSym = inv.symbol?.trim().toUpperCase();
  const nameResolved = inv.assetName ? resolveMarketSymbol(inv.assetName, cat as any).yahooSymbol : '';
  const yahooSym = rawSym ? resolveMarketSymbol(rawSym, cat as any).yahooSymbol : nameResolved;
  const cache = (rawSym && marketPrices && marketPrices[rawSym])
    || (yahooSym && marketPrices && marketPrices[yahooSym])
    || (nameResolved && marketPrices && marketPrices[nameResolved])
    || (rawSym && marketPrices && marketPrices[`${rawSym}.NS`])
    || (rawSym && marketPrices && marketPrices[`${rawSym}.BO`]);

  if (cache && cache.price > 0) {
    return {
      marketValue: safeRound(currentQuantity * cache.price),
      valuationSource: 'live_market',
      isValued: true,
      effectiveQuantity: currentQuantity,
      effectivePrice: cache.price
    };
  }

  if (inv.currentPrice !== undefined && inv.currentPrice !== null && inv.currentPrice > 0) {
    return {
      marketValue: safeRound(currentQuantity * inv.currentPrice),
      valuationSource: 'stored_price',
      isValued: true,
      effectiveQuantity: currentQuantity,
      effectivePrice: inv.currentPrice
    };
  }

  // Fallback to purchase price / cost basis as valid valuation baseline when live quotes are unavailable
  const fallbackPrice = (inv.buyPrice && inv.buyPrice > 0)
    ? inv.buyPrice
    : (averageBuyPrice > 0 ? averageBuyPrice : (totalInvestedCost > 0 && currentQuantity > 0 ? totalInvestedCost / currentQuantity : 0));

  if (fallbackPrice > 0) {
    return {
      marketValue: safeRound(currentQuantity * fallbackPrice),
      valuationSource: 'purchase_price_fallback',
      isValued: true,
      effectiveQuantity: currentQuantity,
      effectivePrice: fallbackPrice
    };
  }

  return {
    marketValue: null,
    valuationSource: 'unavailable',
    isValued: false,
    reason: 'Live market price and purchase price unavailable',
    effectiveQuantity: currentQuantity
  };
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
    let manualInvested = 0;
    const buyTxs = allTxs.filter(tx => tx.type === 'BUY');

    if (inv.investedAmount !== undefined && inv.investedAmount !== null && inv.investedAmount > 0 && buyTxs.length <= 1) {
      const parsed = typeof inv.investedAmount === 'number' ? inv.investedAmount : parseFloat(inv.investedAmount as any);
      if (!isNaN(parsed) && isFinite(parsed)) {
        manualInvested = parsed;
      }
    } else if (buyTxs.length > 0) {
      manualInvested = buyTxs.reduce((sum, tx) => {
        const cost = getEffectiveTransactionCost(tx, inv);
        return sum + cost;
      }, 0);
    } else if (inv.investedAmount !== undefined && inv.investedAmount !== null && inv.investedAmount > 0) {
      const parsed = typeof inv.investedAmount === 'number' ? inv.investedAmount : parseFloat(inv.investedAmount as any);
      if (!isNaN(parsed) && isFinite(parsed)) {
        manualInvested = parsed;
      }
    }

    const goldResult = getGoldHoldingValue(inv, marketPrices);
    const qty = goldResult.weightGrams ?? 0;
    const curPrice = goldResult.pricePerGram ?? inv.currentPricePerGram ?? null;
    const calculatedCurrent = goldResult.marketValue ?? undefined;
    const isValuationUnavailable = !goldResult.isValued || calculatedCurrent === undefined;

    return {
      ...inv,
      quantity: qty,
      buyPrice: inv.buyPricePerGram ?? inv.buyPrice ?? 0,
      currentPrice: curPrice !== null ? safeRound(curPrice) : null,
      investedAmount: safeRound(manualInvested),
      currentValue: calculatedCurrent,
      profitLoss: undefined,
      returnPercent: undefined,
      realizedPL: 0,
      totalPL: 0,
      priceStatus: goldResult.isValued ? 'cached' : 'unavailable',
      priceSource: goldResult.valuationSource,
      isValuationUnavailable,
      priceUnavailableReason: goldResult.reason
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
    } else if (tx.type === 'SPLIT') {
      const ratioParts = (tx.ratio || '1:1').split(':');
      const oldRatio = parseFloat(ratioParts[0]) || 1;
      const newRatio = parseFloat(ratioParts[1]) || 1;
      if (oldRatio > 0 && newRatio > 0) {
        currentQuantity = currentQuantity * (newRatio / oldRatio);
        averageBuyPrice = averageBuyPrice * (oldRatio / newRatio);
        totalInvestedCost = currentQuantity * averageBuyPrice;
      }
    }
  });

  const explicitBuyTxs = allTxs.filter(tx => tx.investmentId === inv.id && tx.type === 'BUY' && !tx.id.startsWith('fallback-tx'));
  if (currentQuantity > 0 && totalInvestedCost === 0 && explicitBuyTxs.length === 0 && inv.investedAmount !== undefined && inv.investedAmount !== null && inv.investedAmount > 0) {
    const parsed = typeof inv.investedAmount === 'number' ? inv.investedAmount : parseFloat(inv.investedAmount as any);
    if (!isNaN(parsed) && isFinite(parsed)) {
      totalInvestedCost = parsed;
      if (currentQuantity > 0) {
        averageBuyPrice = totalInvestedCost / currentQuantity;
      }
    }
  }

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
        totalInvestedCost = 0;
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
  let priceUnavailableReason: string | undefined = undefined;

  const isIPO = category === 'IPOs';
  const ipoStatus = inv.ipoAllotmentStatus || 'Applied';
  const isIPOAllotted = isIPO && (ipoStatus === 'Allotted' || ipoStatus === 'Partially Allotted' || ipoStatus === 'Listed' || ipoStatus === 'Sold');

  if (category === 'Stocks' || category === 'ETFs' || (isIPO && ipoStatus === 'Listed')) {
    const rawSym = inv.symbol?.trim().toUpperCase();
    const yahooSym = rawSym ? resolveMarketSymbol(rawSym, category as any).yahooSymbol : '';
    const cache = (rawSym && marketPrices && marketPrices[rawSym])
      || (yahooSym && marketPrices && marketPrices[yahooSym])
      || (rawSym && marketPrices && marketPrices[`${rawSym}.NS`])
      || (rawSym && marketPrices && marketPrices[`${rawSym}.BO`]);

    if (cache && cache.price > 0) {
      curPrice = cache.price;
      priceTimestamp = cache.timestamp;
      priceSource = cache.source || 'Yahoo Finance API';
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
      // No live quote in marketPrices map: resolve using stored manual price or purchase price fallback
      if (isIPO) {
        curPrice = inv.ipoListingPrice ?? inv.ipoAllotmentPrice ?? inv.buyPrice ?? 0;
        if (curPrice > 0) {
          priceStatus = 'cached';
          priceSource = 'IPO Listing Price';
        } else {
          priceStatus = 'unavailable';
          isValuationUnavailable = true;
        }
      } else {
        if (inv.currentPrice !== undefined && inv.currentPrice !== null && inv.currentPrice > 0 && inv.currentPrice !== inv.buyPrice) {
          curPrice = inv.currentPrice;
          priceStatus = 'unavailable';
          priceSource = 'Manual Price';
        } else if (inv.currentValue !== undefined && inv.currentValue !== null && inv.currentValue > 0 && currentQuantity > 0 && inv.currentValue !== (currentQuantity * inv.buyPrice)) {
          curPrice = currentQuantity > 0 ? inv.currentValue / currentQuantity : 0;
          priceStatus = 'unavailable';
          priceSource = 'Manual Value';
        } else {
          priceStatus = 'unavailable';
          isValuationUnavailable = true;
          if (!inv.symbol) {
            priceUnavailableReason = 'No symbol provided';
          } else {
            priceUnavailableReason = 'Live market price unavailable';
          }
        }
      }
    }
  } else if (isIPO) {
    if (!isIPOAllotted) {
      curPrice = undefined;
      priceStatus = 'not_allocated';
      isValuationUnavailable = true;
      priceUnavailableReason = 'IPO not yet listed';
    } else {
      curPrice = inv.ipoAllotmentPrice ?? inv.buyPrice ?? 0;
      priceStatus = 'cached';
      priceSource = 'Allotment Price';
    }
  } else {
    // Non-Stock/ETF/IPO assets (Mutual Funds, Crypto, Gold, Silver, Bonds, FDs, etc.)
    const rawSym = inv.symbol?.trim().toUpperCase();
    if (category === 'Fixed Deposits' || category === 'Savings/Cash') {
      priceStatus = 'cached';
      priceSource = category === 'Fixed Deposits' ? 'Accrued Interest' : 'Cash Balance';
      curPrice = category === 'Savings/Cash' ? 1 : undefined;
    } else if (category === 'Mutual Funds') {
      const livePrice = rawSym && marketPrices && marketPrices[rawSym]?.price;
      const validNav = inv.nav && inv.nav > 0 ? inv.nav : undefined;
      const validBuyPrice = inv.buyPrice && inv.buyPrice > 0 ? inv.buyPrice : undefined;

      let validCurrentPrice: number | undefined = undefined;
      if (inv.currentPrice && inv.currentPrice > 0) {
        if (!validBuyPrice || inv.currentPrice <= validBuyPrice * 3) {
          validCurrentPrice = inv.currentPrice;
        }
      }

      curPrice = livePrice || validNav || validCurrentPrice || validBuyPrice || null;
      if (curPrice === null || curPrice <= 0) {
        priceStatus = 'unavailable';
        isValuationUnavailable = true;
        curPrice = undefined;
      } else {
        priceStatus = 'cached';
        priceSource = 'NAV / Purchase Price';
      }
    } else if (category === 'Gold' || category === 'Silver') {
      curPrice = (rawSym && marketPrices[rawSym]?.price)
        ? marketPrices[rawSym].price
        : (inv.currentPricePerGram ?? inv.currentPrice ?? inv.buyPrice ?? null);
      if (curPrice === null || curPrice <= 0) {
        priceStatus = 'unavailable';
        isValuationUnavailable = true;
        curPrice = undefined;
      } else {
        priceStatus = 'cached';
        priceSource = 'Commodity Stored Price';
      }
    } else {
      curPrice = (rawSym && marketPrices[rawSym]?.price)
        ? marketPrices[rawSym].price
        : (inv.currentPrice ?? inv.buyPrice ?? null);
      if (curPrice === null || curPrice <= 0) {
        priceStatus = 'unavailable';
        isValuationUnavailable = true;
        curPrice = undefined;
      } else {
        priceStatus = 'cached';
        priceSource = 'Stored / Purchase Price';
      }
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
    priceUnavailableReason,
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
  let activeHoldingsCount = 0;
  let unavailablePriceCount = 0;
  let unpricedCapital = 0;
  let pricedCapital = 0;

  const missingAssets: HoldingMetrics[] = [];
  const pricedAssets: HoldingMetrics[] = [];

  calculatedHoldings.forEach(h => {
    // Exclude unallotted IPOs
    if (h.category === 'IPOs') {
      const status = h.ipoAllotmentStatus || 'Applied';
      const isAllotted = status === 'Allotted' || status === 'Partially Allotted' || status === 'Listed' || status === 'Sold';
      if (!isAllotted) return;
    }
    if (h.quantity <= 0) return;

    activeHoldingsCount++;
    totalInvested += h.investedAmount;
    totalRealized += h.realizedPL;

    if (h.currentValue !== undefined && h.currentValue !== null) {
      totalCurrent += h.currentValue;
      pricedCapital += h.investedAmount;
      pricedAssets.push(h);
    } else {
      unavailablePriceCount++;
      unpricedCapital += h.investedAmount;
      missingAssets.push(h);
    }
  });

  totalInvested = safeRound(totalInvested);
  totalCurrent = safeRound(totalCurrent);
  totalRealized = safeRound(totalRealized);
  unpricedCapital = safeRound(unpricedCapital);
  pricedCapital = safeRound(pricedCapital);

  const valuationStatus: 'complete' | 'partial' | 'unavailable' = 'complete';

  const unrealizedPL = safeRound(totalCurrent - pricedCapital);
  const totalPL = safeRound(totalRealized + unrealizedPL);
  const returnPercentage = pricedCapital > 0 ? safeRound((unrealizedPL / pricedCapital) * 100) : 0;
  const overallReturnPercentage = totalInvested > 0 ? safeRound((totalPL / totalInvested) * 100) : 0;

  return {
    valuationStatus,
    totalActiveAssets: activeHoldingsCount,
    pricedAssetsCount: pricedAssets.length,
    missingPriceAssetsCount: unavailablePriceCount,
    totalInvested,
    totalCurrent,
    pricedMarketValue: totalCurrent,
    unpricedInvestedCapital: unpricedCapital,
    unrealizedPL,
    realizedPL: totalRealized,
    totalPL,
    returnPercentage,
    overallReturnPercentage,
    activeHoldingsCount,
    unavailablePriceCount,
    hasUnavailablePrices: unavailablePriceCount > 0,
    missingAssets,
    pricedAssets
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
    const actual = calculateMonthlyInvested(transactions, calculatedHoldings, year, index);
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

/** Helper to check if an investment is a demo record (accounting for missing isDemo: true leak) */
export const isDemoInvestment = (inv: Investment): boolean => {
  return !!(inv.isDemo || (inv.id && /^[1-8]$/.test(inv.id)));
};

/** Helper to check if a transaction is a demo record */
export const isDemoTransaction = (tx: Transaction, investments: Investment[]): boolean => {
  if (tx.isDemo) return true;
  if (tx.investmentId && /^[1-8]$/.test(tx.investmentId)) return true;
  const parent = investments.find(inv => inv.id === tx.investmentId);
  return parent ? isDemoInvestment(parent) : false;
};

/** Helper to extract transaction cost based on security type (amount-based vs quantity-based) */
export const getTransactionCost = (tx: Transaction, category: string): number => {
  const catClean = (category || '').trim().toLowerCase();
  const isAmountBased =
    catClean === 'mutual funds' ||
    catClean === 'fixed deposits' ||
    catClean === 'savings/cash' ||
    isCommodityCategory(catClean);

  if (isAmountBased && typeof tx.amount === 'number' && tx.amount > 0) {
    return tx.amount;
  }
  return tx.quantity * tx.price;
};

/** Helper to extract dynamic, normalized transaction cost resolving heuristics for Mutual Funds/commodities */
export const getEffectiveTransactionCost = (tx: Transaction, inv: Investment): number => {
  const category = inv.category || inv.assetType || 'Stocks';
  if (category === 'Mutual Funds') {
    return getMutualFundTransactionMetrics(tx, inv).amount;
  }
  const isCommodity = isCommodityCategory(category);
  if (isCommodity) {
    if (typeof tx.price === 'number' && tx.price > 0) {
      return tx.price;
    }
    if (typeof tx.amount === 'number' && tx.amount > 0) {
      return tx.amount;
    }
    return 0;
  }
  return tx.amount ?? (tx.quantity * tx.price);
};

/**
 * Calculates the total active capital invested by the user across active holdings.
 * Excludes sold holdings (quantity = 0 or status = 'SOLD') and demo investments.
 */
export const calculateTotalInvested = (
  investments: Investment[],
  transactions: Transaction[],
  marketPrices: Record<string, any> = {}
): number => {
  const consolidated = getConsolidatedHoldings(investments, transactions, marketPrices);
  let total = 0;

  consolidated.forEach(h => {
    if (!h.isDemo && isHoldingActive(h)) {
      total += (h.investedAmount || 0);
    }
  });

  return safeRound(total);
};

/**
 * Returns a map of platform → active invested capital, using the same rules as calculateTotalInvested.
 * Guarantees: sum(result.values()) === calculateTotalInvested(investments, transactions)
 */
export const calculateTotalInvestedByPlatform = (
  investments: Investment[],
  transactions: Transaction[],
  marketPrices: Record<string, any> = {}
): Record<string, number> => {
  const consolidated = getConsolidatedHoldings(investments, transactions, marketPrices);
  const platformMap: Record<string, number> = {};

  consolidated.forEach(h => {
    if (!h.isDemo && isHoldingActive(h)) {
      const broker = h.broker || 'Other';
      platformMap[broker] = (platformMap[broker] || 0) + (h.investedAmount || 0);
    }
  });

  const roundedPlatformMap: Record<string, number> = {};
  Object.entries(platformMap).forEach(([broker, amount]) => {
    roundedPlatformMap[broker] = safeRound(amount);
  });

  return roundedPlatformMap;
};

/** Calculate monthly invested amount */
export const calculateMonthlyInvested = (
  transactions: Transaction[],
  investments: Investment[],
  year: number,
  monthIndex: number
): number => {
  const realInvs = investments.filter(inv => !isDemoInvestment(inv));
  const realTxs = transactions.filter(tx => !isDemoTransaction(tx, investments));

  let total = 0;

  realInvs.forEach(inv => {
    const parentTxs = realTxs.filter(tx => tx.investmentId === inv.id);
    const buyTxs = parentTxs.filter(tx => tx.type === 'BUY');
    const category = inv.category || inv.assetType || 'Stocks';

    if (buyTxs.length > 0) {
      buyTxs.forEach(tx => {
        const txDate = new Date(tx.date);
        if (isNaN(txDate.getTime())) return;
        if (txDate.getFullYear() === year && txDate.getMonth() === monthIndex) {
          if (category === 'IPOs') {
            const status = inv.ipoAllotmentStatus || inv.allotmentStatus || 'Applied';
            const isAllotted = ['Allotted', 'Partially Allotted', 'Listed', 'Sold'].includes(status);
            if (!isAllotted) return;
          }

          // Commodities: tx.price = rupee amount paid per purchase (consistent with calculateTotalInvested)
          const cost = isCommodityCategory(category)
            ? (tx.price ?? 0)
            : getEffectiveTransactionCost(tx, inv);
          total += cost + (tx.charges ?? 0);
        }
      });
    } else {
      // Legacy investment with no BUY transactions
      const buyDateStr = inv.buyDate || inv.purchaseDate || '2026-01-01';
      const buyDate = new Date(buyDateStr);
      if (!isNaN(buyDate.getTime()) && buyDate.getFullYear() === year && buyDate.getMonth() === monthIndex) {
        if (category === 'IPOs') {
          const status = inv.ipoAllotmentStatus || inv.allotmentStatus || 'Applied';
          const isAllotted = ['Allotted', 'Partially Allotted', 'Listed', 'Sold'].includes(status);
          if (isAllotted) {
            const allottedQty = inv.ipoQuantityAllotted ?? inv.quantity ?? 0;
            const issuePrice = inv.ipoAllotmentPrice ?? inv.buyPrice ?? 0;
            total += allottedQty * issuePrice + (inv.charges ?? 0);
          }
        } else if (inv.investedAmount !== undefined && inv.investedAmount !== null && inv.investedAmount > 0) {
          total += inv.investedAmount;
        } else {
          const qty = inv.quantity ?? 1;
          const price = inv.buyPrice ?? inv.currentPrice ?? 0;
          total += qty * price + (inv.charges ?? 0);
        }
      }
    }
  });

  return safeRound(total);
};

/** Calculates active investments representing current holdings */
export const calculateActiveInvestments = (
  investments: Investment[],
  transactions: Transaction[]
): number => {
  const realInvs = investments.filter(inv => !isDemoInvestment(inv));
  const realTxs = transactions.filter(tx => !isDemoTransaction(tx, investments));
  
  let activeCount = 0;
  realInvs.forEach(inv => {
    const parentTxs = realTxs.filter(tx => tx.investmentId === inv.id);
    const metrics = calculateHoldingMetrics(inv, parentTxs, {});
    
    // Exclude unallotted IPOs
    if (inv.category === 'IPOs' || inv.assetType === 'IPOs') {
      const status = inv.ipoAllotmentStatus || 'Applied';
      const isAllotted = ['Allotted', 'Partially Allotted', 'Listed', 'Sold'].includes(status);
      if (!isAllotted || status === 'Sold') return;
    }
    
    if (metrics.quantity > 0) {
      activeCount++;
    }
  });
  return activeCount;
};

/** Calculates cost basis (totalInvestedCost) for a single holding */
export const calculateCostBasis = (
  inv: Investment,
  transactions: Transaction[]
): number => {
  const metrics = calculateHoldingMetrics(inv, transactions, {});
  return metrics.investedAmount;
};

/** Calculates average buy price for a single holding */
export const calculateAverageBuyPrice = (
  inv: Investment,
  transactions: Transaction[]
): number => {
  const metrics = calculateHoldingMetrics(inv, transactions, {});
  return metrics.buyPrice;
};

/** Calculates realized profit or loss for a single holding */
export const calculateRealizedProfitLoss = (
  inv: Investment,
  transactions: Transaction[]
): number => {
  const metrics = calculateHoldingMetrics(inv, transactions, {});
  return metrics.realizedPL;
};

/** Calculates current value for a single holding based on market price */
export const calculateCurrentValue = (
  inv: Investment,
  transactions: Transaction[],
  marketPrices: Record<string, MarketPriceData> = {}
): number | undefined => {
  const metrics = calculateHoldingMetrics(inv, transactions, marketPrices);
  return metrics.currentValue ?? undefined;
};


