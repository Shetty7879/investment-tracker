import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import type { Dividend, DividendStatus } from '../types';
import {
  DollarSign,
  Plus,
  Search,
  MoreVertical,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Eye,
  TrendingUp,
  Building2,
  RefreshCw,
  Filter
} from 'lucide-react';
import {
  calculateTotalDividendIncome,
  calculateMonthlyDividendIncome,
  calculateYearlyDividendIncome,
  calculateUpcomingDividends,
  calculateDividendYield
} from '../utils/calculations';
import { DividendModal } from '../components/DividendModal';
import { formatDisplayDate } from '../components/calendar-9';

export const Dividends: React.FC = () => {
  const { dividends, investments, deleteDividend, markDividendPaid } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDividend, setEditingDividend] = useState<Dividend | null>(null);
  const [detailDividend, setDetailDividend] = useState<Dividend | null>(null);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Platform list
  const platforms = useMemo(() => {
    const set = new Set<string>();
    dividends.forEach(d => {
      if (d.broker) set.add(d.broker);
    });
    return Array.from(set);
  }, [dividends]);

  // Overall statistics
  const totalNetIncome = useMemo(() => calculateTotalDividendIncome(dividends), [dividends]);
  const totalGrossIncome = useMemo(() => calculateTotalDividendIncome(dividends, { useGross: true }), [dividends]);
  const totalTaxPaid = Math.max(0, Math.round((totalGrossIncome - totalNetIncome) * 100) / 100);
  const thisYearIncome = useMemo(() => calculateYearlyDividendIncome(dividends), [dividends]);
  const thisMonthIncome = useMemo(() => calculateMonthlyDividendIncome(dividends), [dividends]);
  const upcomingIncome = useMemo(() => calculateUpcomingDividends(dividends), [dividends]);

  // Total portfolio invested amount for yield estimation
  const totalInvestedAmount = useMemo(() => {
    return investments.reduce((sum, inv) => sum + (inv.investedAmount || 0), 0);
  }, [investments]);

  const estimatedYield = useMemo(() => {
    return calculateDividendYield(thisYearIncome, totalInvestedAmount);
  }, [thisYearIncome, totalInvestedAmount]);

  // Filtered Dividends List
  const filteredDividends = useMemo(() => {
    return dividends.filter(div => {
      // Search
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const matchesName = div.assetName.toLowerCase().includes(query);
        const matchesSymbol = (div.symbol || '').toLowerCase().includes(query);
        const matchesBroker = (div.broker || '').toLowerCase().includes(query);
        if (!matchesName && !matchesSymbol && !matchesBroker) return false;
      }

      // Platform filter
      if (platformFilter !== 'All' && div.broker !== platformFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'All' && div.status !== statusFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => new Date(b.dividendDate).getTime() - new Date(a.dividendDate).getTime());
  }, [dividends, searchQuery, platformFilter, statusFilter]);

  const handleOpenAddModal = () => {
    setEditingDividend(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (div: Dividend) => {
    setEditingDividend(div);
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this dividend record?')) {
      deleteDividend(id);
      setOpenMenuId(null);
    }
  };

  const handleMarkPaid = (id: string) => {
    markDividendPaid(id);
    setOpenMenuId(null);
  };

  const getStatusBadge = (divStatus: DividendStatus) => {
    switch (divStatus) {
      case 'Paid':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
          </span>
        );
      case 'Upcoming':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" /> Upcoming
          </span>
        );
      case 'Declared':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Declared
          </span>
        );
      case 'Reinvested':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <RefreshCw className="w-3 h-3 mr-1" /> Reinvested
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-800 text-gray-400">
            {divStatus}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk'] tracking-tight uppercase">
                DIVIDENDS
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Track your dividend income separately from invested capital.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Dividend</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* TOTAL DIVIDENDS */}
        <div className="p-5 rounded-2xl bg-[#121824] border border-gray-800 hover:border-gray-700/60 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-['Space_Grotesk']">
              TOTAL DIVIDENDS
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#36E6B4] font-['Space_Grotesk'] tracking-tight">
              ₹{totalNetIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
              <span>Gross: ₹{totalGrossIncome.toLocaleString('en-IN')}</span>
              <span>TDS: ₹{totalTaxPaid.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* THIS YEAR */}
        <div className="p-5 rounded-2xl bg-[#121824] border border-gray-800 hover:border-gray-700/60 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-['Space_Grotesk']">
              THIS YEAR ({new Date().getFullYear()})
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-[#5CC8FF]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#5CC8FF] font-['Space_Grotesk'] tracking-tight">
              ₹{thisYearIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Est. Yield: <span className="text-cyan-300 font-semibold">{estimatedYield}%</span> of portfolio
            </div>
          </div>
        </div>

        {/* THIS MONTH */}
        <div className="p-5 rounded-2xl bg-[#121824] border border-gray-800 hover:border-gray-700/60 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-['Space_Grotesk']">
              THIS MONTH
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-[#FFC94A]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#FFC94A] font-['Space_Grotesk'] tracking-tight">
              ₹{thisMonthIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Received in {new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* UPCOMING */}
        <div className="p-5 rounded-2xl bg-[#121824] border border-gray-800 hover:border-gray-700/60 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-['Space_Grotesk']">
              UPCOMING
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-[#B77CFF]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#B77CFF] font-['Space_Grotesk'] tracking-tight">
              ₹{upcomingIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Declared & pending credit
            </div>
          </div>
        </div>

      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#121824] border border-gray-800 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dividends..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#171e2e] border border-gray-700/60 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Controls Right */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Platform Dropdown */}
            <div className="flex items-center space-x-1.5 px-3 py-2 bg-[#171e2e] border border-gray-700/60 rounded-xl">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="All" className="bg-[#171e2e]">All Platforms ▼</option>
                {platforms.map(p => (
                  <option key={p} value={p} className="bg-[#171e2e]">{p}</option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center space-x-1.5 px-3 py-2 bg-[#171e2e] border border-gray-700/60 rounded-xl">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="All" className="bg-[#171e2e]">All Status ▼</option>
                <option value="Paid" className="bg-[#171e2e]">Paid</option>
                <option value="Upcoming" className="bg-[#171e2e]">Upcoming</option>
                <option value="Declared" className="bg-[#171e2e]">Declared</option>
                <option value="Reinvested" className="bg-[#171e2e]">Reinvested</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Dividends History Table */}
      <div className="rounded-2xl bg-[#121824] border border-gray-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#171e2e] border-b border-gray-800 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">DATE</th>
                <th className="py-3.5 px-4">ASSET</th>
                <th className="py-3.5 px-4">PLATFORM</th>
                <th className="py-3.5 px-4 text-right">QUANTITY</th>
                <th className="py-3.5 px-4 text-right">DIVIDEND / UNIT</th>
                <th className="py-3.5 px-4 text-right">GROSS</th>
                <th className="py-3.5 px-4 text-right">TDS</th>
                <th className="py-3.5 px-4 text-right">NET</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-xs">
              {filteredDividends.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400">
                        <DollarSign className="w-8 h-8" />
                      </div>
                      <p className="text-base font-bold text-white font-['Space_Grotesk']">
                        No dividend records yet
                      </p>
                      <p className="text-xs text-gray-400 max-w-sm">
                        {searchQuery || statusFilter !== 'All' || platformFilter !== 'All'
                          ? 'No dividend payouts match your search filters.'
                          : 'Record your dividend payouts to track gross/net income, TDS, and yield.'}
                      </p>
                      <button
                        onClick={handleOpenAddModal}
                        className="mt-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center space-x-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Record Your First Dividend</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDividends.map((div) => (
                  <tr
                    key={div.id}
                    className="hover:bg-[#171e2e]/50 transition-colors"
                  >
                    {/* DATE */}
                    <td className="py-3.5 px-4 text-gray-300 whitespace-nowrap font-medium">
                      {formatDisplayDate(div.paymentDate || div.dividendDate)}
                    </td>

                    {/* ASSET */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-white">
                        {div.assetName}
                      </div>
                      {div.symbol && (
                        <div className="text-[10px] text-gray-400 font-mono uppercase">
                          {div.symbol}
                        </div>
                      )}
                    </td>

                    {/* PLATFORM */}
                    <td className="py-3.5 px-4 text-gray-300 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-[11px]">
                        {div.broker || 'Broker'}
                      </span>
                    </td>

                    {/* QUANTITY */}
                    <td className="py-3.5 px-4 text-right text-gray-200 font-['Space_Grotesk'] font-medium">
                      {div.eligibleQuantity}
                    </td>

                    {/* DIVIDEND / UNIT */}
                    <td className="py-3.5 px-4 text-right text-gray-300 font-['Space_Grotesk']">
                      ₹{div.dividendPerShare.toFixed(2)}
                    </td>

                    {/* GROSS */}
                    <td className="py-3.5 px-4 text-right text-gray-300 font-['Space_Grotesk']">
                      ₹{div.grossDividend.toFixed(2)}
                    </td>

                    {/* TDS */}
                    <td className="py-3.5 px-4 text-right text-red-400 font-['Space_Grotesk']">
                      {div.tax > 0 ? `-₹${div.tax.toFixed(2)}` : '₹0.00'}
                    </td>

                    {/* NET */}
                    <td className="py-3.5 px-4 text-right font-bold text-[#36E6B4] font-['Space_Grotesk']">
                      ₹{div.netDividend.toFixed(2)}
                    </td>

                    {/* STATUS */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(div.status)}
                    </td>

                    {/* ACTIONS */}
                    <td className="py-3.5 px-4 text-center relative whitespace-nowrap">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === div.id ? null : div.id)}
                        className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {openMenuId === div.id && (
                        <div
                          className="absolute right-4 top-10 z-30 w-44 bg-[#1a2234] border border-gray-700/80 rounded-xl shadow-xl py-1 text-left"
                          onMouseLeave={() => setOpenMenuId(null)}
                        >
                          {(div.status === 'Upcoming' || div.status === 'Declared') && (
                            <button
                              onClick={() => handleMarkPaid(div.id)}
                              className="w-full flex items-center px-3 py-2 text-xs text-emerald-400 hover:bg-gray-800 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                              Mark as Paid
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setDetailDividend(div);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center px-3 py-2 text-xs text-gray-200 hover:bg-gray-800 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 mr-2 text-blue-400" />
                            View Details
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(div)}
                            className="w-full flex items-center px-3 py-2 text-xs text-gray-200 hover:bg-gray-800 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-2 text-amber-400" />
                            Edit Record
                          </button>

                          <button
                            onClick={() => handleDelete(div.id)}
                            className="w-full flex items-center px-3 py-2 text-xs text-red-400 hover:bg-gray-800 transition-colors border-t border-gray-800 mt-1 pt-2"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dividend Modal */}
      <DividendModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dividendToEdit={editingDividend}
      />

      {/* View Detail Modal */}
      {detailDividend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#121824] border border-gray-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold text-white font-['Space_Grotesk'] flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span>Dividend Payout Details</span>
              </h3>
              <button
                onClick={() => setDetailDividend(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-400">Asset:</span>
                <span className="font-semibold text-white">{detailDividend.assetName} {detailDividend.symbol ? `(${detailDividend.symbol})` : ''}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-400">Broker / Platform:</span>
                <span className="text-gray-200">{detailDividend.broker || 'Broker'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-400">Eligible Quantity:</span>
                <span className="font-medium text-white">{detailDividend.eligibleQuantity} shares/units</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-400">Dividend per Share:</span>
                <span className="text-white">₹{detailDividend.dividendPerShare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-400">Gross Dividend:</span>
                <span className="text-white font-medium">₹{detailDividend.grossDividend.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-400">TDS / Tax Deducted:</span>
                <span className="text-red-400">₹{detailDividend.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-400">Net Received:</span>
                <span className="font-bold text-[#36E6B4] text-sm">₹{detailDividend.netDividend.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-400">Dividend / Ex Date:</span>
                <span className="text-gray-300">{formatDisplayDate(detailDividend.dividendDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-400">Payment / Credit Date:</span>
                <span className="text-gray-300">{formatDisplayDate(detailDividend.paymentDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span className="text-gray-400">Status:</span>
                <div>{getStatusBadge(detailDividend.status)}</div>
              </div>
              {detailDividend.notes && (
                <div className="pt-1">
                  <span className="text-gray-400 block mb-1">Notes:</span>
                  <p className="p-2 rounded-lg bg-[#171e2e] text-gray-300 italic">{detailDividend.notes}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDetailDividend(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
