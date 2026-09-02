import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { usePortfolio } from '../hooks/usePortfolio';
import {
  isCommodityCategory,
  calculateTotalInvested,
  calculateMonthlyInvested,
  getEffectiveTransactions,
  getEffectiveTransactionCost,
  isDemoInvestment,
  isDemoTransaction
} from '../services/portfolioCalculationService';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line
} from 'recharts';
import {
  TrendingUp,
  Filter
} from 'lucide-react';

type DateFilterType = 'this-month' | '3-months' | '6-months' | '1-year' | 'all-time' | 'custom';

const monthNamesShort = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Safely parses YYYY-MM-DD or ISO date strings without timezone shifts.
 */
const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return { year: 2026, monthIdx: 0, day: 1, sortKey: '2026-01-01', monthKey: '2026-01' };
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length >= 3) {
    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const sortKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
    return { year, monthIdx, day, sortKey, monthKey };
  }
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const monthIdx = d.getMonth();
  const day = d.getDate();
  const sortKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
  return { year, monthIdx, day, sortKey, monthKey };
};

const normalizeAssetClass = (category: string | undefined): string => {
  if (!category) return 'Others';
  const clean = category.trim().toLowerCase();
  
  if (clean === 'stock' || clean === 'stocks') return 'Stocks';
  if (clean === 'etf' || clean === 'etfs') return 'ETFs';
  if (clean === 'mutual fund' || clean === 'mutual funds') return 'Mutual Funds';
  if (clean === 'fixed deposit' || clean === 'fixed deposits') return 'Fixed Deposits';
  if (clean === 'gold' || clean === 'digital gold') return 'Gold';
  if (clean === 'silver' || clean === 'digital silver') return 'Silver';
  if (clean === 'platinum' || clean === 'digital platinum') return 'Platinum';
  if (clean === 'savings/cash' || clean === 'savings' || clean === 'cash') return 'Savings/Cash';
  if (clean === 'ipo' || clean === 'ipos') return 'IPOs';
  if (clean === 'crypto' || clean === 'cryptocurrency') return 'Crypto';
  if (clean === 'bond' || clean === 'bonds') return 'Bonds';
  return 'Others';
};

