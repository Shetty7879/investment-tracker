import type { Investment, Transaction } from '../types';

/**
 * Calculates profit or loss.
 */
export const calculateProfitLoss = (invested: number, current: number): number => {
  return current - invested;
};

/**
 * Calculates return percentage with safe check for division by zero.
 */
export const calculateReturnPercentage = (invested: number, current: number): number => {
  if (invested <= 0) return 0;
  const pl = calculateProfitLoss(invested, current);
  return (pl / invested) * 100;
};

/**
 * Computes allocation percentage with division by zero safety.
 */
export const calculateAllocationPercentage = (value: number, total: number): number => {
  if (total <= 0) return 0;
  return (value / total) * 100;
};

/**
 * Calculates Fixed Deposit compound maturity details and pro-rated accrued value.
 */
export const calculateFDDetails = (
  principal: number,
  annualRate: number,
  startDateStr: string,
  maturityDateStr: string,
  compoundingFrequency: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly'
) => {
  const P = principal;
  const r = annualRate / 100;
  const start = new Date(startDateStr);
  const maturity = new Date(maturityDateStr);
  const today = new Date();

  // Diff in days
  const totalDays = Math.max(1, Math.round((maturity.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const elapsedDays = Math.max(0, Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, Math.round((maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const t = totalDays / 365;

  let n = 4; // default quarterly
  if (compoundingFrequency === 'Monthly') n = 12;
  else if (compoundingFrequency === 'Quarterly') n = 4;
  else if (compoundingFrequency === 'Half-Yearly') n = 2;
  else if (compoundingFrequency === 'Yearly') n = 1;

  // Compounded Maturity formula: A = P * (1 + r/n)^(n*t)
  const maturityValue = P * Math.pow(1 + r / n, n * t);
  const estimatedInterest = maturityValue - P;

  // Prorated Accrued Interest
  const accruedRatio = Math.min(1, elapsedDays / totalDays);
  const accruedCurrentValue = P + estimatedInterest * accruedRatio;

  return {
    maturityValue: Math.round(maturityValue * 100) / 100,
    estimatedInterest: Math.round(estimatedInterest * 100) / 100,
    totalDays,
    daysRemaining,
    accruedCurrentValue: Math.round(accruedCurrentValue * 100) / 100,
  };
};

/**
 * Heuristics helper to resolve Mutual Fund units, NAV, and investedAmount
 * distinguishing whether buyPrice was stored as investment amount or actual NAV.
 */
export const getMutualFundMetrics = (inv: {
  quantity: number;
  buyPrice: number;
  units?: number;
  nav?: number;
  investedAmount?: number;
}) => {
  const units = inv.units ?? inv.quantity ?? 0;

  // Heuristic to check if buyPrice was stored as investment amount
  const isFractional = units % 1 !== 0;
  const isBuyPriceRound = inv.buyPrice >= 50 && inv.buyPrice % 50 === 0;
  const product = units * inv.buyPrice;
  const isProductNotRound = product % 50 !== 0;
  const isOldBuyPriceActuallyInvestmentAmount = isFractional && isBuyPriceRound && isProductNotRound;

  let investedAmount = 0;
  let nav = 0;

  if (inv.investedAmount !== undefined && inv.investedAmount !== null && inv.investedAmount > 0) {
    investedAmount = inv.investedAmount;
    nav = inv.nav ?? (units > 0 ? investedAmount / units : 0);
  } else if (isOldBuyPriceActuallyInvestmentAmount) {
    investedAmount = inv.buyPrice;
    nav = units > 0 ? investedAmount / units : 0;
  } else {
    nav = inv.nav ?? inv.buyPrice ?? 0;
    investedAmount = units * nav;
  }

  return {
    units,
    nav,
    investedAmount
  };
};

/**
 * Heuristics helper for Mutual Fund transactions
 */
export const getMutualFundTransactionMetrics = (
  tx: { quantity?: number; price?: number; amount?: number },
  parentInv?: { assetType?: string; category?: string }
) => {
  const isMF = parentInv?.assetType === 'Mutual Funds' || parentInv?.category === 'Mutual Funds';
  const qty = tx.quantity ?? 1;
  const price = tx.price ?? 0;

  if (!isMF) {
    return { quantity: qty, price, amount: qty * price };
  }

  // Heuristic to check if transaction price was stored as investment amount
  const isFractional = qty % 1 !== 0;
  const isPriceRound = price >= 50 && price % 50 === 0;
  const product = qty * price;
  const isProductNotRound = product % 50 !== 0;
  const isOldPriceActuallyInvestmentAmount = isFractional && isPriceRound && isProductNotRound;

  let amount = tx.amount ?? (qty * price);
  let nav = price;

  if (isOldPriceActuallyInvestmentAmount) {
    amount = price;
    nav = qty > 0 ? price / qty : 0;
  }

  return {
    quantity: qty,
    price: nav, // Store resolved NAV as price
    amount
  };
};

/**
 * Calculates raw invested, current value, profitLoss, and return percent dynamically
 * based on the transaction log history of the holding.
 */
export const calculateInvestmentMetrics = (
  inv: Investment
): {
  investedAmount: number;
  currentValue: number;
  profitLoss: number;     // Unrealized profit/loss
  returnPercent: number;    // Unrealized return %
  realizedPL: number;      // Realized profit/loss from sales
  totalPL: number;         // Total P/L (Realized + Unrealized)
  totalQuantity: number;   // Remaining quantity
  averageBuyPrice: number; // Average buy price of remaining holdings
} => {
  const type = inv.assetType || inv.category || '';
  const isCommodity = type === 'Gold' || type === 'Silver' || type === 'Platinum' ||
                      type === 'Digital Gold' || type === 'Digital Silver' || type === 'Digital Platinum';
  if (isCommodity) {
    return {
      investedAmount: inv.investedAmount ?? 0,
      currentValue: inv.currentValue ?? 0,
      profitLoss: undefined as any,
      returnPercent: undefined as any,
      realizedPL: 0,
      totalPL: 0,
      totalQuantity: inv.weightGrams ?? inv.quantity ?? 0,
      averageBuyPrice: inv.buyPricePerGram ?? inv.buyPrice ?? 0
    };
  }

  // 1. Gather transactions array. Auto-generate fallback BUY transaction if empty
  let txList: Transaction[] = [];
  if (inv.transactions && inv.transactions.length > 0) {
    txList = inv.transactions.map((tx, idx) => {
      const metrics = getMutualFundTransactionMetrics(tx, inv);
      return {
        id: tx.id || `fallback-tx-${inv.id}-${idx}`,
        investmentId: inv.id,
        type: tx.type || 'BUY',
        quantity: metrics.quantity,
        price: metrics.price,
        amount: metrics.amount,
        charges: tx.charges ?? 0,
        date: tx.date || inv.buyDate || inv.purchaseDate || '2026-01-01',
        isDemo: !!inv.isDemo,
        createdAt: tx.createdAt || new Date().toISOString()
      };
    });
  } else {
    let qty = 1;
    let price = 0;
    if (inv.assetType === 'Stocks' || inv.assetType === 'ETFs') {
      qty = inv.quantity ?? 1;
      price = inv.buyPrice ?? 0;
    } else if (inv.assetType === 'Mutual Funds') {
      const mf = getMutualFundMetrics(inv);
      qty = mf.units;
      price = mf.nav;
    } else if (inv.assetType === 'Fixed Deposits' || inv.assetType === 'Savings/Cash' || inv.assetType === 'IPOs') {
      qty = 1;
      price = inv.investedAmount ?? 0;
    } else if (inv.assetType === 'Gold' || inv.assetType === 'Silver' || inv.assetType === 'Platinum') {
      qty = inv.weightGrams ?? 1;
      price = inv.buyPricePerGram ?? 0;
    }
    txList = [
      {
        id: 'fallback-tx',
        investmentId: inv.id,
        type: 'BUY',
        quantity: qty,
        price: price,
        amount: inv.assetType === 'Mutual Funds' ? getMutualFundMetrics(inv).investedAmount : (qty * price),
        charges: inv.charges ?? 0,
        date: inv.buyDate || inv.purchaseDate || '2026-01-01',
        isDemo: !!inv.isDemo,
        createdAt: new Date().toISOString()
      }
    ];
  }

  // Sort transactions chronologically by date
  txList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let currentQuantity = 0;
  let averageBuyPrice = 0;
  let totalInvested = 0;
  let realizedPL = 0;

  // Process transaction logs
  txList.forEach(tx => {
    if (tx.type === 'BUY') {
      const cost = inv.assetType === 'Mutual Funds' ? tx.amount : (tx.quantity * tx.price);
      const nextQuantity = currentQuantity + tx.quantity;
      if (nextQuantity > 0) {
        averageBuyPrice = ((currentQuantity * averageBuyPrice) + cost) / nextQuantity;
      }
      currentQuantity = nextQuantity;
      totalInvested = currentQuantity * averageBuyPrice;
    } else if (tx.type === 'SELL') {
      const sellQuantity = Math.min(tx.quantity, currentQuantity);
      if (sellQuantity > 0) {
        const realizedProfit = sellQuantity * (tx.price - averageBuyPrice);
        realizedPL += realizedProfit;
        currentQuantity = currentQuantity - sellQuantity;
        totalInvested = currentQuantity * averageBuyPrice;
        if (currentQuantity === 0) {
          averageBuyPrice = 0;
        }
      }
    } else if (tx.type === 'SPLIT') {
      const ratioParts = (tx.ratio || '1:1').split(':');
      const oldRatio = parseFloat(ratioParts[0]) || 1;
      const newRatio = parseFloat(ratioParts[1]) || 1;
      if (oldRatio > 0 && newRatio > 0) {
        currentQuantity = currentQuantity * (newRatio / oldRatio);
        averageBuyPrice = averageBuyPrice * (oldRatio / newRatio);
        totalInvested = currentQuantity * averageBuyPrice;
      }
    }
  });

  let currentValue = 0;

  // Calculate currentValue based on asset types and currentPrice updates
  switch (inv.assetType) {
    case 'Stocks':
    case 'ETFs': {
      const curPrice = inv.currentPrice ?? averageBuyPrice;
      currentValue = currentQuantity * curPrice;
      break;
    }
    case 'Mutual Funds': {
      const curNAV = inv.nav ?? averageBuyPrice;
      currentValue = currentQuantity * curNAV;
      break;
    }
    case 'Gold':
    case 'Silver':
    case 'Platinum': {
      const curPrice = inv.currentPricePerGram ?? averageBuyPrice;
      currentValue = currentQuantity * curPrice;
      break;
    }
    case 'Fixed Deposits': {
      const rate = inv.interestRate ?? 0;
      const start = inv.purchaseDate;
      const end = inv.maturityDate || start;
      const freq = inv.compoundingFrequency || 'Quarterly';

      const details = calculateFDDetails(totalInvested, rate, start, end, freq);
      currentValue = details.accruedCurrentValue;
      break;
    }
    case 'Savings/Cash': {
      // Savings account matches cash balance where price is 1
      currentValue = currentQuantity;
      break;
    }
    case 'IPOs': {
      const status = inv.ipoAllotmentStatus || 'Applied';
      const appliedAmt = totalInvested;

      if (
        status === 'Applied' ||
        status === 'Payment Pending' ||
        status === 'Allocation Pending'
      ) {
        currentValue = appliedAmt;
      } else if (status === 'Not Allotted') {
        currentValue = 0;
        totalInvested = 0;
      } else if (status === 'Allotted' || status === 'Listed') {
        const listPrice = inv.ipoListingPrice ?? inv.ipoAllotmentPrice ?? 0;
        currentValue = currentQuantity * listPrice;
      } else if (status === 'Sold') {
        // Sold IPO cash returns are in realized profit/loss
        currentValue = 0;
      }
      break;
    }
    default: {
      currentValue = currentQuantity * averageBuyPrice;
    }
  }

  // Double decimal rounding
  totalInvested = Math.round(totalInvested * 100) / 100;
  currentValue = Math.round(currentValue * 100) / 100;
  realizedPL = Math.round(realizedPL * 100) / 100;

  const unrealizedPL = Math.round((currentValue - totalInvested) * 100) / 100;
  const returnPercent = totalInvested > 0 ? Math.round((unrealizedPL / totalInvested) * 100 * 100) / 100 : 0;
  const totalPL = Math.round((realizedPL + unrealizedPL) * 100) / 100;

  return {
    investedAmount: totalInvested,
    currentValue: currentValue,
    profitLoss: unrealizedPL,
    returnPercent: returnPercent,
    realizedPL: realizedPL,
    totalPL: totalPL,
    totalQuantity: currentQuantity,
    averageBuyPrice: Math.round(averageBuyPrice * 100) / 100
  };
};

/**
 * Computes portfolio totals and aggregates weights from a list of investments.
 */
export const calculatePortfolioTotal = (
  investments: Investment[]
): {
  totalInvested: number;
  totalCurrent: number;
  profitLoss: number; // Unrealized profit/loss
  realizedPL: number; // Realized profit/loss
  totalPL: number;    // Total P/L (Realized + Unrealized)
  returnPercentage: number;
} => {
  let totalInvested = 0;
  let totalCurrent = 0;
  let totalRealized = 0;

  investments.forEach((inv) => {
    const metrics = calculateInvestmentMetrics(inv);
    totalInvested += metrics.investedAmount;
    totalCurrent += metrics.currentValue;
    totalRealized += metrics.realizedPL;
  });

  totalInvested = Math.round(totalInvested * 100) / 100;
  totalCurrent = Math.round(totalCurrent * 100) / 100;
  totalRealized = Math.round(totalRealized * 100) / 100;

  const unrealizedPL = Math.round((totalCurrent - totalInvested) * 100) / 100;
  const totalPL = Math.round((totalRealized + unrealizedPL) * 100) / 100;
  const returnPercentage = totalInvested > 0 ? Math.round((unrealizedPL / totalInvested) * 100 * 100) / 100 : 0;

  return {
    totalInvested,
    totalCurrent,
    profitLoss: unrealizedPL,
    realizedPL: totalRealized,
    totalPL: totalPL,
    returnPercentage
  };
};

/**
 * Calculates the age of an investment from its buy date to the current date.
 */
export const getInvestmentAge = (dateStr: string | undefined): string => {
  if (!dateStr) return '—';
  
  const parts = dateStr.split('-');
  const buyYear = parseInt(parts[0], 10);
  const buyMonth = parseInt(parts[1], 10) - 1; // 0-indexed month
  const buyDay = parseInt(parts[2], 10);
  
  const buyMidnight = new Date(buyYear, buyMonth, buyDay);
  const now = new Date();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = nowMidnight.getTime() - buyMidnight.getTime();
  if (diffTime < 0) {
    return '0 days';
  }
  if (diffTime === 0) {
    return 'Today';
  }

  // Helpers to add years and months without rollover issues
  const addYears = (d: Date, years: number): Date => {
    const res = new Date(d.getTime());
    res.setFullYear(res.getFullYear() + years);
    if (d.getMonth() === 1 && d.getDate() === 29 && res.getMonth() !== 1) {
      res.setDate(0); // Pin to Feb 28 on non-leap years
    }
    return res;
  };

  const addMonths = (d: Date, months: number): Date => {
    const res = new Date(d.getTime());
    const expectedMonth = (res.getMonth() + months) % 12;
    res.setMonth(res.getMonth() + months);
    if (res.getMonth() !== expectedMonth) {
      res.setDate(0); // Pin to last day of expected month if rollover occurs
    }
    return res;
  };

  // Find difference components
  let years = nowMidnight.getFullYear() - buyMidnight.getFullYear();
  let testDate = addYears(buyMidnight, years);
  if (testDate > nowMidnight) {
    years--;
    testDate = addYears(buyMidnight, years);
  }

  let months = 0;
  while (true) {
    const nextTestDate = addMonths(testDate, 1);
    if (nextTestDate > nowMidnight) {
      break;
    }
    testDate = nextTestDate;
    months++;
  }

  const timeDiff = nowMidnight.getTime() - testDate.getTime();
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

  const partsFormatted: string[] = [];
  if (years > 0) {
    partsFormatted.push(`${years} year${years !== 1 ? 's' : ''}`);
  }
  if (months > 0) {
    partsFormatted.push(`${months} month${months !== 1 ? 's' : ''}`);
  }
  if (days > 0) {
    partsFormatted.push(`${days} day${days !== 1 ? 's' : ''}`);
  }

  if (partsFormatted.length === 0) {
    return 'Today';
  }
  return partsFormatted.join(' ');
};
