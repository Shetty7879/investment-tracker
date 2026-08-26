import React from 'react';
import { useApp } from '../contexts/AppContext';
import { usePortfolio } from '../hooks/usePortfolio';
import { getInvestmentAge } from '../utils/calculations';
import { getAssetTypeBadgeStyle } from '../utils/badgeStyles';
import { Wallet } from 'lucide-react';

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

export const Portfolio: React.FC = () => {
  const { formatCurrency } = useApp();
  const { holdings } = usePortfolio();
  const [selectedCategory, setSelectedCategory] = React.useState<string>('All');

  const consolidatedMap: Record<string, any[]> = {};
  holdings.forEach(h => {
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
              Consolidated view of your assets showing their age and overall amount invested.
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
                          <td className="px-4 py-3.5 max-w-[150px] break-words">
                            {asset.platforms}
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
                          <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">App / Platform</span>
                          <span className="font-bold text-slate-850 dark:text-slate-200 break-words block">{asset.platforms}</span>
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
