import { buildLogoCacheKey, getCachedLogo, cacheLogo, isLogoFailed } from './logoCache';

export interface ResolveLogoParams {
  name?: string;
  assetName?: string;
  symbol?: string;
  isin?: string;
  exchange?: string;
  assetType?: string;
  category?: string;
  logoUrl?: string;
  logo_url?: string;
}

export type LogoSourceType = 'database' | 'isin' | 'ticker' | 'domain' | 'fallback';

export interface LogoResolutionResult {
  url: string | null;
  candidateUrls: string[];
  source: LogoSourceType;
}

// Logo resolution CDN providers
export const googleFavicon = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
const cryptoLogo = (symbol: string) =>
  `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${symbol.toLowerCase()}.png`;

// Logo.dev helper (Uses client-side publishable token from env)
export const logoDevByDomain = (domain: string, token?: string): string | null => {
  const activeToken = token || import.meta.env.VITE_LOGO_DEV_TOKEN || 'pk_demo_key';
  if (!activeToken || activeToken === 'YOUR_PUBLISHABLE_KEY') {
    return null;
  }
  return `https://img.logo.dev/${domain}?token=${activeToken}`;
};

export const logoDevByTicker = (ticker: string, token?: string): string | null => {
  const activeToken = token || import.meta.env.VITE_LOGO_DEV_TOKEN || 'pk_demo_key';
  if (!activeToken || activeToken === 'YOUR_PUBLISHABLE_KEY') {
    return null;
  }
  const cleanTicker = ticker.trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
  return `https://img.logo.dev/ticker/${cleanTicker}?token=${activeToken}`;
};

// ==========================================
// 1. ISIN MAP (Indian & Global Securities)
// ==========================================
const ISIN_LOGO_MAP: Record<string, { domain: string; symbol?: string }> = {
  'INE002A01018': { domain: 'ril.com', symbol: 'RELIANCE' },          // Reliance Industries
  'INE467B01029': { domain: 'tcs.com', symbol: 'TCS' },               // TCS
  'INE009A01021': { domain: 'infosys.com', symbol: 'INFY' },           // Infosys
  'INE040A01034': { domain: 'hdfcbank.com', symbol: 'HDFCBANK' },      // HDFC Bank
  'INE090A01021': { domain: 'icicibank.com', symbol: 'ICICIBANK' },    // ICICI Bank
  'INE062A01020': { domain: 'sbi.co.in', symbol: 'SBIN' },             // SBI
  'INE397D01024': { domain: 'bhartiartl.com', symbol: 'BHARTIARTL' },   // Bharti Airtel
  'INE154A01025': { domain: 'itcportal.com', symbol: 'ITC' },          // ITC
  'INE155A01022': { domain: 'tatamotors.com', symbol: 'TATAMOTORS' },  // Tata Motors
  'INE081A01012': { domain: 'tatasteel.com', symbol: 'TATASTEEL' },   // Tata Steel
  'INE238A01034': { domain: 'axisbank.com', symbol: 'AXISBANK' },     // Axis Bank
  'INE237A01028': { domain: 'kotak.com', symbol: 'KOTAKBANK' },        // Kotak Bank
  'INE018A01030': { domain: 'larsentoubro.com', symbol: 'LT' },        // L&T
  'INE075A01022': { domain: 'wipro.com', symbol: 'WIPRO' },           // Wipro
  'INE860A01027': { domain: 'hcltech.com', symbol: 'HCLTECH' },         // HCL Tech
  'INE021A01026': { domain: 'asianpaints.com', symbol: 'ASIANPAINT' }, // Asian Paints
  'INE585B01010': { domain: 'marutisuzuki.com', symbol: 'MARUTI' },    // Maruti Suzuki
  'INE044A01036': { domain: 'sunpharma.com', symbol: 'SUNPHARMA' },   // Sun Pharma
  'INE280A01028': { domain: 'titancompany.in', symbol: 'TITAN' },     // Titan
  'INE296A01024': { domain: 'bajajfinserv.in', symbol: 'BAJFINANCE' }, // Bajaj Finance
  'INE036A01016': { domain: 'nbccindia.com', symbol: 'NBCC' },         // NBCC (India) Ltd
  'INE183A01024': { domain: 'swastika.co.in', symbol: 'SWASTIKA' },    // Swastika Investmart
  'INE184A01022': { domain: 'irb.co.in', symbol: 'IRB' },             // IRB Infrastructure
  'INVI00000001': { domain: 'irbinvit.co.in', symbol: 'IRBINVIT' },   // IRB InvIT Fund
  'INE522F01014': { domain: 'www.coalindia.in', symbol: 'COALINDIA' }, // Coal India
  'INE457A01014': { domain: 'bankofmaharashtra.in', symbol: 'MAHABANK' }, // Bank of Maharashtra
};

