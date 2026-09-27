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
  // GMR Airports
  'GMR': 'GMRAIRPORT.NS',
  'GMR.NS': 'GMRAIRPORT.NS',
  'GMRINFRA': 'GMRAIRPORT.NS',
  'GMRINFRA.NS': 'GMRAIRPORT.NS',
  'GMRAIRPORT': 'GMRAIRPORT.NS',
  'GMRAIRPORT.NS': 'GMRAIRPORT.NS',
  'GMR AIRPORTS': 'GMRAIRPORT.NS',
  'GMR AIRPORTS INFRASTRUCTURE': 'GMRAIRPORT.NS',

  // Cupid
  'CUPID': 'CUPID.NS',
  'CUPID.NS': 'CUPID.NS',
  'CUPID LTD': 'CUPID.NS',
  'CUPID LIMITED': 'CUPID.NS',

  // Reliance
  'RELIANCE': 'RELIANCE.NS',
  'RELIANCE.NS': 'RELIANCE.NS',
  'RELIANCE INDUSTRIES': 'RELIANCE.NS',
  'RELIANCE INDUSTRIES LTD': 'RELIANCE.NS',
  'RELIANCE INDUSTRIES LIMITED': 'RELIANCE.NS',

  // BSE
  'BSE': 'BSE.NS',
  'BSE.NS': 'BSE.NS',
  'BSE LTD': 'BSE.NS',
  'BSE LIMITED': 'BSE.NS',

  // Bank of Maharashtra
  'MAHABANK': 'MAHABANK.NS',
  'MAHABANK.NS': 'MAHABANK.NS',
  'MAHA BANK': 'MAHABANK.NS',
  'BANK OF MAHARASHTRA': 'MAHABANK.NS',

  // Spice Islands
  'SPICEISL': '539295.BO',
  'SPICE ISLANDS': '539295.BO',
  'SPICE ISLANDS INDUSTRIES': '539295.BO',
  'SPICE ISLANDS INDUSTRIES LTD': '539295.BO',

  // Rotographics
  'ROTOGRAPH': '539216.BO',
  'ROTOGRAPHICS': '539216.BO',
  'ROTOGRAPHICS INDIA': '539216.BO',
  'ROTOGRAPHICS INDIA LTD': '539216.BO',

  // Gaudium
  'GAUDIUM': 'GAUDIUM.NS',
  'GAUDIUM.NS': 'GAUDIUM.NS',
  'GAUDIUM IVF': 'GAUDIUM.NS',

  // ETFs
  'GOLDBEES': 'GOLDBEES.NS',
  'GOLDBEES.NS': 'GOLDBEES.NS',
  'NIPPON GOLD ETF': 'GOLDBEES.NS',
  'NIPPON INDIA ETF GOLD BEES': 'GOLDBEES.NS',

  'SILVERBEES': 'SILVERBEES.NS',
  'SILVERBEES.NS': 'SILVERBEES.NS',
  'NIPPON SILVER ETF': 'SILVERBEES.NS',
  'NIPPON INDIA ETF SILVER BEES': 'SILVERBEES.NS',

  'NIFTYBEES': 'NIFTYBEES.NS',
  'NIFTYBEES.NS': 'NIFTYBEES.NS',
  'NIPPON NIFTY 50 ETF': 'NIFTYBEES.NS',
  'NIPPON INDIA ETF NIFTY 50 BEES': 'NIFTYBEES.NS',
  'NIFTY 50 ETF': 'NIFTYBEES.NS',

  'DSPGOLD': 'DSPGOLD.NS',
  'DSP GOLD ETF': 'DSPGOLD.NS',

  'DSPSILVER': 'DSPSILVER.NS',
  'DSP SILVER ETF': 'DSPSILVER.NS',

  'TATAGOLD': 'TATAGOLD.NS',
  'TATA GOLD ETF': 'TATAGOLD.NS',

  'TATASILVER': 'TATASILVER.NS',
  'TATA SILVER ETF': 'TATASILVER.NS'
};

/**
 * Resolves raw user-entered symbols or asset names into valid Yahoo Finance ticker codes
 * based on exchange rules and preset mappings.
 */
export const resolveMarketSymbol = (symbol: string | undefined | null, category: AssetType): ResolvedSymbol => {
  const rawSymbol = symbol ? symbol.trim() : '';
  let cleanSymbol = rawSymbol.toUpperCase();
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
  const mapped = SYMBOL_MAPPINGS[cleanSymbol];
  if (mapped) {
    return {
      symbol: rawSymbol,
      exchange: mapped.endsWith('.BO') ? 'BSE' : 'NSE',
      yahooSymbol: mapped,
      assetType,
      resolved: true
    };
  }

  // Sanitize spaces or special characters if full asset name was passed
  if (cleanSymbol.includes(' ')) {
    const firstWord = cleanSymbol.split(' ')[0];
    const wordMapped = SYMBOL_MAPPINGS[firstWord];
    if (wordMapped) {
      return {
        symbol: rawSymbol,
        exchange: wordMapped.endsWith('.BO') ? 'BSE' : 'NSE',
        yahooSymbol: wordMapped,
        assetType,
        resolved: true
      };
    }
    cleanSymbol = firstWord;
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