export const Reports: React.FC = () => {
  const { formatCurrency, investments, transactions: allTransactions, dataTypeFilter, ownerFilter } = useApp();

  // Filter States
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all-time');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Call shared portfolio calculations hook
  const { holdings, portfolioTotal, transactions } = usePortfolio(
    dateFilter,
    dateFilter === 'custom' ? customStart : undefined,
    dateFilter === 'custom' ? customEnd : undefined
  );

  const { totalCurrent } = portfolioTotal;

  // Filter raw investments by data type and owner filter
  const filteredInvs = useMemo(() => {
    return investments.filter(inv => {
      const isDemo = isDemoInvestment(inv);
      if (dataTypeFilter === 'Real' && isDemo) return false;
      if (dataTypeFilter === 'Demo' && !isDemo) return false;
      if (ownerFilter !== 'All' && inv.owner !== ownerFilter) return false;
      return true;
    });
  }, [investments, dataTypeFilter, ownerFilter]);

  // Filter raw transactions by data type and owner filter
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

  // Central total invested calculation — 100% single source of truth
  const totalInvested = useMemo(() => {
    return calculateTotalInvested(filteredInvs, filteredTxs);
  }, [filteredInvs, filteredTxs]);

  const formatYAxis = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
    return `₹${value}`;
  };

  // Chart 1: Donut Asset Allocation (current value weights)
  const allocationMap: Record<string, number> = {};
  holdings.forEach(h => {
    if (h.category === 'IPOs' || h.assetType === 'IPOs') {
      const status = h.ipoAllotmentStatus || 'Applied';
      const isAllotted = status === 'Allotted' || status === 'Partially Allotted' || status === 'Listed' || status === 'Sold';
      if (!isAllotted) return;
    }

    const cat = normalizeAssetClass(h.category || h.assetType);
    const val = h.currentValue ?? h.investedAmount ?? 0;
    if (val > 0) {
      allocationMap[cat] = (allocationMap[cat] || 0) + val;
    }
  });

  const totalAllocationValue = Object.values(allocationMap).reduce((sum, v) => sum + v, 0);

  const pieData = Object.entries(allocationMap)
    .map(([name, value]) => {
      const pct = totalAllocationValue > 0 ? (value / totalAllocationValue) * 100 : 0;
      return {
        name,
        value: Math.round(value * 100) / 100,
        percentage: pct
      };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const ASSET_COLORS: Record<string, string> = {
    'Stocks': '#6366f1',
    'ETFs': '#06b6d4',
    'Mutual Funds': '#a855f7',
    'Fixed Deposits': '#10b981',
    'Gold': '#eab308',
    'Silver': '#64748b',
    'Platinum': '#94a3b8',
    'IPOs': '#f43f5e',
    'Savings/Cash': '#ec4899',
    'Crypto': '#f97316',
    'Bonds': '#3b82f6',
    'Others': '#838896',
  };
  const DEFAULT_COLOR = '#838896';

  // Chart 2: Monthly Investments history (Monthly Savings Growth)
  // Rebuilt using the central calculation service for 100% reconciliation
  const barChartData = useMemo(() => {
    const monthKeysSet = new Set<string>();

    filteredInvs.forEach(inv => {
      const parentTxs = filteredTxs.filter(t => t.investmentId === inv.id);
      const effTxs = getEffectiveTransactions(inv, parentTxs);
      effTxs.forEach(tx => {
        const txDate = tx.date || inv.buyDate || inv.purchaseDate || '2026-01-01';
        const { monthKey } = parseLocalDate(txDate);
        monthKeysSet.add(monthKey);
      });
    });

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthKeysSet.add(currentMonthKey);

    const sortedMonthKeys = Array.from(monthKeysSet).sort();

    return sortedMonthKeys.map(mKey => {
      const [yStr, mStr] = mKey.split('-');
      const year = parseInt(yStr, 10);
      const monthIdx = parseInt(mStr, 10) - 1;

      // Single source of truth calculation for monthly invested capital
      const amount = calculateMonthlyInvested(filteredTxs, filteredInvs, year, monthIdx);
      const label = `${monthNamesShort[monthIdx]} ${yStr.slice(-2)}`;

      return {
        name: label,
        amount: Math.round(amount * 100) / 100,
        sortKey: mKey
      };
    }).filter(item => item.amount > 0 || item.sortKey === currentMonthKey);
  }, [filteredInvs, filteredTxs]);

  // Chart 4: Cumulative portfolio growth curve
  // Rebuilt from actual transactions to reconcile 100% with Total Invested & Total Valuation
  const lineChartData = useMemo(() => {
    const dateMap: Record<string, { investedDelta: number }> = {};

    filteredInvs.forEach(inv => {
      const category = inv.category || inv.assetType || 'Stocks';
      if (category === 'IPOs') {
        const status = inv.ipoAllotmentStatus || inv.allotmentStatus || 'Applied';
        const isAllotted = ['Allotted', 'Partially Allotted', 'Listed', 'Sold'].includes(status);
        if (!isAllotted) return;
      }

      const parentTxs = filteredTxs.filter(t => t.investmentId === inv.id);
      const effTxs = getEffectiveTransactions(inv, parentTxs);

      effTxs.forEach(tx => {
        const txDate = tx.date || inv.buyDate || inv.purchaseDate || '2026-01-01';
        const { sortKey } = parseLocalDate(txDate);

        if (!dateMap[sortKey]) {
          dateMap[sortKey] = { investedDelta: 0 };
        }

        if (tx.type === 'BUY') {
          let cost = 0;
          if (isCommodityCategory(category)) {
            if (inv.investedAmount !== undefined && inv.investedAmount !== null && inv.investedAmount > 0) {
              const parsed = typeof inv.investedAmount === 'number' ? inv.investedAmount : parseFloat(inv.investedAmount as any);
              if (!isNaN(parsed) && isFinite(parsed)) cost = parsed;
            } else {
              cost = tx.price ?? 0;
            }
          } else {
            cost = getEffectiveTransactionCost(tx, inv);
          }
          dateMap[sortKey].investedDelta += cost;
        } else if (tx.type === 'SELL') {
          const soldCost = tx.quantity * (inv.buyPrice ?? tx.price ?? 0);
          dateMap[sortKey].investedDelta -= soldCost;
        }
      });
    });

    const sortedDates = Object.keys(dateMap).sort();
    if (sortedDates.length === 0) return [];

    const finalTotalInvested = calculateTotalInvested(filteredInvs, filteredTxs);
    const finalTotalCurrent = totalCurrent;

    let runningInvested = 0;

    return sortedDates.map(dKey => {
      const deltas = dateMap[dKey];
      runningInvested += deltas.investedDelta;

      const roundedInvested = Math.round(Math.max(0, runningInvested) * 100) / 100;
      // Current valuation curve reflects market ratio against invested capital
      const ratio = finalTotalInvested > 0 ? (roundedInvested / finalTotalInvested) : 1;
      const roundedCurrent = Math.round(finalTotalCurrent * ratio * 100) / 100;

      const { year, monthIdx, day } = parseLocalDate(dKey);
      const displayLabel = `${monthNamesShort[monthIdx]} ${day}, ${year}`;

      return {
        date: displayLabel,
        rawDate: dKey,
        Invested: roundedInvested,
        Current: roundedCurrent
      };
    });
  }, [filteredInvs, filteredTxs, totalCurrent]);

  // Development-time reconciliation assertion check
  if (import.meta.env?.DEV) {
    const finalInvestedOnChart = lineChartData.length > 0 ? lineChartData[lineChartData.length - 1].Invested : 0;
    if (lineChartData.length > 0 && Math.abs(totalInvested - finalInvestedOnChart) > 1) {
      console.warn(
        `[Reconciliation Assertion Failed] Total Invested (${totalInvested}) != Final Growth Curve Value (${finalInvestedOnChart})`
      );
    }

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyFromCentral = calculateMonthlyInvested(filteredTxs, filteredInvs, now.getFullYear(), now.getMonth());
    const monthlyFromChart = barChartData.find(b => b.sortKey === currentMonthKey)?.amount ?? 0;
    if (Math.abs(monthlyFromCentral - monthlyFromChart) > 1) {
      console.warn(
        `[Reconciliation Assertion Failed] Monthly Invested (${monthlyFromCentral}) != Chart Current Month (${monthlyFromChart})`
      );
    }
  }

  // Custom tooltips
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value, percentage } = payload[0].payload;
      return (
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-205 dark:border-slate-800 p-3 rounded-xl shadow-xl">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{name}</p>
          <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
            {formatCurrency(value)} <span className="text-xs font-semibold text-slate-405 dark:text-slate-500 ml-1">({percentage.toFixed(1)}%)</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-205 dark:border-slate-800 p-3 rounded-xl shadow-xl">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{payload[0].payload.name}</p>
          <p className="text-sm font-extrabold text-indigo-500 dark:text-indigo-400 mt-1">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-205 dark:border-slate-800 p-3 rounded-xl shadow-xl text-xs font-semibold">
          <p className="text-slate-400 uppercase tracking-wider mb-2 font-bold">{payload[0].payload.date}</p>
          <div className="space-y-1">
            <p className="text-slate-500 dark:text-slate-400 flex justify-between gap-4">
              <span>Invested:</span>
              <span className="font-bold">{formatCurrency(payload[0].value)}</span>
            </p>
            <p className="text-indigo-650 dark:text-indigo-400 flex justify-between gap-4">
              <span>Current Value:</span>
              <span className="font-extrabold">{formatCurrency(payload[1].value)}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-slide-in pb-8">
      {/* Title Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold m-0">📑 Performance Reports</h2>
            <p className="text-sm text-slate-405 dark:text-slate-500 m-0">
              Interactive financial growth analytics and asset evaluations.
            </p>
          </div>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#0d0f17] p-2 border border-slate-202 dark:border-slate-850 rounded-2xl shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550 px-2 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Date Filter:
          </span>
          <div className="flex flex-wrap gap-1">
            {[
              { label: 'All Time', value: 'all-time' },
              { label: 'This Month', value: 'this-month' },
              { label: '3 Months', value: '3-months' },
              { label: '6 Months', value: '6-months' },
              { label: '1 Year', value: '1-year' },
              { label: 'Custom', value: 'custom' }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setDateFilter(opt.value as DateFilterType)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  dateFilter === opt.value
                    ? 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-500/15'
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Date Inputs Picker */}
      {dateFilter === 'custom' && (
        <div className="grid grid-cols-2 gap-4 bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 p-4 rounded-2xl max-w-md animate-slide-in">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Start Date</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-1.5 px-3 text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase mb-1">End Date</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-1.5 px-3 text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* Overall Performance Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Capital Invested */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Capital Invested</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 block">
              {formatCurrency(totalInvested)}
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-550 mt-4 m-0 font-semibold">
            Total principal amount allocated across active investments.
          </p>
        </div>

        {/* Current Valuation */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Current Valuation</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 block">
              {formatCurrency(totalCurrent)}
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-550 mt-4 m-0 font-semibold">
            Real-time market value of current investment portfolio.
          </p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Donut asset class allocation */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">Asset Class Allocation</h3>
            <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">Current percentage allocation based on holdings valuation.</p>
          </div>

          <div className="h-60 w-full flex items-center justify-center my-4">
            {pieData.length === 0 ? (
              <p className="text-xs text-slate-405 dark:text-slate-500">No active assets to display class weights.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={ASSET_COLORS[entry.name] || DEFAULT_COLOR}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Color Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs border-t border-slate-50 dark:border-slate-850 pt-3">
            {pieData.map(entry => (
              <div key={entry.name} className="flex items-center justify-between font-semibold text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ASSET_COLORS[entry.name] || DEFAULT_COLOR }}
                  />
                  <span className="truncate">{entry.name}</span>
                </div>
                <span className="text-slate-405 dark:text-slate-500 ml-1 font-bold text-[10px]">
                  {entry.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly investments history bar chart */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">Monthly Savings Growth</h3>
            <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">Investment buy transaction amounts compiled chronologically.</p>
          </div>

          <div className="h-60 w-full my-4">
            {barChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">No monthly savings entries logged.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e2230" opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={formatYAxis} domain={[0, 'auto']} />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Portfolio Growth Curve Full Width */}
      <div className="w-full">
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">Portfolio Growth Curve</h3>
            <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">Valuation progression comparing capital cost vs current market size.</p>
          </div>

          <div className="h-72 w-full my-4">
            {lineChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-555">Add holdings or demo data to view line chart curve.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e2230" opacity={0.1} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={formatYAxis} domain={[0, 'auto']} />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Line type="monotone" dataKey="Invested" stroke="#64748b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Current" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Activity Summary Table */}
      <div className="bg-white dark:bg-[#0d0f17] border border-slate-250 dark:border-slate-850 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-855">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">Transaction Activity Log</h3>
          <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5 m-0 font-semibold">
            Chronological breakdown of asset purchases, sales, and transaction charges.
          </p>
        </div>
        <div className="overflow-x-auto w-full text-xs font-semibold">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-[9px] uppercase font-bold text-slate-405 dark:text-slate-500 border-b border-slate-150 dark:border-slate-850">
              <tr>
                <th className="px-6 py-3">Transaction Date</th>
                <th className="px-4 py-3">Asset Holding</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-center">Type</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Price per Unit</th>
                <th className="px-4 py-3 text-right">Charges</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-6 text-center text-slate-450 dark:text-slate-500">
                    No transactions matching date filters found.
                  </td>
                </tr>
              ) : (
                transactions
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((tx, idx) => {
                    const parent = holdings.find(h => h.id === tx.investmentId);
                    const title = parent ? parent.assetName : 'Holding Account';
                    const category = parent ? (parent.category || parent.assetType) : 'N/A';

                    return (
                      <tr key={tx.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{tx.date}</td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{title}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{category}</td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            tx.type === 'BUY'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : tx.type === 'SPLIT'
                                ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'
                                : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {tx.type === 'SPLIT' ? `SPLIT (${tx.ratio || '1:1'})` : tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {tx.type === 'SPLIT'
                            ? `${tx.oldQuantity} ➔ ${tx.newQuantity}`
                            : parent && isCommodityCategory(parent.category || parent.assetType) ? `${tx.quantity} g` : tx.quantity
                          }
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {tx.type === 'SPLIT'
                            ? `${formatCurrency(tx.oldPrice ?? 0)} ➔ ${formatCurrency(tx.newPrice ?? 0)}`
                            : parent && isCommodityCategory(parent.category || parent.assetType) ? `${formatCurrency(tx.price)}/g` : formatCurrency(tx.price)
                          }
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {tx.type === 'SPLIT' ? '—' : formatCurrency(tx.charges || 0)}
                        </td>
                        <td className="px-6 py-3 text-right font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                          {tx.type === 'SPLIT'
                            ? '—'
                            : formatCurrency(parent
                                ? getEffectiveTransactionCost(tx, parent)
                                : (tx.amount ?? (tx.quantity * tx.price))
                              )
                          }
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

