import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Layers,
  Landmark,
  Sparkles,
  Coins,
  Building2,
  Award,
  Briefcase
} from 'lucide-react';
import {
  resolveAssetLogoDetails,
  getAssetInitials,
  normalizeAssetTypeKey,
  type ResolveLogoParams
} from '../utils/logoResolver';
import { markLogoFailed } from '../utils/logoCache';

export interface AssetObject {
  id?: string;
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

export interface AssetLogoProps extends ResolveLogoParams {
  asset?: AssetObject;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  shape?: 'circle' | 'rounded' | 'square';
  showCategoryIcon?: boolean;
}

export const AssetLogo: React.FC<AssetLogoProps> = ({
  asset,
  name,
  assetName,
  symbol,
  isin,
  exchange,
  assetType,
  category,
  logoUrl,
  logo_url,
  size = 'md',
  className = '',
  shape = 'rounded',
  showCategoryIcon = false,
}) => {
  const displayName = asset?.assetName || asset?.name || name || assetName || symbol || asset?.symbol || 'Asset';
  const effectiveSymbol = asset?.symbol || symbol;
  const effectiveIsin = asset?.isin || isin;
  const effectiveExchange = asset?.exchange || exchange;
  const rawCategory = asset?.assetType || asset?.category || assetType || category;
  const effectiveCategory = normalizeAssetTypeKey(rawCategory);
  const effectiveLogoUrl = asset?.logoUrl || asset?.logo_url || logoUrl || logo_url;
  const initials = getAssetInitials(displayName, effectiveSymbol);

  const initialRes = resolveAssetLogoDetails({
    name: displayName,
    symbol: effectiveSymbol,
    isin: effectiveIsin,
    exchange: effectiveExchange,
    assetType: effectiveCategory,
    logoUrl: effectiveLogoUrl,
  });

  const [candidates, setCandidates] = useState<string[]>(initialRes.candidateUrls);
  const [candidateIndex, setCandidateIndex] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(initialRes.candidateUrls.length === 0);

  // Diagnostic logger (Requirement 12)
  useEffect(() => {
    const currentUrl = candidates[candidateIndex] || null;
    const isLoaded = !hasError && !!currentUrl;
    console.log(
      `[AssetLogo Debug] Asset: ${displayName} | Symbol: ${effectiveSymbol || 'N/A'} | ISIN: ${effectiveIsin || 'N/A'} | Type: ${effectiveCategory} | Source: ${initialRes.source} | URL: ${currentUrl || 'N/A'} | Status: ${isLoaded ? 'LOADED' : (hasError ? 'FAILED_INITIALS' : 'PENDING')}`
    );
  }, [displayName, effectiveSymbol, effectiveIsin, effectiveCategory, initialRes.source, candidateIndex, candidates, hasError]);

  // Update candidates when props or asset object changes
  useEffect(() => {
    const newRes = resolveAssetLogoDetails({
      name: displayName,
      symbol: effectiveSymbol,
      isin: effectiveIsin,
      exchange: effectiveExchange,
      assetType: effectiveCategory,
      logoUrl: effectiveLogoUrl,
    });
    setCandidates(newRes.candidateUrls);
    setCandidateIndex(0);
    setHasError(newRes.candidateUrls.length === 0);
  }, [asset?.id, displayName, effectiveSymbol, effectiveIsin, effectiveExchange, effectiveCategory, effectiveLogoUrl]);

  const currentUrl = !hasError && candidateIndex < candidates.length ? candidates[candidateIndex] : null;

  const handleImageError = () => {
    const failedUrl = candidates[candidateIndex];
    if (failedUrl) {
      markLogoFailed(failedUrl);
    }

    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex(prev => prev + 1);
    } else {
      setHasError(true);
    }
  };

  // Dimensions & typography classes
  const getSizeStyles = () => {
    if (typeof size === 'number') {
      return {
        style: { width: `${size}px`, height: `${size}px`, minWidth: `${size}px`, minHeight: `${size}px` },
        textSize: size <= 28 ? 'text-[10px]' : size <= 36 ? 'text-xs' : 'text-sm',
        iconSize: Math.max(12, Math.floor(size * 0.45)),
      };
    }

    switch (size) {
      case 'xs':
        return { dimensions: 'w-6 h-6 min-w-6 min-h-6', textSize: 'text-[9px]', iconSize: 12 };
      case 'sm':
        return { dimensions: 'w-8 h-8 min-w-8 min-h-8', textSize: 'text-[11px]', iconSize: 14 };
      case 'lg':
        return { dimensions: 'w-12 h-12 min-w-12 min-h-12', textSize: 'text-base font-bold', iconSize: 22 };
      case 'xl':
        return { dimensions: 'w-16 h-16 min-w-16 min-h-16', textSize: 'text-lg font-bold', iconSize: 28 };
      case 'md':
      default:
        return { dimensions: 'w-10 h-10 min-w-10 min-h-10', textSize: 'text-xs font-bold', iconSize: 18 };
    }
  };

