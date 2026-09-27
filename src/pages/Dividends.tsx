import React, { useState, useMemo, useEffect } from 'react';
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
  Filter,
  AlertCircle,
  PieChart
} from 'lucide-react';
import { AssetLogo } from '../components/AssetLogo';
import {
  calculateTotalDividendIncome,
  calculateMonthlyDividendIncome,
  calculateYearlyDividendIncome,
  calculateUpcomingDividends,
  calculateDividendYield,
  isRealizedDividendStatus
} from '../utils/calculations';
import { DividendModal } from '../components/DividendModal';
import { formatDisplayDate } from '../components/calendar-9';

export const Dividends: React.FC = () => {
  const {
    dividends,
    investments,
    deleteDividend,
    markDividendPaid,
    refreshDividendData,
    isRefreshingDividends,
    formatCurrency,
    marketPrices
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDividend, setEditingDividend] = useState<Dividend | null>(null);
  const [detailDividend, setDetailDividend] = useState<Dividend | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Auto discover dividends on load if empty
  useEffect(() => {
    if (investments.length > 0 && dividends.length === 0) {
      refreshDividendData().catch(() => {
        setDataError('Dividend data temporarily unavailable.');
      });
    }
  }, []);

  // Platform list from user's dividends + investments
  const platforms = useMemo(() => {
    const set = new Set<string>(['Dhan', 'Groww', 'Lemon', 'Univest', 'PhonePe', 'FamPay', 'Bank', 'Other']);
    dividends.forEach(d => {
      const p = d.platform || d.broker;
      if (p) set.add(p.toString());
    });
    investments.forEach(i => {
      if (i.broker) set.add(i.broker.toString());
    });
    return Array.from(set).sort();
  }, [dividends, investments]);

  // Real KPI calculations
  const totalNetIncome = useMemo(() => calculateTotalDividendIncome(dividends), [dividends]);
  const totalGrossIncome = useMemo(() => calculateTotalDividendIncome(dividends, { useGross: true }), [dividends]);
  const totalTaxPaid = Math.max(0, Math.round((totalGrossIncome - totalNetIncome) * 100) / 100);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const thisYearIncome = useMemo(() => calculateYearlyDividendIncome(dividends, currentYear), [dividends, currentYear]);
  const thisMonthIncome = useMemo(() => calculateMonthlyDividendIncome(dividends, currentYear, currentMonth), [dividends, currentYear, currentMonth]);
  const upcomingIncome = useMemo(() => calculateUpcomingDividends(dividends), [dividends]);

  // Total Portfolio Invested Amount & Current Valuation for Yield
  const totalInvestedAmount = useMemo(() => {
    return investments.reduce((sum, inv) => sum + (inv.investedAmount || (inv.quantity * inv.buyPrice) || 0), 0);
  }, [investments]);

  const totalCurrentValuation = useMemo(() => {
    return investments.reduce((sum, inv) => {
      const price = marketPrices[inv.symbol?.toUpperCase() || '']?.price ?? inv.currentPrice ?? inv.buyPrice ?? 0;
      return sum + (inv.currentValue || (inv.quantity * price) || 0);
    }, 0);
  }, [investments, marketPrices]);

  // Invested Yield vs Current Portfolio Yield
  const investedYield = useMemo(() => {
    return calculateDividendYield(thisYearIncome, totalInvestedAmount);
  }, [thisYearIncome, totalInvestedAmount]);

  const currentYield = useMemo(() => {
    return calculateDividendYield(thisYearIncome, totalCurrentValuation);
  }, [thisYearIncome, totalCurrentValuation]);

  // Upcoming & Declared Dividends Grid (Only officially declared future events with eligible quantity)
  const upcomingDividendsList = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const map = new Map<string, Dividend>();
    
    dividends.forEach(d => {
      const s = (d.status || '').toUpperCase();
      if ((s === 'UPCOMING' || s === 'DECLARED' || s === 'ELIGIBLE' || d.status === 'Upcoming' || d.status === 'Declared') && s !== 'NOT_ELIGIBLE') {
        const targetDate = d.paymentDate || d.payment_date || d.recordDate || d.record_date || d.dividendDate || d.ex_date;
        const qty = d.eligibleQuantity ?? d.quantity ?? 0;
        if (targetDate && targetDate >= today && qty > 0) {
          const eventKey = d.eventKey || `${(d.symbol || d.assetName || '').toUpperCase()}_${targetDate}_${d.dividendPerShare}`;
          if (!map.has(eventKey)) {
            map.set(eventKey, d);
          }
        }
      }
    });

    return Array.from(map.values());
  }, [dividends]);

  // Historical Yearly Breakdown
  const yearlyBreakdown = useMemo(() => {
    const yearsMap: Record<number, number> = {};
    dividends.forEach(d => {
      if (isRealizedDividendStatus(d.status)) {
        const dateStr = d.paymentDate || d.payment_date || d.dividendDate || d.ex_date;
        if (dateStr) {
          const y = new Date(dateStr).getFullYear();
          if (!isNaN(y)) {
            yearsMap[y] = (yearsMap[y] || 0) + (d.netDividend ?? d.net_amount ?? 0);
          }
        }
      }
    });

    return Object.entries(yearsMap)
      .map(([yr, amt]) => ({ year: parseInt(yr, 10), amount: amt }))
      .sort((a, b) => b.year - a.year);
  }, [dividends]);

  // Filtered Dividends List
  const filteredDividends = useMemo(() => {
    return dividends.filter(div => {
      const name = div.assetName || div.asset_name || '';
      const sym = div.symbol || '';
      const isinCode = div.isin || '';
      const brok = div.broker || div.platform || '';
      const stat = div.status || '';

      // Search
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchesName = name.toLowerCase().includes(q);
        const matchesSymbol = sym.toLowerCase().includes(q);
        const matchesIsin = isinCode.toLowerCase().includes(q);
        const matchesBroker = brok.toLowerCase().includes(q);
        const matchesStatus = stat.toLowerCase().includes(q);
        if (!matchesName && !matchesSymbol && !matchesIsin && !matchesBroker && !matchesStatus) {
          return false;
        }
      }

      // Platform filter
      if (platformFilter !== 'All' && brok !== platformFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Received' && (stat !== 'Received' && stat !== 'Paid')) return false;
        if (statusFilter === 'Paid' && (stat !== 'Paid' && stat !== 'Received')) return false;
        if (statusFilter !== 'Received' && statusFilter !== 'Paid' && stat !== statusFilter) return false;
      }

      return true;
    }).sort((a, b) => {
      const dA = new Date(a.dividendDate || a.ex_date || a.createdAt).getTime();
      const dB = new Date(b.dividendDate || b.ex_date || b.createdAt).getTime();
      return dB - dA;
    });
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

  const handleRefreshClick = () => {
    setDataError(null);
    refreshDividendData().catch(err => {
      console.error(err);
      setDataError('Unable to update dividend data automatically. Your recorded dividends are intact.');
    });
  };

  const getStatusBadge = (divStatus: DividendStatus) => {
    const s = (divStatus || '').toUpperCase();
    switch (s) {
      case 'RECEIVED':
      case 'PAID':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Received
          </span>
        );
      case 'UPCOMING':
      case 'ELIGIBLE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" /> Upcoming
          </span>
        );
      case 'DECLARED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Declared
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Pending
          </span>
        );
      case 'REINVESTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <RefreshCw className="w-3 h-3 mr-1" /> Reinvested
          </span>
        );
      case 'NOT_ELIGIBLE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            Not Eligible
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            {divStatus}
          </span>
        );
    }
  };

  const getSourceBadge = (source?: string, verified?: boolean) => {
    if (source === 'Official' || verified) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          Official Verified ✓
        </span>
      );
    }
    if (source === 'NSE/BSE') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
          NSE/BSE Verified ✓
        </span>
      );
    }
    if (source === 'Market Data') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
          Market Data Verified ✓
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
        Manual Not verified
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display tracking-tight uppercase m-0">
                DIVIDENDS MODULE
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 m-0 font-medium">
                Track dividend earnings, expected payouts, TDS tax deductions, and yields.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshingDividends}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition-all cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingDividends ? 'animate-spin text-emerald-500' : ''}`} />
            <span>{isRefreshingDividends ? 'Syncing...' : 'Refresh Dividend Data'}</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Dividend</span>
          </button>
        </div>
      </div>

      {/* Error / Data Status Banner if any */}
      {dataError && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{dataError}</span>
          </div>
          <button
            onClick={handleRefreshClick}
            className="text-[11px] underline hover:opacity-80 cursor-pointer"
          >
            Try Refreshing
          </button>
        </div>
      )}

      {/* KPI Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* TOTAL DIVIDENDS */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              TOTAL DIVIDENDS
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#10b981] dark:text-[#36E6B4] font-display tracking-tight">
              {formatCurrency(totalNetIncome)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-450 mt-1 flex justify-between">
              <span>Gross: {formatCurrency(totalGrossIncome)}</span>
              <span>TDS: {formatCurrency(totalTaxPaid)}</span>
            </div>
          </div>
        </div>

        {/* THIS YEAR */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              THIS YEAR ({currentYear})
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-indigo-650 dark:text-[#5CC8FF] font-display tracking-tight">
              {formatCurrency(thisYearIncome)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-450 mt-1">
              Received during {currentYear}
            </div>
          </div>
        </div>

        {/* THIS MONTH */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              THIS MONTH
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-purple-600 dark:text-[#B77CFF] font-display tracking-tight">
              {formatCurrency(thisMonthIncome)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-450 mt-1">
              Credit in current month
            </div>
          </div>
        </div>

        {/* UPCOMING */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              UPCOMING EXPECTED
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-amber-500 dark:text-[#FFC94A] font-display tracking-tight">
              {formatCurrency(upcomingIncome)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-450 mt-1">
              Declared & expected payouts
            </div>
          </div>
        </div>

      </div>

      {/* Dividend Yield Metrics & Annual Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dividend Yield Summary Card */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-500" />
              <span>Dividend Yield Analysis</span>
            </h3>
          </div>

          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Invested Capital Dividend Yield</span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{investedYield}%</span>
              </div>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 m-0">
                Annual Dividend ({formatCurrency(thisYearIncome)}) ÷ Invested Capital ({formatCurrency(totalInvestedAmount)}) × 100
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Portfolio Current Dividend Yield</span>
                <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">{currentYield}%</span>
              </div>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 m-0">
                Annual Dividend ({formatCurrency(thisYearIncome)}) ÷ Portfolio Valuation ({formatCurrency(totalCurrentValuation)}) × 100
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">Historical Yearly Dividend Income</div>
              {yearlyBreakdown.length === 0 ? (
                <div className="text-[11px] text-slate-400 italic">No historical income recorded yet</div>
              ) : (
                <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                  {yearlyBreakdown.map(yb => (
                    <div key={yb.year} className="flex justify-between items-center text-[11px]">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{yb.year}</span>
                      <span className="font-bold text-emerald-500">{formatCurrency(yb.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Dividends Section */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Upcoming Eligible Dividends ({upcomingDividendsList.length})</span>
            </h3>
            {upcomingDividendsList.length > 0 && (
              <span className="text-xs font-bold text-amber-500">
                Total Expected: {formatCurrency(upcomingIncome)}
              </span>
            )}
          </div>

          {upcomingDividendsList.length === 0 ? (
            <div className="py-6 text-center text-slate-400 dark:text-slate-550 text-xs font-semibold">
              No pending or upcoming dividend announcements for eligible holdings.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcomingDividendsList.map(item => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AssetLogo
                      name={item.assetName}
                      symbol={item.symbol}
                      isin={item.isin}
                      assetType="Stock"
                      logoUrl={(item as any).logoUrl || (item as any).logo_url}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white m-0 truncate">
                        {item.assetName}
                      </h4>
                      <span className="text-[10px] text-slate-450 dark:text-slate-500 block">
                        Record Date: {formatDisplayDate(item.recordDate || item.record_date || item.dividendDate)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                        {item.eligibleQuantity} shares @ {formatCurrency(item.dividendPerShare)}/share
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-amber-500 block">
                      {formatCurrency(item.netDividend || item.net_amount || (item.eligibleQuantity * item.dividendPerShare))}
                    </span>
                    <button
                      onClick={() => handleMarkPaid(item.id)}
                      className="mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Mark Received
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dividends by name, symbol, ISIN, platform, or status..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors font-medium"
            />
          </div>

          {/* Controls Right */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Platform Dropdown */}
            <div className="flex items-center space-x-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 rounded-xl">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="All" className="bg-white dark:bg-[#0d0f17]">All Platforms</option>
                {platforms.map(p => (
                  <option key={p} value={p} className="bg-white dark:bg-[#0d0f17]">{p}</option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center space-x-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 rounded-xl">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="All" className="bg-white dark:bg-[#0d0f17]">All Statuses</option>
                <option value="Received" className="bg-white dark:bg-[#0d0f17]">Received / Paid</option>
                <option value="Upcoming" className="bg-white dark:bg-[#0d0f17]">Upcoming</option>
                <option value="Declared" className="bg-white dark:bg-[#0d0f17]">Declared</option>
                <option value="Pending" className="bg-white dark:bg-[#0d0f17]">Pending</option>
                <option value="Reinvested" className="bg-white dark:bg-[#0d0f17]">Reinvested</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Dividends History Table */}
      <div className="rounded-2xl bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[850px] text-xs font-semibold">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-150 dark:border-slate-800 text-[10px] text-slate-405 dark:text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">DATE</th>
                <th className="py-3.5 px-4">ASSET</th>
                <th className="py-3.5 px-4">PLATFORM</th>
                <th className="py-3.5 px-4 text-right">QUANTITY</th>
                <th className="py-3.5 px-4 text-right">DIVIDEND / UNIT</th>
                <th className="py-3.5 px-4 text-right">GROSS</th>
                <th className="py-3.5 px-4 text-right">TDS</th>
                <th className="py-3.5 px-4 text-right">NET</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4 text-center">SOURCE</th>
                <th className="py-3.5 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
              {filteredDividends.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
                        <DollarSign className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {dividends.length === 0 ? 'No verified dividend records' : 'No matching dividend records found'}
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm m-0">
                        {dividends.length === 0
                          ? 'Sync your holdings or record your first verified dividend payout to track income and TDS.'
                          : 'Try clearing your search filters to view all dividend records.'}
                      </p>
                      <button
                        onClick={handleOpenAddModal}
                        className="mt-2 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center space-x-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Record Your Dividend</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDividends.map((div) => (
                  <tr
                    key={div.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    {/* DATE */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-350 whitespace-nowrap font-medium">
                      {formatDisplayDate(div.paymentDate || div.payment_date || div.dividendDate || div.ex_date)}
                    </td>

                    {/* ASSET */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <AssetLogo
                          name={div.assetName || div.asset_name}
                          symbol={div.symbol}
                          isin={div.isin}
                          assetType="Stock"
                          logoUrl={(div as any).logoUrl || (div as any).logo_url}
                          size="sm"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {div.assetName || div.asset_name}
                          </div>
                          {div.symbol && (
                            <div className="text-[10px] text-slate-400 font-mono uppercase">
                              {div.symbol}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* PLATFORM */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-350 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                        {div.broker || div.platform || 'Dhan'}
                      </span>
                    </td>

                    {/* QUANTITY */}
                    <td className="py-3.5 px-4 text-right text-slate-800 dark:text-slate-200 font-medium">
                      {div.eligibleQuantity || div.quantity || 1}
                    </td>

                    {/* DIVIDEND / UNIT */}
                    <td className="py-3.5 px-4 text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(div.dividendPerShare || div.dividend_per_share || 0)}
                    </td>

                    {/* GROSS */}
                    <td className="py-3.5 px-4 text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(div.grossDividend || div.gross_amount || 0)}
                    </td>

                    {/* TDS */}
                    <td className="py-3.5 px-4 text-right text-rose-500 font-medium">
                      {(div.tax || div.tds_amount || 0) > 0 ? `-${formatCurrency(div.tax || div.tds_amount || 0)}` : '₹0.00'}
                    </td>

                    {/* NET */}
                    <td className="py-3.5 px-4 text-right font-extrabold text-[#10b981] dark:text-[#36E6B4]">
                      {formatCurrency(div.netDividend || div.net_amount || 0)}
                    </td>

                    {/* STATUS */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(div.status)}
                    </td>

                    {/* SOURCE */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getSourceBadge(div.source, div.verified)}
                    </td>

                    {/* ACTIONS */}
                    <td className="py-3.5 px-4 text-center relative whitespace-nowrap">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === div.id ? null : div.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {openMenuId === div.id && (
                        <div
                          className="absolute right-4 top-10 z-30 w-44 bg-white dark:bg-[#1a2234] border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl py-1 text-left"
                          onMouseLeave={() => setOpenMenuId(null)}
                        >
                          {(div.status === 'Upcoming' || div.status === 'Declared' || div.status === 'Pending') && (
                            <button
                              onClick={() => handleMarkPaid(div.id)}
                              className="w-full flex items-center px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-semibold"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                              Mark Received
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setDetailDividend(div);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-semibold"
                          >
                            <Eye className="w-3.5 h-3.5 mr-2 text-blue-500" />
                            View Details
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(div)}
                            className="w-full flex items-center px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-semibold"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-2 text-amber-500" />
                            Edit Record
                          </button>

                          <button
                            onClick={() => handleDelete(div.id)}
                            className="w-full flex items-center px-3 py-2 text-xs text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-t border-slate-100 dark:border-slate-800 mt-1 pt-2 font-semibold"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 m-0">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                <span>Dividend Payout Details</span>
              </h3>
              <button
                onClick={() => setDetailDividend(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-semibold">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-450 dark:text-slate-400">Asset:</span>
                <span className="font-bold text-slate-900 dark:text-white">{detailDividend.assetName} {detailDividend.symbol ? `(${detailDividend.symbol})` : ''}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-450 dark:text-slate-400">Broker / Platform:</span>
                <span className="text-slate-700 dark:text-slate-200">{detailDividend.broker || detailDividend.platform || 'Dhan'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-450 dark:text-slate-400">Eligible Quantity:</span>
                <span className="font-bold text-slate-900 dark:text-white">{detailDividend.eligibleQuantity} shares/units</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-450 dark:text-slate-400">Dividend per Share:</span>
                <span className="text-slate-800 dark:text-white">{formatCurrency(detailDividend.dividendPerShare)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-450 dark:text-slate-400">Gross Dividend:</span>
                <span className="text-slate-900 dark:text-white font-bold">{formatCurrency(detailDividend.grossDividend)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-450 dark:text-slate-400">TDS / Tax Deducted:</span>
                <span className="text-rose-500">{formatCurrency(detailDividend.tax || 0)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-450 dark:text-slate-400">Net Received:</span>
                <span className="font-extrabold text-[#10b981] dark:text-[#36E6B4] text-sm">{formatCurrency(detailDividend.netDividend)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-450 dark:text-slate-400">Dividend / Ex Date:</span>
                <span className="text-slate-700 dark:text-slate-300">{formatDisplayDate(detailDividend.dividendDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-450 dark:text-slate-400">Payment / Credit Date:</span>
                <span className="text-slate-700 dark:text-slate-300">{formatDisplayDate(detailDividend.paymentDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-450 dark:text-slate-400">Status:</span>
                <div>{getStatusBadge(detailDividend.status)}</div>
              </div>
              {detailDividend.notes && (
                <div className="pt-1">
                  <span className="text-slate-450 dark:text-slate-400 block mb-1">Notes:</span>
                  <p className="p-2 rounded-lg bg-slate-100 dark:bg-[#171e2e] text-slate-700 dark:text-slate-300 italic">{detailDividend.notes}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDetailDividend(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold rounded-xl cursor-pointer"
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