// ==========================================
// 2. TICKER / SYMBOL MAP (NSE/BSE & Global)
// ==========================================
const SYMBOL_DOMAIN_MAP: Record<string, string> = {
  // Exchanges
  'NSE': 'nseindia.com',
  'BSE': 'bseindia.com',
  'MCX': 'mcxindia.com',

  // Top Indian Stocks & Listed Securities
  'RELIANCE': 'ril.com',
  'TCS': 'tcs.com',
  'INFY': 'infosys.com',
  'INFOSYS': 'infosys.com',
  'HDFCBANK': 'hdfcbank.com',
  'ICICIBANK': 'icicibank.com',
  'SBIN': 'sbi.co.in',
  'BHARTIARTL': 'bhartiartl.com',
  'ITC': 'itcportal.com',
  'TATAMOTORS': 'tatamotors.com',
  'TATASTEEL': 'tatasteel.com',
  'LTIM': 'ltimindtree.com',
  'WIPRO': 'wipro.com',
  'HCLTECH': 'hcltech.com',
  'ASIANPAINT': 'asianpaints.com',
  'MARUTI': 'marutisuzuki.com',
  'SUNPHARMA': 'sunpharma.com',
  'TITAN': 'titancompany.in',
  'BAJFINANCE': 'bajajfinserv.in',
  'BAJAJFINSV': 'bajajfinserv.in',
  'KOTAKBANK': 'kotak.com',
  'LT': 'larsentoubro.com',
  'AXISBANK': 'axisbank.com',
  'NTPC': 'ntpc.co.in',
  'ONGC': 'ongcindia.com',
  'POWERGRID': 'powergrid.in',
  'COALINDIA': 'www.coalindia.in',
  'MAHABANK': 'bankofmaharashtra.in',
  'ADANIENT': 'adanienterprises.com',
  'ADANIPORTS': 'adaniports.com',
  'ULTRACEMCO': 'ultratechcement.com',
  'JSWSTEEL': 'jsw.in',
  'HAL': 'hal-india.co.in',
  'BEL': 'bel-india.in',
  'M&M': 'mahindra.com',
  'MAHINDRA': 'mahindra.com',
  'ZOMATO': 'zomato.com',
  'SWIGGY': 'swiggy.com',
  'PAYTM': 'paytm.com',
  'NYKAA': 'nykaa.com',
  'POLICYBZR': 'policybazaar.com',
  'DMART': 'dmartindia.com',
  'AVANTIFEED': 'avantifeeds.com',
  'GMRAIRPORT': 'gmrgroup.in',
  'GMRINFRA': 'gmrgroup.in',
  'GMR': 'gmrgroup.in',

  // Screenshot & User Holding Assets
  'NBCC': 'nbccindia.com',
  'NBDC': 'nbccindia.com',
  'SWASTIKA': 'swastika.co.in',
  'VEEGALAND': 'veegaland.com',
  'IRB': 'irbinvit.co.in',
  'IRBINVIT': 'irbinvit.co.in',
  'SPICEISL': 'spiceislands.com',
  'SILVERETF': 'dspim.com',
  'DSP': 'dspim.com',
  'DEEPA': 'deepajewellers.in',

  // ETFs
  'NIFTYBEES': 'nipponindiamf.com',
  'GOLDBEES': 'nipponindiamf.com',
  'SILVERBEES': 'nipponindiamf.com',
  'TATAGOLD': 'tatamutualfund.com',
  'TATASILV': 'tatamutualfund.com',
  'MON100': 'motilaloswalmf.com',
  'BANKBEES': 'nipponindiamf.com',
  'ITBEES': 'nipponindiamf.com',
  'JUNIORBEES': 'nipponindiamf.com',

  // Sovereign Gold Bonds & Commodities
  'SGB': 'rbi.org.in',

  // Global / US Stocks
  'AAPL': 'apple.com',
  'MSFT': 'microsoft.com',
  'GOOGL': 'google.com',
  'GOOG': 'google.com',
  'AMZN': 'amazon.com',
  'TSLA': 'tesla.com',
  'NVDA': 'nvidia.com',
  'META': 'meta.com',
  'NFLX': 'netflix.com',
};

