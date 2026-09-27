import { storage } from './localStorage';

const LOGO_CACHE_STORAGE_KEY = 'fridaytrack_logo_cache_v1';

// Memory cache for synchronous lookups
const memoryLogoCache = new Map<string, string>();
const memoryFailedCache = new Set<string>();

// Clear any old failed cache from localStorage so failed URLs are never permanently blocked
try {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('fridaytrack_logo_failed_v1');
    localStorage.removeItem('investment_tracker_logo_failed_v1');
  }
} catch (e) {
  // ignore
}

// Hydrate successful cache from localStorage on module load
try {
  const savedCache = storage.get<Record<string, string>>(LOGO_CACHE_STORAGE_KEY, {});
  Object.entries(savedCache).forEach(([key, url]) => {
    if (url) memoryLogoCache.set(key, url);
  });
} catch (e) {
  console.warn('Failed to load logo cache from localStorage:', e);
}

/**
  Normalizes composite logo lookup keys.
 */
export const buildLogoCacheKey = (params: {
  name?: string;
  symbol?: string;
  isin?: string;
  exchange?: string;
  assetType?: string;
}): string => {
  const isinPart = (params.isin || '').trim().toUpperCase();
  const symbolPart = (params.symbol || '').trim().toUpperCase();
  const exchangePart = (params.exchange || '').trim().toUpperCase();
  const namePart = (params.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const typePart = (params.assetType || '').trim().toLowerCase();

  return `${isinPart}_${symbolPart}_${exchangePart}_${namePart}_${typePart}`;
};

/**
 * Gets a cached logo URL by lookup key.
 */
export const getCachedLogo = (key: string): string | null => {
  if (!key) return null;
  return memoryLogoCache.get(key) || null;
};

/**
 * Caches a successfully resolved logo URL by lookup key.
 */
export const cacheLogo = (key: string, url: string): void => {
  if (!key || !url) return;
  memoryLogoCache.set(key, url);

  try {
    const currentObj = storage.get<Record<string, string>>(LOGO_CACHE_STORAGE_KEY, {});
    currentObj[key] = url;
    storage.set(LOGO_CACHE_STORAGE_KEY, currentObj);
  } catch (e) {
    console.warn('Failed to save logo to cache storage:', e);
  }
};

/**
 * Marks a logo URL or cache key as failed in session memory only (does not pollute localStorage).
 */
export const markLogoFailed = (keyOrUrl: string): void => {
  if (!keyOrUrl) return;
  memoryFailedCache.add(keyOrUrl);
};

/**
 * Checks whether a URL or lookup key is known to fail loading in the current session.
 */
export const isLogoFailed = (keyOrUrl: string): boolean => {
  if (!keyOrUrl) return false;
  return memoryFailedCache.has(keyOrUrl);
};

/**
 * Clears session failure cache when retrying.
 */
export const clearFailedCache = (): void => {
  memoryFailedCache.clear();
};