  const { dimensions, style, textSize, iconSize } = getSizeStyles();

  // Shape class
  const shapeClass =
    shape === 'circle' ? 'rounded-full' : shape === 'square' ? 'rounded-md' : 'rounded-xl';

  // Render Fallback Component
  const renderFallback = () => {
    switch (effectiveCategory) {
      case 'Stock':
        return (
          <div
            className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/10 via-blue-500/10 to-indigo-600/15 text-indigo-600 dark:text-indigo-400 font-bold font-sans tracking-tight border border-indigo-500/20 shadow-inner ${shapeClass}`}
          >
            {showCategoryIcon ? <TrendingUp size={iconSize} /> : <span className={textSize}>{initials}</span>}
          </div>
        );
      case 'ETF':
        return (
          <div
            className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-emerald-600/15 text-emerald-600 dark:text-emerald-400 font-bold font-sans tracking-tight border border-emerald-500/20 shadow-inner ${shapeClass}`}
          >
            {showCategoryIcon ? <Layers size={iconSize} /> : <span className={textSize}>{initials}</span>}
          </div>
        );
      case 'Mutual Fund':
        return (
          <div
            className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/10 via-violet-500/10 to-purple-600/15 text-purple-600 dark:text-purple-400 font-bold font-sans tracking-tight border border-purple-500/20 shadow-inner ${shapeClass}`}
          >
            {showCategoryIcon ? <Landmark size={iconSize} /> : <span className={textSize}>{initials}</span>}
          </div>
        );
      case 'IPO':
        return (
          <div
            className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-600/15 text-amber-600 dark:text-amber-400 font-bold font-sans tracking-tight border border-amber-500/20 shadow-inner ${shapeClass}`}
          >
            {showCategoryIcon ? <Sparkles size={iconSize} /> : <span className={textSize}>{initials}</span>}
          </div>
        );
      case 'Digital Gold':
        return (
          <div
            className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-400/20 via-yellow-500/20 to-amber-600/25 text-amber-600 dark:text-amber-400 font-bold font-sans tracking-tight border border-amber-400/30 shadow-inner ${shapeClass}`}
          >
            {showCategoryIcon ? <Coins size={iconSize} /> : <span className={textSize}>{initials}</span>}
          </div>
        );
      case 'Digital Silver':
        return (
          <div
            className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-300/30 via-slate-400/20 to-slate-500/25 text-slate-700 dark:text-slate-300 font-bold font-sans tracking-tight border border-slate-400/30 shadow-inner ${shapeClass}`}
          >
            {showCategoryIcon ? <Coins size={iconSize} /> : <span className={textSize}>{initials}</span>}
          </div>
        );
      case 'Crypto':
        return (
          <div
            className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-500/10 via-sky-500/10 to-cyan-600/15 text-cyan-600 dark:text-cyan-400 font-bold font-sans tracking-tight border border-cyan-500/20 shadow-inner ${shapeClass}`}
          >
            {showCategoryIcon ? <Coins size={iconSize} /> : <span className={textSize}>{initials}</span>}
          </div>
        );
      case 'Fixed Deposit':
        return (
          <div
            className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-500/10 via-pink-500/10 to-rose-600/15 text-rose-600 dark:text-rose-400 font-bold font-sans tracking-tight border border-rose-500/20 shadow-inner ${shapeClass}`}
          >
            {showCategoryIcon ? <Building2 size={iconSize} /> : <span className={textSize}>{initials}</span>}
          </div>
        );
      case 'Bond':
        return (
          <div
            className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-blue-600/15 text-blue-600 dark:text-blue-400 font-bold font-sans tracking-tight border border-blue-500/20 shadow-inner ${shapeClass}`}
          >
            {showCategoryIcon ? <Award size={iconSize} /> : <span className={textSize}>{initials}</span>}
          </div>
        );
      case 'Other':
      default:
        return (
          <div
            className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-500/10 via-slate-600/10 to-slate-700/15 text-slate-600 dark:text-slate-400 font-bold font-sans tracking-tight border border-slate-400/20 shadow-inner ${shapeClass}`}
          >
            {showCategoryIcon ? <Briefcase size={iconSize} /> : <span className={textSize}>{initials}</span>}
          </div>
        );
    }
  };

  return (
    <div
      style={style}
      className={`relative flex items-center justify-center shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/50 shadow-sm transition-all ${shapeClass} ${dimensions || ''} ${className}`}
    >
      {!hasError && currentUrl ? (
        <img
          src={currentUrl}
          alt={`${displayName} logo`}
          loading="lazy"
          onError={handleImageError}
          className="w-full h-full object-contain p-1 select-none transition-opacity duration-200"
        />
      ) : (
        renderFallback()
      )}
    </div>
  );
};