// ==========================================
// 3. SECURITY PATTERN DICTIONARY
// ==========================================
export interface SecurityMetadata {
  symbol?: string;
  isin?: string;
  domain?: string;
  exchange?: string;
}

const KNOWN_SECURITIES_DICTIONARY: { pattern: RegExp; security: SecurityMetadata }[] = [
  { pattern: /milky\s*mist/i, security: { domain: 'milkymist.com' } },
  { pattern: /^nse\b|national stock exchange/i, security: { symbol: 'NSE', domain: 'nseindia.com', exchange: 'NSE' } },
  { pattern: /^bse\b|bombay stock exchange/i, security: { symbol: 'BSE', domain: 'bseindia.com', exchange: 'BSE' } },
  { pattern: /coal\s*india/i, security: { symbol: 'COALINDIA', isin: 'INE522F01014', domain: 'coalindia.in' } },
  { pattern: /nbcc|nbdc/i, security: { symbol: 'NBCC', isin: 'INE036A01016', domain: 'nbccindia.com' } },
  { pattern: /mahabank|bank of maharashtra|maha bank/i, security: { symbol: 'MAHABANK', isin: 'INE457A01014', domain: 'bankofmaharashtra.in' } },
  { pattern: /swastika/i, security: { symbol: 'SWASTIKA', isin: 'INE183A01024', domain: 'swastika.co.in' } },
  { pattern: /veegaland/i, security: { domain: 'veegaland.com' } },
  { pattern: /irb\s*invit|irb\s*invit\s*fund|irb/i, security: { symbol: 'IRBINVIT', isin: 'INVI00000001', domain: 'irbinvit.co.in' } },
  { pattern: /spice\s*islands/i, security: { symbol: 'SPICEISL', domain: 'spiceislands.in' } },
  { pattern: /dsp\s*silver|dsp\s*silver\s*etf|dsp/i, security: { symbol: 'SILVERETF', domain: 'dspim.com' } },
  { pattern: /deepa\s*jeweller/i, security: { domain: 'deepajewellers.com' } },
  { pattern: /reliance/i, security: { symbol: 'RELIANCE', isin: 'INE002A01018', domain: 'ril.com' } },
  { pattern: /tata\s*consultancy|tcs/i, security: { symbol: 'TCS', isin: 'INE467B01029', domain: 'tcs.com' } },
  { pattern: /infosys|infy/i, security: { symbol: 'INFY', isin: 'INE009A01021', domain: 'infosys.com' } },
  { pattern: /hdfc\s*bank/i, security: { symbol: 'HDFCBANK', isin: 'INE040A01034', domain: 'hdfcbank.com' } },
  { pattern: /icici\s*bank/i, security: { symbol: 'ICICIBANK', isin: 'INE090A01021', domain: 'icicibank.com' } },
  { pattern: /^sbin\b|state bank of india/i, security: { symbol: 'SBIN', isin: 'INE062A01020', domain: 'sbi.co.in' } },
  { pattern: /bharti\s*airtel|airtel/i, security: { symbol: 'BHARTIARTL', isin: 'INE397D01024', domain: 'bhartiartl.com' } },
  { pattern: /itc\b/i, security: { symbol: 'ITC', isin: 'INE154A01025', domain: 'itcportal.com' } },
  { pattern: /tata\s*motors/i, security: { symbol: 'TATAMOTORS', isin: 'INE155A01022', domain: 'tatamotors.com' } },
  { pattern: /tata\s*steel/i, security: { symbol: 'TATASTEEL', isin: 'INE081A01012', domain: 'tatasteel.com' } },
  { pattern: /tata\s*gold/i, security: { symbol: 'TATAGOLD', domain: 'tatamutualfund.com' } },
  { pattern: /niftybees|nifty 50 etf/i, security: { symbol: 'NIFTYBEES', domain: 'nipponindiamf.com' } },
  { pattern: /goldbees/i, security: { symbol: 'GOLDBEES', domain: 'nipponindiamf.com' } },
  { pattern: /silverbees/i, security: { symbol: 'SILVERBEES', domain: 'nipponindiamf.com' } },
  { pattern: /moneyview/i, security: { domain: 'moneyview.in' } },
  { pattern: /adroit/i, security: { domain: 'adroitfinancial.com' } },
];

