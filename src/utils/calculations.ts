
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
  const parentBuyPrice = (parentInv as any)?.buyPrice ?? (parentInv as any)?.nav ?? 0;
  const isOldPriceActuallyInvestmentAmount =
    parentBuyPrice > 0 &&
    Math.abs(price - parentBuyPrice) > 0.01 &&
    isFractional &&
    isPriceRound &&
    isProductNotRound;

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
