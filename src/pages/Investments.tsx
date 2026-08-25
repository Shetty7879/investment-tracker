import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { usePortfolio } from '../hooks/usePortfolio';
import type { Investment } from '../types';
import { InvestmentModal } from '../components/InvestmentModal';
import {
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { getAssetTypeBadgeStyle, getBrokerBadgeStyle } from '../utils/badgeStyles';

type SortOptionType =
  | 'latest-investment'
  | 'highest-value'
  | 'lowest-value'
  | 'alphabetical';

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

export const Investments: React.FC = () => {
  const {
    formatCurrency,
    deleteInvestment,
    showToast
  } = useApp();

  // State Management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

  // Filter & Sort States
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [sortOption, setSortOption] = useState<SortOptionType>('latest-investment');

  // Call shared portfolio calculations hook
  const { holdings } = usePortfolio();

  const handleEdit = (inv: Investment) => {
    setEditingInvestment(inv);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this investment? This action cannot be undone.')) {
      deleteInvestment(id);
      showToast('Investment deleted successfully!', 'success');
    }
  };

  const handleAddNew = () => {
    setEditingInvestment(null);
    setIsModalOpen(true);
  };

  // Filter holdings by type filter
  const filteredInvestments = holdings.filter(inv => {
    const mappedType = REVERSE_TYPE_MAPPING[inv.category] || REVERSE_TYPE_MAPPING[inv.assetType] || 'Other';
    const matchesType = typeFilter === 'All' || mappedType === typeFilter;
    return matchesType;
  });

  // Sort holdings
  const sortedInvestments = [...filteredInvestments].sort((a, b) => {
    switch (sortOption) {
      case 'highest-value':
        return (b.investedAmount ?? 0) - (a.investedAmount ?? 0);
      case 'lowest-value':
        return (a.investedAmount ?? 0) - (b.investedAmount ?? 0);
      case 'alphabetical':
        return a.assetName.localeCompare(b.assetName);
      case 'latest-investment':
      default:
        return new Date(b.buyDate || b.purchaseDate || 0).getTime() - new Date(a.buyDate || a.purchaseDate || 0).getTime();
    }
  });

  return (
    <div className="space-y-6 animate-slide-in pb-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white m-0">📈 Investments Portfolio</h2>
            <p className="text-sm text-slate-405 dark:text-slate-500 m-0 font-semibold">
              Track and manage your asset holdings and principal capital.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddNew}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Investment</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {holdings.length === 0 ? (
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[350px] animate-fade-in">
          <div className="h-16 w-16 rounded-full bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-880 flex items-center justify-center text-slate-405 dark:text-slate-500 mb-6">
            <Briefcase className="h-8 w-8" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            No investments tracked yet
          </h3>
          <p className="text-sm text-slate-405 dark:text-slate-555 max-w-sm mx-auto mb-8 leading-relaxed font-semibold">
            Start tracking your portfolio by adding your first investment.
          </p>

          <button
            onClick={handleAddNew}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-sm transition-all cursor-pointer shadow-md shadow-indigo-650/10 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Add Investment</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Filters & Sorters Controls */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-[#0d0f17] p-4 border border-slate-200 dark:border-slate-855 rounded-2xl shadow-sm">

            {/* Asset Type Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550 mr-2 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Categories
              </span>
              <div className="flex flex-wrap gap-1">
                {[
                  { label: 'All', value: 'All' },
                  { label: 'Stock', value: 'Stock' },
                  { label: 'ETF', value: 'ETF' },
                  { label: 'Mutual Fund', value: 'Mutual Fund' },
                  { label: 'IPO', value: 'IPO' },
                  { label: 'Digital Gold', value: 'Digital Gold' },
                  { label: 'Digital Silver', value: 'Digital Silver' },
                  { label: 'Digital Platinum', value: 'Digital Platinum' },
                  { label: 'Crypto', value: 'Crypto' },
                  { label: 'Fixed Deposit', value: 'Fixed Deposit' },
                  { label: 'Bond', value: 'Bond' },
                  { label: 'Other', value: 'Other' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTypeFilter(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                      typeFilter === opt.value
                        ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/30 text-indigo-700 dark:text-indigo-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 hover:text-indigo-650 dark:hover:text-indigo-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sorters and Global States */}
            <div className="flex flex-wrap items-center gap-3 font-semibold">

              {/* Sorter */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-405 dark:text-slate-555 flex items-center gap-1">
                  <ArrowUpDown className="h-3 w-3" /> Sort
                </span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOptionType)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2 px-3 text-xs font-bold outline-none focus:border-indigo-500 text-slate-950 dark:text-white dark:bg-[#0d0f17]"
                >
                  <option value="latest-investment">Latest Investment</option>
                  <option value="highest-value">Highest Invested</option>
                  <option value="lowest-value">Lowest Invested</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
              </div>

            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-left text-xs font-semibold">
                <thead className="bg-slate-50/50 dark:bg-slate-900/40 text-slate-405 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-150 dark:border-slate-855">
                  <tr>
                    <th className="px-6 py-4">Investment Name</th>
                    <th className="px-4 py-4">Type</th>
                    <th className="px-4 py-4">Broker / Platform</th>
                    <th className="px-4 py-4 text-right">Qty / Lots</th>
                    <th className="px-4 py-4 text-right">Price</th>
                    <th className="px-4 py-4 text-right">Invested Amount</th>
                    <th className="px-4 py-4 text-center">Status / Date</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium">
                  {sortedInvestments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-450 dark:text-slate-500">
                        No records match the active filter criteria.
                      </td>
                    </tr>
                  ) : (
                    sortedInvestments.map(inv => {
                      const isIPORow = inv.category === 'IPOs' || inv.assetType === 'IPOs';
                      const displayType = inv.category === 'Other' && inv.customAssetType
                        ? inv.customAssetType
                        : REVERSE_TYPE_MAPPING[inv.category] || REVERSE_TYPE_MAPPING[inv.assetType] || 'Other';
                      const brokerLabel = inv.broker === 'Other' && inv.customBroker
                        ? inv.customBroker
                        : inv.broker || 'Other';

                      // IPO-specific derived values
                      const ipoStatus = inv.allotmentStatus || (inv.ipoAllotmentStatus as string) || 'Applied';
                      const ipoAppliedLots = inv.appliedLots ?? inv.ipoLotsApplied ?? 0;
                      const ipoSharesPerLot = inv.sharesPerLot ?? 0;
                      const ipoAllotmentPrice = inv.ipoAllotmentPrice ?? inv.issuePrice ?? inv.buyPrice ?? 0;
                      const ipoAllottedLots = inv.allottedLots ?? 0;
                      const ipoInvested = ipoStatus === 'Allotted' && ipoAllottedLots > 0 && ipoSharesPerLot > 0
                        ? ipoAllottedLots * ipoSharesPerLot * ipoAllotmentPrice
                        : 0;

                      const ipoPriceLow = inv.priceLow;
                      const ipoPriceHigh = inv.priceHigh;
                      let ipoPriceDisplay = '';
                      if (ipoPriceLow && ipoPriceHigh) {
                        ipoPriceDisplay = ipoPriceLow === ipoPriceHigh
                          ? formatCurrency(ipoPriceLow)
                          : `${formatCurrency(ipoPriceLow)} – ${formatCurrency(ipoPriceHigh)}`;
                      } else {
                        ipoPriceDisplay = formatCurrency(ipoAllotmentPrice);
                      }
                      if (ipoStatus === 'Allotted') {
                        ipoPriceDisplay = `Allotted: ${formatCurrency(ipoAllotmentPrice)}`;
                      }

                      const ipoStatusColors: Record<string, string> = {
                        'Applied': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                        'Allotted': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                        'Not Allotted': 'bg-red-500/10 text-red-600 dark:text-red-400',
                        'Withdrawn': 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
                      };

                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/15 transition-colors"
                        >
                          {/* Name */}
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span>{inv.assetName}</span>
                                {inv.isDemo && (
                                  <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded">DEMO</span>
                                )}
                              </div>
                              {isIPORow && inv.companyName && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{inv.companyName}</span>
                              )}
                            </div>
                          </td>

                          {/* Type */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${getAssetTypeBadgeStyle(displayType)}`}>
                              {displayType}
                            </span>
                          </td>

                          {/* Broker */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${getBrokerBadgeStyle(brokerLabel)}`}>
                              {brokerLabel}
                            </span>
                          </td>

                          {/* Qty / Lots */}
                          <td className="px-4 py-4 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap font-bold">
                            {isIPORow
                              ? <span>{ipoAppliedLots} lot{ipoAppliedLots !== 1 ? 's' : ''}{ipoSharesPerLot > 0 ? ` × ${ipoSharesPerLot}` : ''}</span>
                              : inv.quantity
                            }
                          </td>

                          {/* Price */}
                          <td className="px-4 py-4 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap font-bold">
                            {isIPORow ? ipoPriceDisplay : formatCurrency(inv.buyPrice ?? 0)}
                          </td>

                          {/* Invested Amount */}
                          <td className="px-4 py-4 text-right font-extrabold whitespace-nowrap">
                            {isIPORow ? (
                              ipoStatus === 'Allotted' ? (
                                <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(ipoInvested)}</span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-600 font-semibold italic text-[10px]">Not counted</span>
                              )
                            ) : (
                              <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(inv.investedAmount)}</span>
                            )}
                          </td>

                          {/* Status / Date */}
                          <td className="px-4 py-4 text-center whitespace-nowrap">
                            {isIPORow ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${ipoStatusColors[ipoStatus] || 'bg-slate-500/10 text-slate-500'}`}>
                                  {ipoStatus}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {inv.applicationDate || inv.buyDate || '—'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {inv.buyDate || inv.purchaseDate || '—'}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-3">
                              <button
                                onClick={() => handleEdit(inv)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-slate-600 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:border-indigo-500/20 transition-all cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(inv.id)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-slate-600 dark:text-slate-400 hover:text-red-650 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 hover:border-red-500/20 transition-all cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Layout */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {sortedInvestments.length === 0 ? (
              <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 p-6 text-center text-slate-500 font-semibold rounded-2xl">
                No investments found matching criteria.
              </div>
            ) : (
              sortedInvestments.map(inv => {
                const isIPORow = inv.category === 'IPOs' || inv.assetType === 'IPOs';
                const displayType = inv.category === 'Other' && inv.customAssetType
                  ? inv.customAssetType
                  : REVERSE_TYPE_MAPPING[inv.category] || REVERSE_TYPE_MAPPING[inv.assetType] || 'Other';
                const brokerLabel = inv.broker === 'Other' && inv.customBroker
                  ? inv.customBroker
                  : inv.broker || 'Other';

                const ipoStatus = inv.allotmentStatus || (inv.ipoAllotmentStatus as string) || 'Applied';
                const ipoAppliedLots = inv.appliedLots ?? inv.ipoLotsApplied ?? 0;
                const ipoSharesPerLot = inv.sharesPerLot ?? 0;
                const ipoAllotmentPrice = inv.ipoAllotmentPrice ?? inv.issuePrice ?? inv.buyPrice ?? 0;
                const ipoAllottedLots = inv.allottedLots ?? 0;
                const ipoInvested = ipoStatus === 'Allotted' && ipoAllottedLots > 0 && ipoSharesPerLot > 0
                  ? ipoAllottedLots * ipoSharesPerLot * ipoAllotmentPrice
                  : 0;

                const ipoPriceLow = inv.priceLow;
                const ipoPriceHigh = inv.priceHigh;
                let ipoPriceDisplay = '';
                if (ipoPriceLow && ipoPriceHigh) {
                  ipoPriceDisplay = ipoPriceLow === ipoPriceHigh
                    ? formatCurrency(ipoPriceLow)
                    : `${formatCurrency(ipoPriceLow)} – ${formatCurrency(ipoPriceHigh)}`;
                } else {
                  ipoPriceDisplay = formatCurrency(ipoAllotmentPrice);
                }
                if (ipoStatus === 'Allotted') {
                  ipoPriceDisplay = `Allotted: ${formatCurrency(ipoAllotmentPrice)}`;
                }

                const ipoStatusColors: Record<string, string> = {
                  'Applied': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                  'Allotted': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                  'Not Allotted': 'bg-red-500/10 text-red-600 dark:text-red-400',
                  'Withdrawn': 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
                };

                return (
                  <div
                    key={inv.id}
                    className="bg-white dark:bg-[#0d0f17] border border-slate-205 dark:border-slate-850 p-5 rounded-2xl shadow-sm space-y-4 font-semibold text-xs text-slate-700 dark:text-slate-350 hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-200"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white m-0 flex items-center gap-1.5">
                          {inv.assetName}
                          {inv.isDemo && (
                            <span className="text-[8px] font-bold bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded">DEMO</span>
                          )}
                        </h4>
                        {isIPORow && inv.companyName && (
                          <p className="m-0 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{inv.companyName}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getAssetTypeBadgeStyle(displayType)}`}>
                            {displayType}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getBrokerBadgeStyle(brokerLabel)}`}>
                            {brokerLabel}
                          </span>
                          {isIPORow && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${ipoStatusColors[ipoStatus] || 'bg-slate-500/10 text-slate-500'}` }>
                              {ipoStatus}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1.5">
                        <button onClick={() => handleEdit(inv)} className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e111a] text-slate-600 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:border-indigo-500/20 transition-all cursor-pointer">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(inv.id)} className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e111a] text-slate-600 dark:text-slate-400 hover:text-red-650 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 hover:border-red-500/20 transition-all cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 border-t border-slate-100 dark:border-slate-850 pt-3.5">
                      {isIPORow ? (
                        <>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-0.5">📦 Applied Lots</span>
                            <span className="font-extrabold text-slate-900 dark:text-white">{ipoAppliedLots} lot{ipoAppliedLots !== 1 ? 's' : ''}{ipoSharesPerLot > 0 ? ` × ${ipoSharesPerLot} shares` : ''}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider mb-0.5">💰 Issue Price</span>
                            <span className="font-extrabold text-slate-900 dark:text-white">{ipoPriceDisplay}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-0.5">Invested Amount</span>
                            {ipoStatus === 'Allotted' ? (
                              <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{formatCurrency(ipoInvested)}</span>
                            ) : (
                              <span className="font-semibold text-slate-400 italic">Not counted</span>
                            )}
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider mb-0.5">📅 Application Date</span>
                            <span className="font-extrabold text-slate-900 dark:text-white">{inv.applicationDate || inv.buyDate || '—'}</span>
                          </div>
                          {ipoStatus === 'Allotted' && ipoAllottedLots > 0 && (
                            <div className="col-span-2">
                              <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-0.5">🎟️ Allotted Lots</span>
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{ipoAllottedLots} lot{ipoAllottedLots !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-0.5">
                              {inv.category === 'Mutual Funds' ? 'Units' : 'Quantity / Units'}
                            </span>
                            <span className="font-extrabold text-slate-900 dark:text-white">{inv.quantity}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-0.5">
                              {inv.category === 'Mutual Funds' ? 'NAV' : 'Buy Price / Price per Unit'}
                            </span>
                            <span className="font-extrabold text-slate-900 dark:text-white">{formatCurrency(inv.buyPrice ?? 0)}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-0.5">Invested Amount</span>
                            <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{formatCurrency(inv.investedAmount)}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider mb-0.5">Buy Date</span>
                            <span className="font-extrabold text-slate-900 dark:text-white">{inv.buyDate || inv.purchaseDate || '—'}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {inv.notes && (
                      <div className="border-t border-slate-100 dark:border-slate-850 pt-3.5">
                        <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider mb-0.5">Notes</span>
                        <p className="m-0 text-slate-500 dark:text-slate-400 font-medium text-xs leading-relaxed">{inv.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Edit/Add Modal */}
      <InvestmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        investmentToEdit={editingInvestment}
      />
    </div>
  );
};