export const deriveDomainFromName = (name: string): string[] => {
  if (!name) return [];
  const clean = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  if (!clean) return [];
  const words = clean.split(/\s+/).filter(w => !['ltd', 'limited', 'inc', 'corp', 'corporation', 'pvt', 'private', 'co', 'company', 'fund', 'etf', 'industries', 'industry', 'infra', 'infrastructure', 'developers', 'development', 'jewellers', 'jewellery', 'dairy', 'food', 'foods'].includes(w));
  if (words.length === 0) return [];

  const results: string[] = [];
  const joined = words.join('');
  results.push(`${joined}.com`);
  results.push(`${joined}.in`);
  results.push(`${joined}.co.in`);
  return results;
};

/**
 * Derives missing symbol, ISIN, domain from security dictionary for an asset name.
 */
export const findSecurityMetadata = (
  name?: string,
  symbol?: string,
  isin?: string
): SecurityMetadata => {
  const rawName = (name || '').trim();
  const rawSymbol = (symbol || '').trim().toUpperCase();
  const rawIsin = (isin || '').trim().toUpperCase();

  if (rawIsin && ISIN_LOGO_MAP[rawIsin]) {
    const info = ISIN_LOGO_MAP[rawIsin];
    return { symbol: info.symbol, domain: info.domain, isin: rawIsin };
  }

  if (rawSymbol && SYMBOL_DOMAIN_MAP[rawSymbol]) {
    return { symbol: rawSymbol, domain: SYMBOL_DOMAIN_MAP[rawSymbol] };
  }

  for (const item of KNOWN_SECURITIES_DICTIONARY) {
    if (item.pattern.test(rawName) || (rawSymbol && item.pattern.test(rawSymbol))) {
      return item.security;
    }
  }

  return {};
};

// ==========================================
// 4. MUTUAL FUND AMC BRANDING MAP
// ==========================================
const AMC_BRAND_MAP: { pattern: RegExp; domain: string }[] = [
  { pattern: /sbi\b/i, domain: 'sbimf.com' },
  { pattern: /hdfc\b/i, domain: 'hdfcfund.com' },
  { pattern: /icici\b/i, domain: 'icicipruamc.com' },
  { pattern: /nippon\b/i, domain: 'nipponindiamf.com' },
  { pattern: /parag\s*parikh|ppfas/i, domain: 'amc.ppfas.com' },
  { pattern: /axis\b/i, domain: 'axismf.com' },
  { pattern: /mirae\b/i, domain: 'miraeassetmf.co.in' },
  { pattern: /uti\b/i, domain: 'utimf.com' },
  { pattern: /kotak\b/i, domain: 'kotakmf.com' },
  { pattern: /dsp\b/i, domain: 'dspim.com' },
  { pattern: /bandhan|idfc\b/i, domain: 'bandhanmutual.com' },
  { pattern: /quant\b/i, domain: 'quantmutual.com' },
  { pattern: /motilal\s*oswal/i, domain: 'motilaloswalmf.com' },
  { pattern: /tata\b/i, domain: 'tatamutualfund.com' },
  { pattern: /aditya\s*birla|absl/i, domain: 'mutualfund.adityabirlacapital.com' },
  { pattern: /canara\s*robeco/i, domain: 'canararobeco.com' },
  { pattern: /sundaram\b/i, domain: 'sundarammutual.com' },
  { pattern: /hsbc\b/i, domain: 'assetmanagement.hsbc.co.in' },
  { pattern: /invesco\b/i, domain: 'invescomutualfund.com' },
  { pattern: /edelweiss\b/i, domain: 'edelweissmf.com' },
  { pattern: /franklin\s*templeton/i, domain: 'franklintempletonindia.com' },
  { pattern: /groww\b/i, domain: 'groww.in' },
];

// ==========================================
// 5. BANK BRANDING MAP (Fixed Deposits / Savings)
// ==========================================
const BANK_BRAND_MAP: { pattern: RegExp; domain: string }[] = [
  { pattern: /sbi\b|state bank/i, domain: 'sbi.co.in' },
  { pattern: /hdfc\b/i, domain: 'hdfcbank.com' },
  { pattern: /icici\b/i, domain: 'icicibank.com' },
  { pattern: /axis\b/i, domain: 'axisbank.com' },
  { pattern: /kotak\b/i, domain: 'kotak.com' },
  { pattern: /pnb\b|punjab national/i, domain: 'pnbindia.in' },
  { pattern: /bank of baroda|bob\b/i, domain: 'bankofbaroda.in' },
  { pattern: /mahabank|bank of maharashtra/i, domain: 'bankofmaharashtra.in' },
  { pattern: /canara\b/i, domain: 'canarabank.com' },
  { pattern: /indusind\b/i, domain: 'indusind.com' },
  { pattern: /yes bank\b/i, domain: 'yesbank.in' },
  { pattern: /idfc\b/i, domain: 'idfcfirstbank.com' },
  { pattern: /federal bank\b/i, domain: 'federalbank.co.in' },
  { pattern: /au small/i, domain: 'aubank.in' },
];

