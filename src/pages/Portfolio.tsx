import React from 'react';
import { useApp } from '../contexts/AppContext';
import { usePortfolio } from '../hooks/usePortfolio';
import { getInvestmentAge } from '../utils/calculations';
import { getAssetTypeBadgeStyle } from '../utils/badgeStyles';
import { Wallet } from 'lucide-react';
import { isCommodityCategory, calculateMonthlyInvested, calculateTotalInvested } from '../services/portfolioCalculationService';

const REVERSE_TYPE_MAPPING: Record<string, string> = {
  'Stocks': 'Stock',
  'ETFs': 'ETF',
  'IPOs': 'IPO',
  'Mutual Funds': 'Mutual Fund',
  'Gold': 'Digital Gold',
  'Silver': 'Digital Silver',
  'Platinum': 'Digital Platinum',
  'Crypto': 'Crypto',
  'Fixed Deposits': 'Fixed Deposit',
  'Bond': 'Bond',
  'Other': 'Other'
};

const normalizePortfolioCategory = (cat: string | undefined): string => {
  if (!cat) return 'Other';
  const clean = cat.trim();
  const lower = clean.toLowerCase();
  
  if (lower === 'stock' || lower === 'stocks') return 'Stocks';
  if (lower === 'etf' || lower === 'etfs') return 'ETFs';
  if (lower === 'mutual fund' || lower === 'mutual funds') return 'Mutual Funds';
  if (lower === 'ipo' || lower === 'ipos') return 'IPOs';
  if (lower === 'gold' || lower === 'digital gold') return 'Digital Gold';
  if (lower === 'silver' || lower === 'digital silver') return 'Digital Silver';
  if (lower === 'platinum' || lower === 'digital platinum') return 'Digital Platinum';
  
  return clean;
};

const getCategoryValue = (inv: any): string => {
  const baseCat = inv.category || inv.assetType;
  if (!baseCat || baseCat.trim().toLowerCase() === 'other') {
    return inv.customAssetType || 'Other';
  }
  return baseCat;
};

const getAssetKey = (inv: any) => {
  const category = (inv.category || inv.assetType || 'Other').trim().toUpperCase();
  if (category === 'STOCKS' || category === 'ETFS') {
    const symbol = (inv.symbol || '').trim().toUpperCase();
    if (symbol) {
      return `${category}_SYM_${symbol}`;
    }
  }
  const name = (inv.assetName || '').trim().toUpperCase();
  return `${category}_NAME_${name}`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${day < 10 ? '0' + day : day} ${months[monthIdx]} ${year}`;
  }
  return dateStr;
};

const PLATFORM_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  'PhonePe': {
    bg: 'bg-purple-500/10 dark:bg-purple-950/20',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-200/50 dark:border-purple-900/30',
    icon: '🟣'
  },
  'Dhan': {
    bg: 'bg-emerald-500/10 dark:bg-emerald-950/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200/50 dark:border-emerald-900/30',
    icon: '🟢'
  },
  'Groww': {
    bg: 'bg-teal-500/10 dark:bg-teal-950/20',
    text: 'text-teal-700 dark:text-teal-400',
    border: 'border-teal-200/50 dark:border-teal-900/30',
    icon: '🔵'
  },
  'Zerodha': {
    bg: 'bg-orange-500/10 dark:bg-orange-950/20',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-200/50 dark:border-orange-900/30',
    icon: '🟠'
  },
  'Lemon': {
    bg: 'bg-yellow-500/10 dark:bg-yellow-950/20',
    text: 'text-yellow-700 dark:text-yellow-400',
    border: 'border-yellow-200/50 dark:border-yellow-900/30',
    icon: '🟡'
  },
  'Univest': {
    bg: 'bg-blue-500/10 dark:bg-blue-950/20',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200/50 dark:border-blue-900/30',
    icon: '🔵'
  },
  'FamPay': {
    bg: 'bg-pink-500/10 dark:bg-pink-950/20',
    text: 'text-pink-700 dark:text-pink-400',
    border: 'border-pink-200/50 dark:border-pink-900/30',
    icon: '🔴'
  },
  'Bank': {
    bg: 'bg-slate-500/10 dark:bg-slate-900/40',
    text: 'text-slate-700 dark:text-slate-400',
    border: 'border-slate-200/50 dark:border-slate-800/50',
    icon: '🏦'
  }
};

const DEFAULT_PLATFORM_STYLE = {
  bg: 'bg-slate-500/10 dark:bg-slate-950/20',
  text: 'text-slate-700 dark:text-slate-400',
  border: 'border-slate-200/50 dark:border-slate-800/30',
  icon: '🔌'
};

interface PlatformBadgeProps {
  name: string;
}

const PlatformBadge: React.FC<PlatformBadgeProps> = ({ name }) => {
  const cleanName = name.trim();
  const style = PLATFORM_STYLES[cleanName] || {
    ...DEFAULT_PLATFORM_STYLE,
    icon: cleanName.toLowerCase().includes('bank') ? '🏦' : '🔌'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border text-xs font-semibold leading-none shadow-sm cursor-default transition-all hover:scale-[1.02] ${style.bg} ${style.text} ${style.border}`}>
      <span className="text-[13px] select-none leading-none flex items-center justify-center h-3.5 w-3.5">{style.icon}</span>
      <span>{cleanName}</span>
    </span>
  );
};

