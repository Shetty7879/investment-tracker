import type { Investment, Transaction, Dividend, DividendStatus } from '../types';
import { DividendProvider } from './dividendProvider';
import type { CorporateDividendEvent } from '../types/dividend';
import { storage } from '../utils/localStorage';

const DISCOVERED_DIVIDENDS_CACHE_KEY = 'fridaytrack_verified_dividends_cache_v2';

/**
 * Creates a unique deterministic event key for a corporate dividend action
 */
export const createDividendEventKey = (
  isinOrSymbol: string,
  recordOrExDate: string,
  dividendPerShare: number,
  platform?: string
): string => {
  const cleanAsset = (isinOrSymbol || '').trim().toUpperCase();
  const cleanDate = (recordOrExDate || '').trim();
  const cleanPerShare = (dividendPerShare || 0).toFixed(2);
  const cleanPlatform = (platform || '').trim().toUpperCase();
  return `${cleanAsset}_${cleanDate}_${cleanPerShare}${cleanPlatform ? `_${cleanPlatform}` : ''}`;
};

/**
 * Calculates exact eligible quantity for a holding at a specific dividend record/ex date based on transaction history.
 *
 * Rules:
 * - Sum BUY transactions executed on or before exDate / recordDate.
 * - Subtract SELL transactions executed BEFORE exDate / recordDate.
 * - Shares sold AFTER recordDate remain fully ELIGIBLE for that dividend!
 */
export const calculateEligibleQuantityFromTransactions = (
  holding: Investment,
  transactions: Transaction[],
  exDate: string,
  recordDate: string
): number => {
  const targetDate = recordDate || exDate;
  if (!targetDate) return holding.quantity || 0;

  // Filter transactions for this holding (match by investmentId or assetName/symbol)
  const holdingTxs = (transactions || []).filter(tx => {
    if (tx.investmentId && tx.investmentId === holding.id) return true;
    const txSymbol = ((tx as any).symbol || (tx as any).assetSymbol || '').trim().toUpperCase();
    const holdingSymbol = (holding.symbol || '').trim().toUpperCase();
    if (txSymbol && holdingSymbol && txSymbol === holdingSymbol) return true;
    return false;
  });

  if (holdingTxs.length === 0) {
    // If no granular transaction log exists, fallback to purchaseDate check
    const purchaseDate = holding.buyDate || holding.purchaseDate || '2020-01-01';
    if (purchaseDate <= targetDate) {
      return holding.quantity || 0;
    }
    return 0;
  }

  let eligibleQty = 0;
  for (const tx of holdingTxs) {
    const txDate = tx.date || (tx as any).purchaseDate || '2020-01-01';
    // Only count transactions prior to or on the record/ex eligibility cutoff date
    if (txDate <= targetDate) {
      const qty = tx.quantity || 0;
      const type = (tx.type || 'BUY').toUpperCase();
      if (type === 'BUY' || type === 'REINVEST') {
        eligibleQty += qty;
      } else if (type === 'SELL') {
        eligibleQty = Math.max(0, eligibleQty - qty);
      }
    }
  }

  return eligibleQty;
};

/**
 * Determines exact status based on event dates, current date, and user eligibility.
 */
export const determineDividendStatus = (
  event: CorporateDividendEvent,
  eligibleQty: number
): DividendStatus => {
  const today = new Date().toISOString().split('T')[0];

  if (eligibleQty <= 0) {
    return 'NOT_ELIGIBLE';
  }

  if (event.status === 'CANCELLED') {
    return 'CANCELLED';
  }

  // Future record or payment date
  if (event.paymentDate > today || event.recordDate > today) {
    return 'UPCOMING';
  }

  // Past record/payment date with eligible shares
  return 'RECEIVED';
};

/**
 * Main automatic corporate action dividend discovery and deduplication engine.
 */
