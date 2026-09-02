import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { usePortfolio } from '../hooks/usePortfolio';
import type { Investment } from '../types';
import { calculateTotalInvested, calculateMonthlyInvested, isDemoInvestment, isDemoTransaction } from '../services/portfolioCalculationService';
import { getConsolidatedHoldings, isHoldingActive } from '../utils/consolidation';
import type { ConsolidatedHolding } from '../utils/consolidation';
import { Wallet, History, PlusCircle, MinusCircle, Scissors, Edit2, Trash2 } from 'lucide-react';
import { getAssetTypeBadgeStyle } from '../utils/badgeStyles';
import { TransactionModal } from '../components/TransactionModal';
import { InvestmentModal } from '../components/InvestmentModal';
import { SplitModal } from '../components/SplitModal';
import { PlatformBadge } from '../components/PlatformBadge';
import { InlineDisclosureMenu } from '../components/ui/inline-disclosure-menu';
import { ContinuousPagination } from '../components/ui/continuous-pagination';

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
  const { formatCurrency, investments, transactions: allTransactions, marketPrices, dataTypeFilter, ownerFilter, deleteInvestment, deleteTransaction, showToast } = useApp();
  const { holdings } = usePortfolio();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Transactions State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<ConsolidatedHolding | null>(null);
  const [txModalMode, setTxModalMode] = useState<'BUY' | 'SELL'>('BUY');

  // Edit and Split modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [selectedSplitInvestment, setSelectedSplitInvestment] = useState<Investment | null>(null);

  // Investment Details Pagination State (10 per page)
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Separate Transaction Log Pagination State (10 transactions per page)
  const TX_ITEMS_PER_PAGE = 10;
  const [txCurrentPage, setTxCurrentPage] = useState<number>(1);

  // Reset investment page to 1 whenever category filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // Reset transaction page to 1 whenever selected holding changes
  useEffect(() => {
    setTxCurrentPage(1);
  }, [selectedHolding?.holdingKey]);

  // Consolidated Holdings
  const consolidatedHoldings = useMemo(() => {
    return getConsolidatedHoldings(holdings, allTransactions, marketPrices);
  }, [holdings, allTransactions, marketPrices]);

  // Active consolidated holdings
  const activeConsolidatedHoldings = useMemo(() => {
    return consolidatedHoldings.filter(isHoldingActive);
  }, [consolidatedHoldings]);

  // Sort: Oldest Started Date to Newest
  const sortedHoldings = useMemo(() => {
    return [...activeConsolidatedHoldings].sort((a, b) => {
      return new Date(a.startedDate).getTime() - new Date(b.startedDate).getTime();
    });
  }, [activeConsolidatedHoldings]);

  // Available categories
  const availableCategories = useMemo(() => {
    return Array.from(new Set(sortedHoldings.map(h => h.category))).sort();
  }, [sortedHoldings]);

  const categoriesList = ['All', ...availableCategories];

  // Filtered by selected category
  const filteredHoldings = useMemo(() => {
    return selectedCategory === 'All'
      ? sortedHoldings
      : sortedHoldings.filter(h => h.category === selectedCategory);
  }, [selectedCategory, sortedHoldings]);

  // Paginated Holdings (10 per page)
  const totalItems = filteredHoldings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  const paginatedHoldings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredHoldings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredHoldings, currentPage]);

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

  // Calculate summary values using the AUTHORITATIVE engine
  const filteredInvs = useMemo(() => {
    return investments.filter(inv => {
      const isDemo = isDemoInvestment(inv);
      if (dataTypeFilter === 'Real' && isDemo) return false;
      if (dataTypeFilter === 'Demo' && !isDemo) return false;
      if (ownerFilter !== 'All' && inv.owner !== ownerFilter) return false;
      return true;
    });
  }, [investments, dataTypeFilter, ownerFilter]);

  const filteredTxs = useMemo(() => {
    return allTransactions.filter(tx => {
      const isDemo = isDemoTransaction(tx, investments);
      if (dataTypeFilter === 'Real' && isDemo) return false;
      if (dataTypeFilter === 'Demo' && !isDemo) return false;
      const parent = investments.find(inv => inv.id === tx.investmentId);
      if (parent && ownerFilter !== 'All' && parent.owner !== ownerFilter) return false;
      return true;
    });
  }, [allTransactions, investments, dataTypeFilter, ownerFilter]);

  const totalInvested = calculateTotalInvested(filteredInvs, filteredTxs);
  const holdingsCount = activeConsolidatedHoldings.length;

  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const monthlyInvestedAmount = calculateMonthlyInvested(filteredTxs, filteredInvs, currentYear, currentMonthIdx);

  // Top category allocation
  const categoryAllocations: Record<string, number> = {};
  activeConsolidatedHoldings.forEach(h => {
    categoryAllocations[h.category] = (categoryAllocations[h.category] || 0) + (h.investedAmount ?? 0);
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
  };

  const handleEdit = (inv: Investment) => {
    setEditingInvestment(inv);
    setIsModalOpen(true);
  };

  const handleSplit = (inv: Investment) => {
    setSelectedSplitInvestment(inv);
    setIsSplitModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this investment? This action cannot be undone.')) {
      deleteInvestment(id);
      showToast('Investment deleted successfully!', 'success');
    }
  };

  return (
    <div className="space-y-6 animate-slide-in pb-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white m-0">💼 Portfolio Summary</h2>
            <p className="text-sm text-slate-405 dark:text-slate-500 m-0 font-semibold">Active investments and asset breakdown.</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Invested</span>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{formatCurrency(totalInvested)}</div>
          <p className="text-xs text-slate-400 font-semibold m-0">Across all active investments</p>
        </div>

        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Holdings</span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{holdingsCount}</div>
          <p className="text-xs text-slate-400 font-semibold m-0">Consolidated assets</p>
        </div>

        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invested This Month</span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(monthlyInvestedAmount)}</div>
          <p className="text-xs text-slate-400 font-semibold m-0">Current calendar month</p>
        </div>

        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Allocation</span>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white truncate">{topCategoryName}</div>
          <p className="text-xs text-indigo-500 font-bold m-0">{topCategoryPercent.toFixed(1)}% of total portfolio</p>
        </div>
      </div>

      {activeConsolidatedHoldings.length === 0 ? (
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-12 text-center shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No active portfolio holdings</h3>
          <p className="text-xs text-slate-400 font-semibold">Active investment holdings will appear here.</p>
        </div>
      ) : (
        <>
          {/* Category Tabs */}
          <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-4 shadow-sm flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550 mr-2 shrink-0">Filter Category:</span>
            <div className="flex items-center gap-1.5 shrink-0">
              {categoriesList.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Holdings Section */}
          <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-855 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white m-0">Investment Holdings</h3>
              <span className="text-xs font-bold text-slate-400">
                {filteredHoldings.length} holding{filteredHoldings.length !== 1 ? 's' : ''}
              </span>
            </div>

            {filteredHoldings.length === 0 ? (
              <div className="py-8 text-center text-slate-400 font-semibold text-xs">
                No holdings found for category: {selectedCategory}
              </div>
            ) : (
              <>
                {/* Desktop Holdings Table */}
                <div className="hidden md:block border border-slate-200 dark:border-slate-855 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse text-xs font-semibold">
                      <colgroup>
                        <col style={{ width: '220px' }} />
                        <col style={{ width: '130px' }} />
                        <col style={{ width: '130px' }} />
                        <col style={{ width: '140px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '130px' }} />
                        <col style={{ width: '110px' }} />
                        <col style={{ width: '100px' }} />
                      </colgroup>
                      <thead className="bg-slate-50/50 dark:bg-slate-900/40 text-slate-405 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-150 dark:border-slate-855">
                        <tr>
                          <th className="px-4 py-3.5">Asset</th>
                          <th className="px-3 py-3.5">Category</th>
                          <th className="px-3 py-3.5">Type</th>
                          <th className="px-3 py-3.5">App / Platform</th>
                          <th className="px-4 py-3.5 text-right">Invested Amount</th>
                          <th className="px-3 py-3.5 text-center">Started Date</th>
                          <th className="px-3 py-3.5 text-center">Age</th>
                          <th className="px-4 py-3.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium">
                        {paginatedHoldings.map(holding => {
                          const menuItems = [
                            { icon: <PlusCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />, label: "Buy", onClick: () => handleOpenBuy(holding) },
                            { icon: <MinusCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />, label: "Sell", onClick: () => handleOpenSell(holding) },
                            { icon: <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />, label: "View Transactions", onClick: () => handleOpenTransactions(holding) },
                            { icon: <Scissors className="h-4 w-4 text-amber-600 dark:text-amber-400" />, label: "Split", onClick: () => handleSplit(holding.primaryInvestment) },
                            { icon: <Edit2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />, label: "Edit", onClick: () => handleEdit(holding.primaryInvestment) }
                          ];
                          return (
                            <tr key={holding.holdingKey} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/15 transition-colors">
                              <td className="px-4 py-3 font-bold text-slate-900 dark:text-white max-w-[200px] truncate" title={holding.assetName}>
                                {holding.assetName}
                              </td>
                              <td className="px-3 py-3 text-slate-600 dark:text-slate-400">{holding.category}</td>
                              <td className="px-3 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getAssetTypeBadgeStyle(holding.displayType)}`}>
                                  {holding.displayType}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <PlatformBadge name={holding.broker} />
                              </td>
                              <td className="px-4 py-3 text-right font-extrabold text-indigo-600 dark:text-indigo-400">
                                {formatCurrency(holding.investedAmount)}
                              </td>
                              <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-400">{formatDate(holding.startedDate)}</td>
                              <td className="px-3 py-3 text-center font-bold text-indigo-650 dark:text-indigo-400">{holding.age}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleOpenTransactions(holding)}
                                    className="p-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
                                    title="View Transactions"
                                  >
                                    <History className="h-4 w-4" />
                                  </button>
                                  <InlineDisclosureMenu
                                    title="Investment Actions"
                                    ariaLabel={`Investment actions for ${holding.assetName}`}
                                    menuItems={menuItems}
                                    showDelete={true}
                                    onDelete={() => handleDelete(holding.primaryInvestment.id)}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards View */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {paginatedHoldings.map(holding => {
                    const menuItems = [
                      { icon: <PlusCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />, label: "Buy", onClick: () => handleOpenBuy(holding) },
                      { icon: <MinusCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />, label: "Sell", onClick: () => handleOpenSell(holding) },
                      { icon: <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />, label: "View Transactions", onClick: () => handleOpenTransactions(holding) },
                      { icon: <Scissors className="h-4 w-4 text-amber-600 dark:text-amber-400" />, label: "Split", onClick: () => handleSplit(holding.primaryInvestment) },
                      { icon: <Edit2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />, label: "Edit", onClick: () => handleEdit(holding.primaryInvestment) }
                    ];
                    return (
                      <div
                        key={holding.holdingKey}
                        className="bg-slate-50/50 dark:bg-slate-900/10 border border-slate-150 dark:border-slate-855 rounded-xl p-4 space-y-2.5 font-semibold text-[11px]"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white m-0 truncate" title={holding.assetName}>
                              {holding.assetName}
                            </h4>
                            <span className="text-[10px] text-slate-400">
                              {holding.txCount} transaction{holding.txCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-105 dark:border-slate-800 text-[10px]">
                          <div>
                            <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Category</span>
                            <span className="font-bold text-slate-850 dark:text-slate-200">{holding.category}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Type</span>
                            <span className="font-bold text-slate-850 dark:text-slate-200">{holding.displayType}</span>
                          </div>
                          <div className="col-span-2 pt-1.5 border-t border-slate-105/50 dark:border-slate-800/50 mt-1">
                            <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-1">App / Platform</span>
                            <div className="block mt-0.5">
                              <PlatformBadge name={holding.broker} />
                            </div>
                          </div>
                          <div className="pt-1.5 border-t border-slate-105/50 dark:border-slate-800/50 mt-1">
                            <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Started Date</span>
                            <span className="font-bold text-slate-850 dark:text-slate-200">{formatDate(holding.startedDate)}</span>
                          </div>
                          <div className="text-right pt-1.5 border-t border-slate-105/50 dark:border-slate-800/50 mt-1">
                            <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Age</span>
                            <span className="font-bold text-indigo-650 dark:text-indigo-400">{holding.age}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-105 dark:border-slate-800 flex justify-between items-center text-[10px]">
                          <button
                            onClick={() => handleOpenTransactions(holding)}
                            className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 text-[9px] hover:underline cursor-pointer"
                          >
                            <History className="h-3 w-3" /> View Transactions
                          </button>
                          <div className="flex items-center gap-3">
                            <span className="font-extrabold text-slate-900 dark:text-white text-xs">{formatCurrency(holding.investedAmount)}</span>
                            <InlineDisclosureMenu
                              title="Investment Actions"
                              ariaLabel={`Investment actions for ${holding.assetName}`}
                              menuItems={menuItems}
                              showDelete={true}
                              onDelete={() => handleDelete(holding.primaryInvestment.id)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
              </>
            )}
          </div>

          {/* Transaction Activity Log Section at the VERY END of Portfolio page */}
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
        </>
      )}

      {/* Edit/Add Investment Modal */}
      <InvestmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        investmentToEdit={editingInvestment}
      />

      {/* Split Modal */}
      <SplitModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        investment={selectedSplitInvestment}
      />

      {/* BUY / SELL Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        holding={selectedHolding}
        initialMode={txModalMode}
      />
    </div>
  );
};