const renderPlatformBadges = (platformsString: string) => {
  if (!platformsString || !platformsString.trim()) {
    return <PlatformBadge name="Other" />;
  }
  const list = platformsString.split(',').map(p => p.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-1.5 items-center justify-start py-0.5">
      {list.map(name => (
        <PlatformBadge key={name} name={name} />
      ))}
    </div>
  );
};

export const Portfolio: React.FC = () => {
  const { formatCurrency } = useApp();
  const { holdings, transactions: activeHoldingsTxs } = usePortfolio();
  const [selectedCategory, setSelectedCategory] = React.useState<string>('All');

  const isHoldingActive = (h: any): boolean => {
    const category = h.category || h.assetType || '';
    
    if (category === 'IPOs') {
      const status = h.ipoAllotmentStatus || h.allotmentStatus || 'Applied';
      const inactiveStatuses = ['Not Allotted', 'Refund Pending', 'Refunded', 'Withdrawn', 'Sold'];
      return !inactiveStatuses.includes(status);
    }
    
    if (isCommodityCategory(category)) {
      const hasWeight = h.quantity > 0;
      const hasInvested = (h.investedAmount ?? 0) > 0;
      const hasCurrent = (h.currentValue ?? 0) > 0;
      return hasWeight || hasInvested || hasCurrent;
    }
    
    return h.quantity > 0;
  };

  const activeHoldings = holdings.filter(isHoldingActive);

  const consolidatedMap: Record<string, any[]> = {};
  activeHoldings.forEach(h => {
    const key = getAssetKey(h);
    if (!consolidatedMap[key]) {
      consolidatedMap[key] = [];
    }
    consolidatedMap[key].push(h);
  });

  const consolidatedAssets = Object.entries(consolidatedMap).map(([key, group]) => {
    let earliestDate = '';
    group.forEach(h => {
      const dateStr = h.buyDate || h.purchaseDate || h.applicationDate;
      if (dateStr) {
        if (!earliestDate || dateStr < earliestDate) {
          earliestDate = dateStr;
        }
      }
    });

    if (!earliestDate) {
      earliestDate = '2026-01-01';
    }

    const age = getInvestmentAge(earliestDate);
    const overallAmount = group.reduce((sum, h) => sum + (h.investedAmount ?? 0), 0);
    const first = group[0];
    const displayType = REVERSE_TYPE_MAPPING[first.category] || REVERSE_TYPE_MAPPING[first.assetType] || 'Other';
    const categoryVal = getCategoryValue(first);
    const category = normalizePortfolioCategory(categoryVal);

    // Resolve platform names
    const platformsSet = new Set<string>();
    group.forEach(h => {
      const broker = h.broker === 'Other' && h.customBroker ? h.customBroker : (h.broker || 'Other');
      const resolved = (broker && broker.trim()) ? broker.trim() : 'Other';
      platformsSet.add(resolved);
    });
    const platforms = Array.from(platformsSet).join(', ');

    return {
      key,
      assetName: first.assetName,
      category,
      displayType,
      platforms,
      startedDate: earliestDate,
      age,
      overallAmount
    };
  });

  // Sort: Oldest Started Date (earliest date) to Newest Started Date
  consolidatedAssets.sort((a, b) => {
    return new Date(a.startedDate).getTime() - new Date(b.startedDate).getTime();
  });

  // Dynamically resolve available categories currently present in portfolio
  const availableCategories = Array.from(
    new Set(consolidatedAssets.map(asset => asset.category))
  ).sort((a, b) => a.localeCompare(b));
  
  const categoriesList = ['All', ...availableCategories];

  // Filter consolidated portfolio items based on active category filter selection
  const filteredAssets = selectedCategory === 'All'
    ? consolidatedAssets
    : consolidatedAssets.filter(asset => asset.category === selectedCategory);
  
  // Calculate summary values using centralized helpers
  const totalInvested = calculateTotalInvested(holdings, activeHoldingsTxs);
  const holdingsCount = activeHoldings.length;

  // Monthly Invested Calculation
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const monthlyInvestedAmount = calculateMonthlyInvested(activeHoldingsTxs, holdings, currentYear, currentMonthIdx);

  // Find top category by allocation
  const categoryAllocations: Record<string, number> = {};
  activeHoldings.forEach(h => {
    const catVal = getCategoryValue(h);
    const cat = normalizePortfolioCategory(catVal);
    categoryAllocations[cat] = (categoryAllocations[cat] || 0) + (h.investedAmount ?? 0);
  });
  let topCategoryName = 'N/A';
  let topCategoryPercent = 0;
  if (totalInvested > 0) {
    const sortedAllocations = Object.entries(categoryAllocations)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
    if (sortedAllocations.length > 0) {
      topCategoryName = sortedAllocations[0].name;
      topCategoryPercent = (sortedAllocations[0].amount / totalInvested) * 100;
    }
  }

  return (
    <div className="space-y-6 animate-slide-in pb-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white m-0">💼 Consolidated Portfolio</h2>
            <p className="text-sm text-slate-405 dark:text-slate-500 m-0 font-semibold">
              Consolidated view of your assets, holdings, and total amount invested.
            </p>
          </div>
        </div>
      </div>

      {consolidatedAssets.length === 0 ? (
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[350px]">
          <span className="text-3xl mb-3">💼</span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">No assets found</h4>
          <p className="text-xs text-slate-405 dark:text-slate-555 max-w-xs font-semibold">
            Add investments to view your consolidated portfolio.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 font-semibold text-xs text-slate-700 dark:text-slate-350">
            {/* Total Invested */}
            <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[140px]">
              <div className="flex flex-col justify-between h-full gap-y-4">
                <span className="block text-[13px] md:text-[14px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  💰 Total Invested
                </span>
                <div>
                  <span className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white block leading-tight">
                    {formatCurrency(totalInvested)}
                  </span>
                  <span className="text-sm md:text-[14px] text-slate-400 dark:text-slate-500 block mt-1 font-semibold">
                    Across active holdings
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Invested */}
            <div className="bg-white dark:bg-[#0d0f17] border border-slate-200/80 dark:border-slate-855 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[140px]">
              <div className="flex flex-col justify-between h-full gap-y-4">
                <span className="block text-[13px] md:text-[14px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  📅 Monthly Invested
                </span>
                <div>
                  <span className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white block leading-tight">
                    {formatCurrency(monthlyInvestedAmount)}
                  </span>
                  <span className="text-sm md:text-[14px] text-slate-400 dark:text-slate-500 block mt-1 font-semibold">
                    Invested this month
                  </span>
                </div>
              </div>
            </div>

            {/* Number of Holdings */}
            <div className="bg-white dark:bg-[#0d0f17] border border-slate-200/80 dark:border-slate-855 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[140px]">
              <div className="flex flex-col justify-between h-full gap-y-4">
                <span className="block text-[13px] md:text-[14px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  💼 Holdings
                </span>
                <div>
                  <span className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white block leading-tight">
                    {holdingsCount}
                  </span>
                  <span className="text-sm md:text-[14px] text-slate-400 dark:text-slate-500 block mt-1 font-semibold">
                    Consolidated assets
                  </span>
                </div>
              </div>
            </div>

            {/* Portfolio Allocation */}
            <div className="bg-white dark:bg-[#0d0f17] border border-slate-200/80 dark:border-slate-855 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[140px]">
              <div className="flex flex-col justify-between h-full gap-y-4">
                <span className="block text-[13px] md:text-[14px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  📊 Allocation
                </span>
                <div>
                  <span className="text-2xl md:text-3xl font-extrabold text-indigo-650 dark:text-indigo-400 block leading-tight truncate" title={topCategoryName}>
                    {topCategoryName}
                  </span>
                  <span className="text-sm md:text-[14px] text-slate-400 dark:text-slate-500 block mt-1 font-semibold truncate">
                    {topCategoryPercent.toFixed(1)}% Top Class
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Category Filter Controls */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-[#0d0f17] p-4 border border-slate-202 dark:border-slate-850 rounded-2xl shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550 mr-2 flex items-center gap-1">
              <span className="text-xs">🔍</span> Categories:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {categoriesList.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                    selectedCategory === cat
                      ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/30 text-indigo-700 dark:text-indigo-400 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-405 hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 hover:text-indigo-650 dark:hover:text-indigo-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Consolidated Portfolio Main Card */}
          <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-855 rounded-2xl p-6 shadow-sm">
            {filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="text-3xl mb-3">🔍</span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">No assets in this category</h4>
                <p className="text-xs text-slate-405 dark:text-slate-555 max-w-xs font-semibold">
                  Try selecting another category or check your filter settings.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto w-full">
                  <table className="w-full border-collapse text-left text-xs font-semibold">
                    <thead className="bg-slate-50/50 dark:bg-slate-900/40 text-slate-405 dark:text-slate-550 text-[10px] font-bold uppercase tracking-wider border-b border-slate-150 dark:border-slate-855">
                      <tr>
                        <th className="px-4 py-3">Asset</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">App / Platform</th>
                        <th className="px-4 py-3">Started Date</th>
                        <th className="px-4 py-3">Age of Investment</th>
                        <th className="px-4 py-3 text-right">Overall Amount Invested</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium">
                      {filteredAssets.map(asset => (
                        <tr
                          key={asset.key}
                          className="hover:bg-slate-55/50 dark:hover:bg-slate-800/15 transition-colors animate-fade-in text-slate-700 dark:text-slate-300"
                        >
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white max-w-[200px] break-words">
                            {asset.assetName}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {asset.category}
                          </td>
                          <td className="px-4 py-3.5 max-w-[120px] break-words">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getAssetTypeBadgeStyle(asset.displayType)}`}>
                              {asset.displayType}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 max-w-[185px]">
                            {renderPlatformBadges(asset.platforms)}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {formatDate(asset.startedDate)}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap font-bold">
                            {asset.age}
                          </td>
                          <td className="px-4 py-3.5 text-right font-extrabold text-indigo-650 dark:text-indigo-400 whitespace-nowrap">
                            {formatCurrency(asset.overallAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List View */}
                <div className="md:hidden space-y-4">
                  {filteredAssets.map(asset => (
                    <div
                      key={asset.key}
                      className="bg-slate-50/50 dark:bg-slate-900/10 border border-slate-150 dark:border-slate-855 rounded-xl p-4 space-y-2.5 font-semibold text-[11px]"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white m-0 break-words">
                            {asset.assetName}
                          </h4>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-105 dark:border-slate-800 text-[10px]">
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Category</span>
                          <span className="font-bold text-slate-850 dark:text-slate-200">{asset.category}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Type</span>
                          <span className="font-bold text-slate-850 dark:text-slate-200">{asset.displayType}</span>
                        </div>
                        <div className="col-span-2 pt-1.5 border-t border-slate-105/50 dark:border-slate-800/50 mt-1">
                          <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-1">App / Platform</span>
                          <div className="block mt-0.5">
                            {renderPlatformBadges(asset.platforms)}
                          </div>
                        </div>
                        <div className="pt-1.5 border-t border-slate-105/50 dark:border-slate-800/50 mt-1">
                          <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Started Date</span>
                          <span className="font-bold text-slate-850 dark:text-slate-200">{formatDate(asset.startedDate)}</span>
                        </div>
                        <div className="text-right pt-1.5 border-t border-slate-105/50 dark:border-slate-800/50 mt-1">
                          <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Age</span>
                          <span className="font-bold text-indigo-650 dark:text-indigo-400">{asset.age}</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-105 dark:border-slate-800 flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Overall Invested</span>
                        <span className="font-extrabold text-slate-900 dark:text-white text-xs">{formatCurrency(asset.overallAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
