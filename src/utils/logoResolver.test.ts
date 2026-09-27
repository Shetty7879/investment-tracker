import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveAssetLogo,
  resolveAssetLogoDetails,
  getAssetInitials,
  normalizeAssetTypeKey
} from './logoResolver';
import { buildLogoCacheKey, getCachedLogo, cacheLogo, isLogoFailed, markLogoFailed } from './logoCache';

describe('Logo Cache & Resolver', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('generates consistent initials for asset names', () => {
    expect(getAssetInitials('Reliance Industries')).toBe('RI');
    expect(getAssetInitials('Tata Gold ETF')).toBe('TG');
    expect(getAssetInitials('HDFC Bank')).toBe('HB');
    expect(getAssetInitials('Moneyview')).toBe('MV');
    expect(getAssetInitials('SBI Bluechip Fund')).toBe('SB');
    expect(getAssetInitials('Parag Parikh Flexi Cap Fund')).toBe('PP');
    expect(getAssetInitials('Swastika Infra')).toBe('SI');
  });

  it('normalizes asset types into standard categories', () => {
    expect(normalizeAssetTypeKey('Stocks')).toBe('Stock');
    expect(normalizeAssetTypeKey('ETFs')).toBe('ETF');
    expect(normalizeAssetTypeKey('Mutual Funds')).toBe('Mutual Fund');
    expect(normalizeAssetTypeKey('IPOs')).toBe('IPO');
    expect(normalizeAssetTypeKey('Fixed Deposits')).toBe('Fixed Deposit');
    expect(normalizeAssetTypeKey('Gold')).toBe('Digital Gold');
  });

  it('resolves explicit logoUrl priority #1', () => {
    const customUrl = 'https://example.com/logo.png';
    const logo = resolveAssetLogo({
      name: 'Custom Asset',
      logoUrl: customUrl,
    });
    expect(logo).toBe(customUrl);
  });

  it('resolves Indian stock ISIN priority #2 with Logo.dev and domain candidates', () => {
    const relianceRes = resolveAssetLogoDetails({
      isin: 'INE002A01018',
      name: 'Reliance Industries',
    });
    expect(relianceRes.source).toBe('isin');
    expect(relianceRes.candidateUrls.some(u => u.includes('ticker/RELIANCE'))).toBe(true);
    expect(relianceRes.candidateUrls.some(u => u.includes('google.com/s2/favicons?domain=ril.com'))).toBe(true);
  });

  it('resolves ticker/symbol priority #3 with Logo.dev and domain candidates', () => {
    const tcsRes = resolveAssetLogoDetails({
      symbol: 'TCS',
      name: 'Tata Consultancy Services',
    });
    expect(tcsRes.source).toBe('ticker');
    expect(tcsRes.candidateUrls.some(u => u.includes('ticker/TCS'))).toBe(true);
    expect(tcsRes.candidateUrls.some(u => u.includes('google.com/s2/favicons?domain=tcs.com'))).toBe(true);
  });

  it('resolves specific Holdings page assets (NSE, Swastika, Veegaland, IRB, NBCC, Coal India, Bank of Maharashtra)', () => {
    const nseRes = resolveAssetLogoDetails({ name: 'NSE', symbol: 'NSE' });
    expect(nseRes.candidateUrls.some(u => u.includes('nseindia.com'))).toBe(true);

    const swastikaRes = resolveAssetLogoDetails({ name: 'Swastika Infra' });
    expect(swastikaRes.candidateUrls.some(u => u.includes('swastika.co.in'))).toBe(true);

    const veegalandRes = resolveAssetLogoDetails({ name: 'Veegaland Developers' });
    expect(veegalandRes.candidateUrls.some(u => u.includes('veegaland.com'))).toBe(true);

    const irbRes = resolveAssetLogoDetails({ name: 'IRB Invit fund' });
    expect(irbRes.candidateUrls.some(u => u.includes('irbinvit.co.in'))).toBe(true);

    const nbccRes = resolveAssetLogoDetails({ name: 'NBCC' });
    expect(nbccRes.candidateUrls.some(u => u.includes('nbccindia.com'))).toBe(true);

    const coalIndiaRes = resolveAssetLogoDetails({ name: 'Coal India' });
    expect(coalIndiaRes.candidateUrls.some(u => u.includes('coalindia.in'))).toBe(true);

    const mahaBankRes = resolveAssetLogoDetails({ name: 'Bank of Maharashtra' });
    expect(mahaBankRes.candidateUrls.some(u => u.includes('bankofmaharashtra.in'))).toBe(true);
  });

  it('resolves Mutual Fund AMC patterns', () => {
    const sbiRes = resolveAssetLogoDetails({
      name: 'SBI Bluechip Fund',
      assetType: 'Mutual Fund',
    });
    expect(sbiRes.candidateUrls.some(u => u.includes('sbimf.com'))).toBe(true);

    const ppfasRes = resolveAssetLogoDetails({
      name: 'Parag Parikh Flexi Cap Fund',
      assetType: 'Mutual Fund',
    });
    expect(ppfasRes.candidateUrls.some(u => u.includes('ppfas.com'))).toBe(true);
  });

  it('resolves Crypto symbols', () => {
    const btcRes = resolveAssetLogoDetails({
      symbol: 'BTC',
      name: 'Bitcoin',
      assetType: 'Crypto',
    });
    expect(btcRes.candidateUrls.some(u => u.includes('cryptocurrency-icons'))).toBe(true);
  });

  it('caches resolved logos and handles failed image URLs', () => {
    const key = buildLogoCacheKey({ name: 'Test Stock', symbol: 'TEST' });
    expect(getCachedLogo(key)).toBeNull();

    cacheLogo(key, 'https://test.com/logo.png');
    expect(getCachedLogo(key)).toBe('https://test.com/logo.png');

    markLogoFailed('https://test.com/broken.png');
    expect(isLogoFailed('https://test.com/broken.png')).toBe(true);
  });
});
