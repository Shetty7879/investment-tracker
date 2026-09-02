// Investments.tsx — Clean, responsive, 10 items/page, bottom Transaction Activity Log
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { usePortfolio } from '../hooks/usePortfolio';
import type { Investment } from '../types';
import { InvestmentModal } from '../components/InvestmentModal';
import { SplitModal } from '../components/SplitModal';
import { TransactionModal } from '../components/TransactionModal';
import { getConsolidatedHoldings, isHoldingActive } from '../utils/consolidation';
import type { ConsolidatedHolding } from '../utils/consolidation';
import {
  Briefcase,
  Plus,
  Edit2,
  Filter,
  ArrowUpDown,
  History,
  Building2,
  PlusCircle,
  MinusCircle,
  Scissors,
  Trash2
} from 'lucide-react';
import { PlatformBadge } from '../components/PlatformBadge';
import { getAssetTypeBadgeStyle } from '../utils/badgeStyles';
import { InlineDisclosureMenu } from '../components/ui/inline-disclosure-menu';
import { ContinuousPagination } from '../components/ui/continuous-pagination';

type SortOptionType =
  | 'latest-investment'
  | 'highest-value'
  | 'lowest-value'
  | 'alphabetical';

export const Investments: React.FC = () => {
  const {
    formatCurrency,
    deleteInvestment,
    deleteTransaction,
    showToast,
    transactions: allTransactions,
    marketPrices
  } = useApp();

  // Shared portfolio calculations
  const { holdings } = usePortfolio();

  // State Management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [selectedSplitInvestment, setSelectedSplitInvestment] = useState<Investment | null>(null);

  // Transactions State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<ConsolidatedHolding | null>(null);
  const [txModalMode, setTxModalMode] = useState<'BUY' | 'SELL'>('BUY');

  // Filter & Sort States
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [platformFilter, setPlatformFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');
  const [sortOption, setSortOption] = useState<SortOptionType>('latest-investment');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Investment Details Pagination State (10 records per page)
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Separate Transaction Log Pagination State (10 transactions per page)
  const TX_ITEMS_PER_PAGE = 10;
  const [txCurrentPage, setTxCurrentPage] = useState<number>(1);

  // Reset investment page to 1 whenever any filter/sort/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, platformFilter, statusFilter, typeFilter, sortOption]);

  // Reset transaction page to 1 whenever selected holding changes
  useEffect(() => {
    setTxCurrentPage(1);
  }, [selectedHolding?.holdingKey]);

  // Consolidated Holdings
  const consolidatedHoldings = useMemo(() => {
    return getConsolidatedHoldings(holdings, allTransactions, marketPrices);
  }, [holdings, allTransactions, marketPrices]);

  // Extract unique platforms for dropdown filter
  const availablePlatforms = useMemo(() => {
    const set = new Set<string>();
    consolidatedHoldings.forEach(h => {
      if (h.broker) set.add(h.broker);
    });
    return Array.from(set).sort();
  }, [consolidatedHoldings]);

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

  const handleSplit = (inv: Investment) => {
    setSelectedSplitInvestment(inv);
    setIsSplitModalOpen(true);
  };

  const handleOpenBuy = (holding: ConsolidatedHolding) => {
    setSelectedHolding(holding);
    setTxModalMode('BUY');
    setIsTxModalOpen(true);
  };

  const handleOpenSell = (holding: ConsolidatedHolding) => {
    setSelectedHolding(holding);
    setTxModalMode('SELL');
    setIsTxModalOpen(true);
  };

  const handleOpenTransactions = (holding: ConsolidatedHolding) => {
    setSelectedHolding(holding);
    setTxCurrentPage(1);
    // Select investment without opening a modal or scrolling
  };

  // Filter consolidated holdings
  const filteredHoldings = useMemo(() => {
    return consolidatedHoldings.filter(h => {
      if (statusFilter === 'active' && !isHoldingActive(h)) return false;
      if (typeFilter !== 'All' && h.displayType !== typeFilter) return false;
      if (platformFilter !== 'All' && h.broker !== platformFilter) return false;

      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const nameMatch = h.assetName.toLowerCase().includes(query);
        const symbolMatch = h.symbol ? h.symbol.toLowerCase().includes(query) : false;
        const brokerMatch = h.broker.toLowerCase().includes(query);
        if (!nameMatch && !symbolMatch && !brokerMatch) return false;
      }
      return true;
    });
  }, [consolidatedHoldings, statusFilter, typeFilter, platformFilter, searchQuery]);

  // Sort holdings
  const sortedHoldings = useMemo(() => {
    return [...filteredHoldings].sort((a, b) => {
      switch (sortOption) {
        case 'highest-value': return (b.investedAmount ?? 0) - (a.investedAmount ?? 0);
        case 'lowest-value': return (a.investedAmount ?? 0) - (b.investedAmount ?? 0);
        case 'alphabetical': return a.assetName.localeCompare(b.assetName);
        case 'latest-investment':
        default: return new Date(b.startedDate || 0).getTime() - new Date(a.startedDate || 0).getTime();
      }
    });
  }, [filteredHoldings, sortOption]);

  // Paginated Holdings (10 per page)
  const totalItems = sortedHoldings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  const paginatedHoldings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedHoldings.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedHoldings, currentPage]);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  // Paginated Transactions (10 per page)
  const totalTxItems = selectedHolding ? selectedHolding.transactions.length : 0;
  const txTotalPages = Math.max(1, Math.ceil(totalTxItems / TX_ITEMS_PER_PAGE));

  const paginatedTransactions = useMemo(() => {
    if (!selectedHolding) return [];
    const start = (txCurrentPage - 1) * TX_ITEMS_PER_PAGE;
    return selectedHolding.transactions.slice(start, start + TX_ITEMS_PER_PAGE);
  }, [selectedHolding, txCurrentPage]);

  const txStartItem = totalTxItems === 0 ? 0 : (txCurrentPage - 1) * TX_ITEMS_PER_PAGE + 1;
  const txEndItem = Math.min(txCurrentPage * TX_ITEMS_PER_PAGE, totalTxItems);

  return (
    <div className="space-y-6 animate-slide-in pb-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white m-0">📈 Investments Portfolio</h2>
            <p className="text-sm text-slate-405 dark:text-slate-500 m-0 font-semibold">Consolidated assets and transaction history.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleAddNew} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm hover:shadow transition-all cursor-pointer">
            <Plus className="h-4 w-4" /> <span>Add Investment</span>
          </button>
        </div>
      </div>

      {consolidatedHoldings.length === 0 ? (
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[350px]">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No investments tracked yet</h3>
          <p className="text-sm text-slate-405 dark:text-slate-555 max-w-sm mx-auto mb-8 font-semibold">Start tracking your portfolio by adding your first investment.</p>
          <button onClick={handleAddNew} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-sm cursor-pointer">
            <Plus className="h-4 w-4" /> <span>Add Investment</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Search & Sorter Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#0d0f17] p-4 border border-slate-200 dark:border-slate-855 rounded-2xl shadow-sm">
            {/* Search Input */}
            <div className="relative w-full md:w-80 font-semibold">
              <input
                type="text"
                placeholder="Search by asset name, symbol, or platform..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-xs font-bold outline-none focus:border-indigo-500 text-slate-950 dark:text-white dark:bg-[#0d0f17] placeholder-slate-400 dark:placeholder-slate-550"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-555 text-xs">🔍</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Platform Filter Dropdown */}
              <div className="flex items-center gap-2 font-semibold">
                <span className="text-[10px] uppercase font-bold text-slate-405 dark:text-slate-555 flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Platform
                </span>
                <select
                  value={platformFilter}
                  onChange={e => setPlatformFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2 px-3 text-xs font-bold outline-none focus:border-indigo-500 text-slate-950 dark:text-white dark:bg-[#0d0f17]"
                >
                  <option value="All">All Platforms</option>
                  {availablePlatforms.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    statusFilter === 'active'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All
                </button>
              </div>

              {/* Sorter */}
              <div className="flex items-center gap-2 font-semibold">
                <span className="text-[10px] uppercase font-bold text-slate-405 dark:text-slate-555 flex items-center gap-1">
                  <ArrowUpDown className="h-3 w-3" /> Sort
                </span>
                <select
                  value={sortOption}
                  onChange={e => setSortOption(e.target.value as SortOptionType)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2 px-3 text-xs font-bold outline-none focus:border-indigo-500 text-slate-950 dark:text-white dark:bg-[#0d0f17]"
                >
                  <option value="latest-investment">Latest Transaction</option>
                  <option value="highest-value">Highest Invested</option>
                  <option value="lowest-value">Lowest Invested</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Filters */}
          <div className="bg-white dark:bg-[#0d0f17] p-4 border border-slate-200 dark:border-slate-855 rounded-2xl shadow-sm flex flex-wrap items-center gap-1.5">
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
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-405 hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 hover:text-indigo-650 dark:hover:text-indigo-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-left text-xs font-semibold">
                <colgroup>
                  <col style={{ width: '230px' }} />
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '90px' }} />
                </colgroup>
                <thead className="bg-slate-50/50 dark:bg-slate-900/40 text-slate-405 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-150 dark:border-slate-855">
                  <tr>
                    <th className="px-6 py-4">Asset</th>
                    <th className="px-4 py-4">Category</th>
                    <th className="px-4 py-4">Type</th>
                    <th className="px-4 py-4">App / Platform</th>
                    <th className="px-4 py-4 text-right">Quantity / Units</th>
                    <th className="px-4 py-4 text-right">Avg Purchase Price</th>
                    <th className="px-4 py-4 text-right">Total Invested</th>
                    <th className="px-4 py-4 text-center">Started Date</th>
                    <th className="px-4 py-4 text-center">Age</th>
                    <th className="px-4 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium">
                  {totalItems === 0 ? (
                    <tr><td colSpan={10} className="px-6 py-8 text-center text-slate-450 dark:text-slate-555">No consolidated holdings match the active filters.</td></tr>
                  ) : (
                    paginatedHoldings.map(holding => {
                      const menuItems = [
                        { icon: <PlusCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />, label: "Buy", onClick: () => handleOpenBuy(holding) },
                        { icon: <MinusCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />, label: "Sell", onClick: () => handleOpenSell(holding) },
                        { icon: <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />, label: "View Transactions", onClick: () => handleOpenTransactions(holding) },
                        { icon: <Scissors className="h-4 w-4 text-amber-600 dark:text-amber-400" />, label: "Split", onClick: () => handleSplit(holding.primaryInvestment) },
                        { icon: <Edit2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />, label: "Edit", onClick: () => handleEdit(holding.primaryInvestment) }
                      ];
                      return (
                        <tr key={holding.holdingKey} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/15 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white max-w-[200px] overflow-hidden text-ellipsis" title={holding.assetName}>{holding.assetName}</td>
                          <td className="px-4 py-3">{holding.category}</td>
                          <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getAssetTypeBadgeStyle(holding.displayType)}`}>{holding.displayType}</span></td>
                          <td className="px-4 py-3"><PlatformBadge name={holding.broker} /></td>
                          <td className="px-4 py-3 text-right">{holding.currentQuantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(holding.averageBuyPrice)}</td>
                          <td className="px-4 py-3 text-right font-extrabold text-indigo-600 dark:text-indigo-400">{formatCurrency(holding.investedAmount)}</td>
                          <td className="px-4 py-3 text-center">{holding.startedDate}</td>
                          <td className="px-4 py-3 text-center">{holding.age}</td>
                          <td className="px-4 py-3 text-center">
                            <InlineDisclosureMenu title="Investment Actions" ariaLabel={`Investment actions for ${holding.assetName}`} menuItems={menuItems} showDelete={true} onDelete={() => handleDelete(holding.primaryInvestment.id)} />
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
            {totalItems === 0 ? (
              <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 p-6 text-center text-slate-500 font-semibold rounded-2xl">
                No consolidated holdings found matching criteria.
              </div>
            ) : (
              paginatedHoldings.map(holding => {
                const menuItems = [
                  { icon: <PlusCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />, label: "Buy", onClick: () => handleOpenBuy(holding) },
                  { icon: <MinusCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />, label: "Sell", onClick: () => handleOpenSell(holding) },
                  { icon: <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />, label: "View Transactions", onClick: () => handleOpenTransactions(holding) },
                  { icon: <Scissors className="h-4 w-4 text-amber-600 dark:text-amber-400" />, label: "Split", onClick: () => handleSplit(holding.primaryInvestment) },
                  { icon: <Edit2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />, label: "Edit", onClick: () => handleEdit(holding.primaryInvestment) }
                ];
                return (
                  <div key={holding.holdingKey} className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-4 space-y-3.5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm m-0 line-clamp-1">{holding.assetName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getAssetTypeBadgeStyle(holding.displayType)}`}>{holding.displayType}</span>
                          <PlatformBadge name={holding.broker} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleOpenBuy(holding)} className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px]">+ BUY</button>
                        <button onClick={() => handleOpenSell(holding)} className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px]">SELL</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3.5 border-t border-slate-100 dark:border-slate-850 pt-3.5">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Units</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">{holding.currentQuantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Avg Purchase NAV</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">{formatCurrency(holding.averageBuyPrice)}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Invested</span>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{formatCurrency(holding.investedAmount)}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Started Date</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">{holding.startedDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-3">
                      <button onClick={() => handleOpenTransactions(holding)} className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 hover:underline cursor-pointer">
                        <History className="h-3.5 w-3.5" />
                        <span>{holding.txCount} Transaction{holding.txCount !== 1 ? 's' : ''}</span>
                      </button>
                      <InlineDisclosureMenu title="Investment Actions" menuItems={menuItems} showDelete={true} onDelete={() => handleDelete(holding.primaryInvestment.id)} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls BELOW Table & Cards */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#0d0f17] p-4 border border-slate-200 dark:border-slate-855 rounded-2xl shadow-sm">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Showing <strong className="text-slate-900 dark:text-white font-extrabold">{startItem}–{endItem}</strong> of <strong className="text-slate-900 dark:text-white font-extrabold">{totalItems}</strong>
              </div>

              {totalPages > 1 && (
                <ContinuousPagination
                  totalPages={totalPages}
                  value={currentPage}
                  onChange={(page) => setCurrentPage(page)}
                />
              )}
            </div>
          )}

          {/* Transaction Activity Log Section at the VERY END of the page */}
          <div id="transactions-section" className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl shadow-sm p-6 space-y-4">
            {!selectedHolding ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 font-semibold text-xs">
                No investment selected. Click View Transactions on any investment to view its transaction history.
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 dark:border-slate-855 pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white m-0 flex items-center gap-2">
                      <History className="h-5 w-5 text-indigo-500" />
                      <span>Transaction Activity Log</span>
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        — {selectedHolding.assetName}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 m-0 mt-1 font-semibold">
                      {`${selectedHolding.displayType} · ${selectedHolding.broker} (${selectedHolding.txCount} transaction${selectedHolding.txCount !== 1 ? 's' : ''})`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenBuy(selectedHolding)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer shadow-sm"
                    >
                      + BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenSell(selectedHolding)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all cursor-pointer shadow-sm"
                    >
                      SELL
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedHolding(null)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold text-xs transition-all cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>

                {selectedHolding.transactions.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 dark:text-slate-555 font-semibold text-xs">
                    No transactions recorded for {selectedHolding.assetName}.
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-855 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse text-xs">
                        <colgroup>
                          <col style={{ width: '130px' }} />
                          <col style={{ width: '100px' }} />
                          <col style={{ width: '140px' }} />
                          <col style={{ width: '140px' }} />
                          <col style={{ width: '150px' }} />
                          <col style={{ width: '110px' }} />
                          <col style={{ width: '90px' }} />
                        </colgroup>
                        <thead className="bg-slate-50/50 dark:bg-slate-900/40 text-slate-405 dark:text-slate-500 text-[9px] font-bold uppercase tracking-wider border-b border-slate-150 dark:border-slate-855">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-3 py-3">Type</th>
                            <th className="px-3 py-3 text-right">Quantity / Units</th>
                            <th className="px-3 py-3 text-right">Price / NAV</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-3 py-3 text-right">Charges</th>
                            <th className="px-4 py-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium">
                          {paginatedTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                              <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">{tx.date || '—'}</td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] ${
                                  tx.type === 'BUY'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    : tx.type === 'SELL'
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                }`}>
                                  {tx.type}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                {tx.quantity?.toLocaleString(undefined, { maximumFractionDigits: 4 }) || 0}
                              </td>
                              <td className="px-3 py-3 text-right font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {formatCurrency(tx.price || 0)}
                              </td>
                              <td className="px-4 py-3 text-right font-extrabold whitespace-nowrap">
                                <span className={tx.type === 'BUY' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                  {formatCurrency(tx.amount || (tx.quantity * tx.price))}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right text-slate-500 dark:text-slate-400 whitespace-nowrap font-semibold">
                                {tx.charges ? formatCurrency(tx.charges) : '₹0'}
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (window.confirm('Are you sure you want to delete this transaction record?')) {
                                      deleteTransaction(tx.id);
                                      showToast('Transaction deleted successfully.', 'info');
                                    }
                                  }}
                                  className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                                  title="Delete Transaction"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Transaction Activity Log Pagination Bar */}
                    {totalTxItems > 0 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/40 p-4 border-t border-slate-150 dark:border-slate-855">
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Showing <strong className="text-slate-900 dark:text-white font-extrabold">{txStartItem}–{txEndItem}</strong> of <strong className="text-slate-900 dark:text-white font-extrabold">{totalTxItems}</strong>
                        </div>

                        {txTotalPages > 1 && (
                          <ContinuousPagination
                            totalPages={txTotalPages}
                            value={txCurrentPage}
                            onChange={(page) => setTxCurrentPage(page)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <InvestmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        investmentToEdit={editingInvestment}
      />

      <SplitModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        investment={selectedSplitInvestment}
      />

      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        holding={selectedHolding}
        initialMode={txModalMode}
      />
    </div>
  );
};
