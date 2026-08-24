import type { AssetType } from '../types';

export interface ResolvedSymbol {
  symbol: string;         // Raw symbol entered by user (e.g., "GMRAIRPORT.NS", "GMR", "500325")
  exchange: 'NSE' | 'BSE' | 'UNSUPPORTED';
  yahooSymbol: string;    // Correct Yahoo Finance ticker (e.g., "GMRINFRA.NS", "500325.BO")
  assetType: 'Stocks' | 'ETFs' | 'IPOs' | 'OTHER';
  resolved: boolean;
}

// Predefined known symbol renames or corrections
const SYMBOL_MAPPINGS: Record<string, string> = {
  'GMR': 'GMRAIRPORT.NS',
  'GMR.NS': 'GMRAIRPORT.NS',
  'GMRINFRA': 'GMRAIRPORT.NS',
  'GMRINFRA.NS': 'GMRAIRPORT.NS',
  'GMRAIRPORT': 'GMRAIRPORT.NS',
  'GMRAIRPORT.NS': 'GMRAIRPORT.NS'
};

/**
 * Resolves raw user-entered symbols into valid Yahoo Finance ticker codes
 * based on exchange rules and preset mappings.
 */
export const resolveMarketSymbol = (symbol: string | undefined | null, category: AssetType): ResolvedSymbol => {
  const rawSymbol = symbol ? symbol.trim() : '';
  const cleanSymbol = rawSymbol.toUpperCase();
  const isIPO = category === 'IPOs';
  const assetType = (category === 'Stocks' || category === 'ETFs' || isIPO) ? category : 'OTHER';

  if (!rawSymbol || assetType === 'OTHER') {
    return {
      symbol: rawSymbol,
      exchange: 'UNSUPPORTED',
      yahooSymbol: '',
      assetType,
      resolved: false
    };
  }

  // 1. Check preset mappings dictionary first
  if (SYMBOL_MAPPINGS[cleanSymbol]) {
    return {
      symbol: rawSymbol,
      exchange: 'NSE',
      yahooSymbol: SYMBOL_MAPPINGS[cleanSymbol],
      assetType,
      resolved: true
    };
  }

  // 2. Already contains a valid exchange suffix
  if (cleanSymbol.endsWith('.NS')) {
    return {
      symbol: rawSymbol,
      exchange: 'NSE',
      yahooSymbol: cleanSymbol,
      assetType,
      resolved: true
    };
  }

  if (cleanSymbol.endsWith('.BO')) {
    return {
      symbol: rawSymbol,
      exchange: 'BSE',
      yahooSymbol: cleanSymbol,
      assetType,
      resolved: true
    };
  }

  // 3. BSE numerical code detection (e.g., 500325)
  if (/^\d+$/.test(cleanSymbol)) {
    return {
      symbol: rawSymbol,
      exchange: 'BSE',
      yahooSymbol: `${cleanSymbol}.BO`,
      assetType,
      resolved: true
    };
  }

  // 4. Default alphabetic code maps to NSE
  return {
    symbol: rawSymbol,
    exchange: 'NSE',
    yahooSymbol: `${cleanSymbol}.NS`,
    assetType,
    resolved: true
  };
};