/**
 * Resolves asset logo details with an ordered list of candidate URLs and source attribution.
 *
 * Priority:
 * 1. Database `logoUrl` / `logo_url`
 * 2. ISIN Lookup (Logo.dev ISIN + Google Favicon)
 * 3. Ticker/Symbol Lookup (Logo.dev Stock Ticker API + Google Favicon)
 * 4. Domain Lookup (Logo.dev Domain API + Google Favicon API)
 * 5. Initials / Category Vector Container Fallback
 */
export const resolveAssetLogoDetails = (params: ResolveLogoParams): LogoResolutionResult => {
  const explicitUrl = params.logoUrl || params.logo_url;
  if (explicitUrl && explicitUrl.trim().length > 0 && !isLogoFailed(explicitUrl)) {
    return {
      url: explicitUrl.trim(),
      candidateUrls: [explicitUrl.trim()],
      source: 'database',
    };
  }

  const rawName = (params.name || params.assetName || '').trim();
  let rawSymbol = (params.symbol || '').trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
  let rawIsin = (params.isin || '').trim().toUpperCase();

  // Find security metadata if missing symbol or isin
  const meta = findSecurityMetadata(rawName, rawSymbol, rawIsin);
  if (!rawSymbol && meta.symbol) rawSymbol = meta.symbol;
  if (!rawIsin && meta.isin) rawIsin = meta.isin;

  const cacheKey = buildLogoCacheKey({
    name: rawName,
    symbol: rawSymbol,
    isin: rawIsin,
    exchange: params.exchange,
    assetType: params.assetType || params.category,
  });

  const cached = getCachedLogo(cacheKey);
  if (cached) {
    if (isLogoFailed(cached)) {
      return { url: null, candidateUrls: [], source: 'fallback' };
    }
    return { url: cached, candidateUrls: [cached], source: 'ticker' };
  }

  const candidateUrls: string[] = [];
  let source: LogoSourceType = 'fallback';

  const pushDomainCandidates = (dom: string) => {
    if (!dom) return;
    const cleanDom = dom.trim();
    const lDev = logoDevByDomain(cleanDom);
    if (lDev) candidateUrls.push(lDev);

    candidateUrls.push(`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${cleanDom}&size=128`);
    candidateUrls.push(googleFavicon(cleanDom));
    candidateUrls.push(`https://icons.duckduckgo.com/ip3/${cleanDom}.ico`);
  };

  const cat = (params.assetType || params.category || '').toLowerCase();

  // Special direct favicon fallback for IRB InvIT
  if (rawName.toLowerCase().includes('irb') || rawSymbol === 'IRBINVIT') {
    candidateUrls.push('https://www.irbinvit.co.in/favicon.ico');
  }

  // 1. ISIN check
  if (rawIsin && ISIN_LOGO_MAP[rawIsin]) {
    const info = ISIN_LOGO_MAP[rawIsin];
    if (info.symbol) {
      const tUrl = logoDevByTicker(info.symbol);
      if (tUrl) candidateUrls.push(tUrl);
    }
    if (info.domain) {
      pushDomainCandidates(info.domain);
    }
    source = 'isin';
  }

  // 2. Mutual Fund AMC Matching (higher priority for Mutual Funds)
  if (candidateUrls.length === 0 && (cat.includes('mutual') || cat.includes('fund'))) {
    for (const item of AMC_BRAND_MAP) {
      if (item.pattern.test(rawName)) {
        pushDomainCandidates(item.domain);
        source = 'domain';
        break;
      }
    }
  }

  // 3. Ticker / Symbol check
  if (rawSymbol) {
    candidateUrls.push(`https://assets.parqet.com/logos/symbol/${rawSymbol}?format=png`);
    const tUrl = logoDevByTicker(rawSymbol);
    if (tUrl) candidateUrls.push(tUrl);
    if (SYMBOL_DOMAIN_MAP[rawSymbol]) {
      pushDomainCandidates(SYMBOL_DOMAIN_MAP[rawSymbol]);
    }
    if (candidateUrls.length > 0 && source === 'fallback') {
      source = 'ticker';
    }
  }

  // 4. Domain check from metadata or AMC / Bank / Company patterns
  if (meta.domain) {
    pushDomainCandidates(meta.domain);
    if (source === 'fallback') source = 'domain';
  }

  // 5. Fallback Mutual Fund AMC Matching if not already matched
  if (cat.includes('mutual') || cat.includes('fund')) {
    for (const item of AMC_BRAND_MAP) {
      if (item.pattern.test(rawName)) {
        pushDomainCandidates(item.domain);
        if (source === 'fallback') source = 'domain';
        break;
      }
    }
  }

  // 6. Bank FD / Savings Matching
  if (cat.includes('deposit') || cat.includes('fixed') || cat.includes('bank')) {
    for (const item of BANK_BRAND_MAP) {
      if (item.pattern.test(rawName)) {
        pushDomainCandidates(item.domain);
        if (source === 'fallback') source = 'domain';
        break;
      }
    }
  }

  // 7. Derived domain matching from asset name (for IPOs, unlisted assets, brands)
  if (candidateUrls.length === 0 && rawName) {
    const derived = deriveDomainFromName(rawName);
    derived.forEach(dom => pushDomainCandidates(dom));
    if (derived.length > 0 && candidateUrls.length > 0 && source === 'fallback') {
      source = 'domain';
    }
  }

  // 8. Crypto Symbol Matching
  if (cat.includes('crypto') || rawSymbol === 'BTC' || rawSymbol === 'ETH' || rawSymbol === 'SOL') {
    const sym = (rawSymbol || rawName).toLowerCase();
    candidateUrls.push(cryptoLogo(sym));
    if (source === 'fallback') source = 'ticker';
  }

  // Filter candidate URLs that are known to have failed
  const validCandidates = candidateUrls.filter((url) => !isLogoFailed(url));

  const resolvedUrl = validCandidates.length > 0 ? validCandidates[0] : null;

  if (resolvedUrl) {
    cacheLogo(cacheKey, resolvedUrl);
  }

  return {
    url: resolvedUrl,
    candidateUrls: validCandidates,
    source: resolvedUrl ? source : 'fallback',
  };
};

