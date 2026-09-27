import { resolveMarketSymbol } from './marketSymbolService';
import type { AssetType } from '../types';

export interface HistoricalPricePoint {
  date: string; // 'YYYY-MM-DD'
  close: number;
}

// Map structure: yahooSymbol -> Map<dateStr, closingPrice>
type HistoricalPriceCache = Record<string, Record<string, number>>;

const CACHE_STORAGE_KEY = 'fridaytrack_historical_prices_cache_v1';
const memoryCache: HistoricalPriceCache = loadCacheFromStorage();

function loadCacheFromStorage(): HistoricalPriceCache {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(CACHE_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (e) {
    console.warn('Failed to load historical price cache from localStorage:', e);
  }
  return {};
}

function saveCacheToStorage() {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(memoryCache));
    }
  } catch (e) {
    console.warn('Failed to save historical price cache to localStorage:', e);
  }
}

/**
 * Converts epoch timestamp (seconds or milliseconds) to YYYY-MM-DD in local/IST time
 */
export const timestampToDateStr = (timestamp: number): string => {
  const date = new Date(timestamp * (timestamp < 10000000000 ? 1000 : 1));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Fetches historical daily prices from Yahoo Finance API for a given symbol and date range.
 */
export const fetchHistoricalPricesForSymbol = async (
  rawSymbol: string,
  category: AssetType,
  startDateStr: string,
  endDateStr: string
): Promise<Record<string, number>> => {
  const resolved = resolveMarketSymbol(rawSymbol, category);
  if (!resolved.resolved || !resolved.yahooSymbol) {
    return {};
  }

  const yahooSymbol = resolved.yahooSymbol;

  // Initialize symbol cache if missing
  if (!memoryCache[yahooSymbol]) {
    memoryCache[yahooSymbol] = {};
  }

  const startSec = Math.floor(new Date(startDateStr).getTime() / 1000) - 86400 * 5; // 5 extra buffer days
  const endSec = Math.floor(new Date(endDateStr).getTime() / 1000) + 86400;

  const urlProxy = `/api/market/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&period1=${startSec}&period2=${endSec}`;
  const fallbackUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&period1=${startSec}&period2=${endSec}`)}`;

  const endpoints = [urlProxy, fallbackUrl];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(endpoint, {
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const rawJson = await response.json();
      const data = endpoint.includes('allorigins') ? JSON.parse(rawJson.contents) : rawJson;

      const resultObj = data?.chart?.result?.[0];
      if (!resultObj) continue;

      const timestamps: number[] = resultObj.timestamp || [];
      const quoteObj = resultObj.indicators?.quote?.[0] || {};
      const adjCloseObj = resultObj.indicators?.adjclose?.[0] || {};

      const closes: (number | null)[] = quoteObj.close || adjCloseObj.adjclose || [];

      for (let i = 0; i < timestamps.length; i++) {
        const ts = timestamps[i];
        const price = closes[i];

        if (price !== null && price !== undefined && !isNaN(price) && isFinite(price) && price > 0) {
          const dateKey = timestampToDateStr(ts);
          memoryCache[yahooSymbol][dateKey] = Math.round(price * 100) / 100;
        }
      }

      saveCacheToStorage();
      return memoryCache[yahooSymbol];
    } catch (err) {
      console.warn(`Historical price fetch failed for ${yahooSymbol} via ${endpoint}:`, err);
    }
  }

  return memoryCache[yahooSymbol] || {};
};

/**
 * Batch fetches historical daily price series for a list of holdings.
 */
export const batchFetchHistoricalPrices = async (
  holdingsList: { symbol?: string; category: AssetType }[],
  startDateStr: string,
  endDateStr: string
): Promise<HistoricalPriceCache> => {
  const eligible = holdingsList.filter(h => h.symbol && h.symbol.trim().length > 0);
  if (eligible.length === 0) return memoryCache;

  const promises = eligible.map(h =>
    fetchHistoricalPricesForSymbol(h.symbol!, h.category, startDateStr, endDateStr)
  );

  await Promise.allSettled(promises);
  return memoryCache;
};

/**
 * Retrieves the historical price for a symbol on a specific date string (YYYY-MM-DD).
 * If date is a weekend/holiday, looks back up to 10 days for the most recent valid closing price.
 */
export const getHistoricalPriceForSymbol = (
  rawSymbol: string | undefined,
  category: AssetType,
  dateStr: string
): number | null => {
  if (!rawSymbol) return null;
  const resolved = resolveMarketSymbol(rawSymbol, category);
  if (!resolved.resolved || !resolved.yahooSymbol) return null;

  const yahooSymbol = resolved.yahooSymbol;
  const symbolPrices = memoryCache[yahooSymbol];
  if (!symbolPrices) return null;

  // Direct lookup
  if (symbolPrices[dateStr] !== undefined) {
    return symbolPrices[dateStr];
  }

  // Look back up to 10 days for weekends/holidays
  const curr = new Date(dateStr);
  for (let i = 1; i <= 10; i++) {
    curr.setDate(curr.getDate() - 1);
    const prevKey = curr.toISOString().split('T')[0];
    if (symbolPrices[prevKey] !== undefined) {
      return symbolPrices[prevKey];
    }
  }

  return null;
};

/**
 * HistoricalPriceProvider interface abstraction for clean dependency injection and future replacement.
 */
export class HistoricalPriceProvider {
  static async getHistoricalPrices(
    holdings: { symbol?: string; category: AssetType }[],
    startDate: string,
    endDate: string
  ): Promise<HistoricalPriceCache> {
    return batchFetchHistoricalPrices(holdings, startDate, endDate);
  }

  static getPriceOnDate(rawSymbol: string | undefined, category: AssetType, dateStr: string): number | null {
    return getHistoricalPriceForSymbol(rawSymbol, category, dateStr);
  }
}