export const discoverDividendsForHoldings = async (
  holdings: Investment[],
  transactions: Transaction[] = [],
  existingDividends: Dividend[] = []
): Promise<{
  updatedDividends: Dividend[];
  newCount: number;
  updatedCount: number;
  statusMessage: string;
}> => {
  if (!holdings || holdings.length === 0) {
    return {
      updatedDividends: existingDividends,
      newCount: 0,
      updatedCount: 0,
      statusMessage: 'No holdings found to check for dividends.',
    };
  }

  // Purge any legacy fake/demo test Reliance dividends (e.g. ₹10 or 2026-09-16 test dates)
  const cleanedExisting = existingDividends.filter(d => {
    if (d.isDemo) return false;
    const isFakeRel = (d.symbol === 'RELIANCE' || d.assetName === 'Reliance Industries') &&
      (d.dividendPerShare === 10 || d.dividend_per_share === 10 || d.recordDate === '2026-09-16' || d.record_date === '2026-09-16');
    const isFakeId = d.id?.startsWith('corp_rel_') || d.id === 'div-1' || d.id === 'div-2';
    return !isFakeRel && !isFakeId;
  });

  const resultMap = new Map<string, Dividend>();
  // Seed map with cleaned existing dividends using eventKey or id
  cleanedExisting.forEach(d => {
    const key = d.eventKey || `${(d.symbol || d.assetName || '').toUpperCase()}_${d.recordDate || d.dividendDate}_${d.dividendPerShare}_${(d.platform || d.broker || '').toUpperCase()}`;
    resultMap.set(key, d);
  });

  let newCount = 0;
  let updatedCount = 0;

  // Filter stock/ETF/MF holdings
  const eligibleHoldings = holdings.filter(h => {
    const cat = (h.category || h.assetType || '').toLowerCase();
    return (
      cat.includes('stock') ||
      cat.includes('etf') ||
      cat.includes('mutual') ||
      cat.includes('ipo')
    );
  });

  for (const holding of eligibleHoldings) {
    const symbol = (holding.symbol || '').trim().toUpperCase();
    const isin = (holding.isin || '').trim().toUpperCase();
    const platform = holding.broker || (holding as any).platform || 'Dhan';

    // Fetch verified corporate action events from provider
    let events: CorporateDividendEvent[] = [];
    if (isin) {
      events = await DividendProvider.getDividendEventsByISIN(isin);
    }
    if (events.length === 0 && symbol) {
      events = await DividendProvider.getDividendEvents(symbol);
    }

    for (const event of events) {
      const eligibleQty = calculateEligibleQuantityFromTransactions(
        holding,
        transactions,
        event.exDate,
        event.recordDate
      );

      const status = determineDividendStatus(event, eligibleQty);
      const perShare = event.dividendPerShare;
      const grossAmount = Math.round(eligibleQty * perShare * 100) / 100;
      // Indian TDS rule: 10% TDS if gross > ₹5,000
      const tdsAmount = grossAmount > 5000 ? Math.round(grossAmount * 0.1 * 100) / 100 : 0;
      const netAmount = Math.max(0, Math.round((grossAmount - tdsAmount) * 100) / 100);

      const eventKey = createDividendEventKey(
        isin || symbol,
        event.recordDate || event.exDate,
        perShare,
        platform
      );

      const existingRecord = resultMap.get(eventKey);

      if (!existingRecord) {
        // Create new verified dividend record
        const newDividend: Dividend = {
          id: `div_${holding.id}_${event.eventId}_${platform.toLowerCase()}`,
          investmentId: holding.id,
          asset_id: holding.id,
          assetName: holding.assetName,
          asset_name: holding.assetName,
          symbol: holding.symbol || event.symbol,
          isin: holding.isin || event.isin,
          exchange: holding.exchange || event.exchange || 'NSE',
          broker: platform,
          platform: platform,
          eligibleQuantity: eligibleQty,
          quantity: eligibleQty,
          dividendPerShare: perShare,
          dividend_per_share: perShare,
          grossDividend: grossAmount,
          gross_amount: grossAmount,
          tax: tdsAmount,
          tds_amount: tdsAmount,
          netDividend: netAmount,
          net_amount: netAmount,
          dividendDate: event.exDate,
          ex_date: event.exDate,
          recordDate: event.recordDate,
          record_date: event.recordDate,
          declarationDate: event.declarationDate || event.announcementDate,
          declaration_date: event.declarationDate || event.announcementDate,
          paymentDate: event.paymentDate,
          payment_date: event.paymentDate,
          status: status,
          source: event.source,
          source_url: event.sourceUrl,
          verified: event.verified,
          eventKey: eventKey,
          notes: event.notes,
          isDemo: false,
          createdAt: new Date().toISOString(),
        };

        resultMap.set(eventKey, newDividend);
        newCount++;
      } else {
        // Update existing record if details changed
        const updatedRecord: Dividend = {
          ...existingRecord,
          eligibleQuantity: eligibleQty,
          quantity: eligibleQty,
          grossDividend: grossAmount,
          gross_amount: grossAmount,
          tax: tdsAmount,
          tds_amount: tdsAmount,
          netDividend: netAmount,
          net_amount: netAmount,
          status: status,
          source: event.source || existingRecord.source,
          verified: event.verified ?? existingRecord.verified,
          updatedAt: new Date().toISOString(),
        };
        resultMap.set(eventKey, updatedRecord);
        updatedCount++;
      }
    }
  }

  const finalDividends = Array.from(resultMap.values());
  storage.set(DISCOVERED_DIVIDENDS_CACHE_KEY, finalDividends);

  return {
    updatedDividends: finalDividends,
    newCount,
    updatedCount,
    statusMessage:
      newCount > 0
        ? `Successfully synced ${newCount} new verified corporate dividend action(s).`
        : 'Dividend records are up to date with verified corporate filings.',
  };
};