/**
 * Standard single-string logo resolver for backward compatibility.
 */
export const resolveAssetLogo = (params: ResolveLogoParams): string | null => {
  return resolveAssetLogoDetails(params).url;
};

/**
 * Generates uppercase 1-2 letter initials from asset name.
 */
export const getAssetInitials = (name?: string, symbol?: string): string => {
  if (symbol && symbol.length >= 1 && symbol.length <= 4 && !/\.\w+$/.test(symbol)) {
    return symbol.slice(0, 2).toUpperCase();
  }

  if (!name || name.trim().length === 0) return 'AS';

  const rawName = name.trim();
  const words = rawName.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  const single = words[0];
  const camelMatch = single.match(/[A-Z]/g);
  if (camelMatch && camelMatch.length >= 2) {
    return (camelMatch[0] + camelMatch[1]).toUpperCase();
  }

  const compoundMatch = single.match(/^(Money|Pay|Phone|Fam|Safe|Aug|Zero|Up|Airtel)(.+)$/i);
  if (compoundMatch) {
    const part1 = compoundMatch[1];
    const part2 = compoundMatch[2];
    return (part1[0] + part2[0]).toUpperCase();
  }

  if (single.length >= 2) {
    return single.slice(0, 2).toUpperCase();
  }

  return single.toUpperCase();
};

/**
 * Normalizes asset type into 10 standard categories for fallback icons & badges.
 */
export const normalizeAssetTypeKey = (cat?: string): string => {
  if (!cat) return 'Other';
  const clean = cat.trim().toLowerCase();

  if (clean === 'stock' || clean === 'stocks') return 'Stock';
  if (clean === 'etf' || clean === 'etfs') return 'ETF';
  if (clean === 'mutual fund' || clean === 'mutual funds') return 'Mutual Fund';
  if (clean === 'ipo' || clean === 'ipos') return 'IPO';
  if (clean === 'digital gold' || clean === 'gold') return 'Digital Gold';
  if (clean === 'digital silver' || clean === 'silver') return 'Digital Silver';
  if (clean === 'crypto' || clean === 'cryptocurrency') return 'Crypto';
  if (clean === 'fixed deposit' || clean === 'fixed deposits') return 'Fixed Deposit';
  if (clean === 'bond' || clean === 'bonds') return 'Bond';

  return 'Other';
};
