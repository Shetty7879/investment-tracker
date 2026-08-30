import type { AssetType } from '../types';
import { resolveMarketSymbol } from './marketSymbolService';

export interface MarketPriceData {
  price: number;
  timestamp: number;
  source: string;
  marketState: 'open' | 'closed';
  status: 'live' | 'cached' | 'unavailable' | 'not_allocated';
  change?: number;
  changePercent?: number;
  currency?: string;
  exchange?: string;
}

let rateLimitCooldownUntil = 0;
let authErrorCooldownUntil = 0;

/**
 * Batch fetches quote prices from Yahoo Finance.
 * Tries local Vite proxy endpoint first, and falls back to a public CORS proxy.
 */
export const fetchMarketPrices = async (
  holdingsList: { symbol: string; category: AssetType }[]
): Promise<Record<string, MarketPriceData>> => {
  // Rate-limit check
  if (Date.now() < rateLimitCooldownUntil) {
    console.warn("fetchMarketPrices call skipped due to active HTTP 429 rate limit cooldown.");
    return {};
  }
  // Auth-error cooldown check (401/403)
  if (Date.now() < authErrorCooldownUntil) {
    return {}; // Silent skip — already logged the 401 error
  }

  // Filter out invalid/empty symbols
  const eligible = holdingsList.filter(h => h.symbol && h.symbol.trim().length > 0);
  if (eligible.length === 0) return {};

  // Build unique mapping (rawSymbol -> resolved yahooSymbol)
  const symbolMap = new Map<string, string>();
  eligible.forEach(h => {
    const resolvedInfo = resolveMarketSymbol(h.symbol, h.category);
    if (resolvedInfo.resolved) {
      symbolMap.set(h.symbol.trim(), resolvedInfo.yahooSymbol);
    }
  });

  const yahooSymbols = Array.from(new Set(symbolMap.values()));
  if (yahooSymbols.length === 0) return {};

  const symbolsQuery = yahooSymbols.join(',');
  const result: Record<string, MarketPriceData> = {};

  try {
    let data: any = null;
    const fetchUrls = [
      `/api/market/v7/finance/quote?symbols=${symbolsQuery}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsQuery}`)}`
    ];

    let success = false;
    let rateLimitHit = false;
    let authOrForbiddenError = false;

    for (const url of fetchUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.status === 429) {
          rateLimitHit = true;
          console.warn(`HTTP 429 Rate Limited on: ${url}`);
          continue;
        }

        if (response.status === 401 || response.status === 403) {
          authOrForbiddenError = true;
          console.warn(`HTTP ${response.status} Auth/Forbidden on: ${url}`);
          continue;
        }

        if (!response.ok) {
          console.warn(`HTTP ${response.status} Error on: ${url}`);
          continue;
        }

        const json = await response.json();
        if (url.includes('allorigins')) {
          data = JSON.parse(json.contents);
        } else {
          data = json;
        }

        if (data?.quoteResponse?.result) {
          success = true;
          break;
        }
      } catch (e: any) {
        console.warn(`Market fetch failed for URL: ${url}`, e);
      }
    }

    if (rateLimitHit) {
      rateLimitCooldownUntil = Date.now() + 60 * 1000; // Cooldown for 1 minute
      throw new Error("Price retrieval failed due to rate limits (HTTP 429). Throttling enabled.");
    }

    if (authOrForbiddenError) {
      authErrorCooldownUntil = Date.now() + 10 * 60 * 1000; // 10-min cooldown on 401/403
      console.warn('fetchMarketPrices: 401/403 received. Pausing market price fetching for 10 minutes.');
      throw new Error("Price retrieval failed due to authentication/forbidden errors (HTTP 401/403).");
    }

    if (!success || !data?.quoteResponse?.result) {
      throw new Error("Price retrieval failed across all endpoints.");
    }

    const quotes = data.quoteResponse.result as any[];

    // Map fetched quotes back to rawSymbols
    for (const [rawSymbol, yahooSymbol] of symbolMap.entries()) {
      const quote = quotes.find(q => q.symbol === yahooSymbol);
      if (quote && typeof quote.regularMarketPrice === 'number') {
        const price = quote.regularMarketPrice;

        // Quote validation
        if (
          isFinite(price) &&
          !isNaN(price) &&
          price > 0 &&
          quote.symbol === yahooSymbol
        ) {
          const isOpen = quote.marketState === 'REGULAR';
          result[rawSymbol.toUpperCase()] = {
            price,
            timestamp: (quote.regularMarketTime || Math.floor(Date.now() / 1000)) * 1000,
            source: 'Yahoo Finance API',
            marketState: isOpen ? 'open' : 'closed',
            status: 'live',
            change: typeof quote.regularMarketChange === 'number' ? quote.regularMarketChange : undefined,
            changePercent: typeof quote.regularMarketChangePercent === 'number' ? quote.regularMarketChangePercent : undefined,
            currency: quote.currency || 'INR',
            exchange: quote.fullExchangeName || 'NSE'
          };
        }
      }
    }
  } catch (error) {
    console.error("fetchMarketPrices error:", error);
  }

  return result;
};
