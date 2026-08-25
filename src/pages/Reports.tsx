import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { usePortfolio } from '../hooks/usePortfolio';
import { getMutualFundTransactionMetrics } from '../utils/calculations';
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
  ArrowUpRight,
  ArrowDownRight,
  Filter
} from 'lucide-react';

type DateFilterType = 'this-month' | '3-months' | '6-months' | '1-year' | 'all-time' | 'custom';

export const Reports: React.FC = () => {
  const { formatCurrency } = useApp();

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

  const {
    totalInvested,
    totalCurrent,
    unrealizedPL,
    realizedPL,
    totalPL,
    overallReturnPercentage
  } = portfolioTotal;

  const isProfit = totalPL >= 0;

  const assetPerformances = holdings
    .map(h => ({
      id: h.id,
      name: h.assetName,
      type: h.category || h.assetType,
      invested: h.investedAmount ?? 0,
      current: h.currentValue ?? 0,
      profitLoss: h.profitLoss ?? 0,
      returnPercent: h.returnPercent ?? 0
    }))
    .filter(item => item.invested > 0);

  // Sort performers
  const bestPerformer = assetPerformances.length > 0
    ? [...assetPerformances].sort((a, b) => (b.returnPercent ?? 0) - (a.returnPercent ?? 0))[0]
    : null;

  const worstPerformer = assetPerformances.length > 0
    ? [...assetPerformances].sort((a, b) => (a.returnPercent ?? 0) - (b.returnPercent ?? 0))[0]
    : null;

  // Chart 1: Donut Asset Allocation (current value weights)
  const allocationMap = holdings.reduce((acc, h) => {
    const cat = h.category || h.assetType;
    acc[cat] = (acc[cat] || 0) + (h.currentValue ?? 0);
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(allocationMap)
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100
    }))
    .filter(item => item.value > 0);

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
  };
  const DEFAULT_COLOR = '#838896';

  // Chart 2: Monthly Investments history (past months contributions)
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Group BUY transactions by month/year chronologically
  const monthlySumMap: Record<string, { label: string; amount: number; sortKey: string }> = {};
  transactions.forEach(tx => {
    if (tx.type !== 'BUY') return;
    const pDate = new Date(tx.date);
    if (isNaN(pDate.getTime())) return;

    // Refund safety
    const parent = holdings.find(h => h.id === tx.investmentId);
    if (parent && parent.category === 'IPOs') {
      const status = parent.ipoAllotmentStatus || 'Applied';
      const isAllotted = status === 'Allotted' || status === 'Partially Allotted' || status === 'Listed' || status === 'Sold';
      if (!isAllotted) return;
    }

    const metrics = parent ? getMutualFundTransactionMetrics(tx, parent) : { quantity: tx.quantity, price: tx.price, amount: tx.quantity * tx.price };

    const mLabel = `${monthNames[pDate.getMonth()]} ${pDate.getFullYear().toString().slice(-2)}`;
    const sortKey = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlySumMap[sortKey]) {
      monthlySumMap[sortKey] = { label: mLabel, amount: 0, sortKey };
    }
    monthlySumMap[sortKey].amount += (metrics.amount + tx.charges);
  });

  const barChartData = Object.values(monthlySumMap)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(item => ({
      name: item.label,
      amount: Math.round(item.amount * 100) / 100
    }));

  // Chart 3: Profit/Loss by Asset Class
  const plMap = holdings.reduce((acc, h) => {
    if (h.category === 'IPOs') {
      const status = h.ipoAllotmentStatus || 'Applied';
      const isAllotted = status === 'Allotted' || status === 'Partially Allotted' || status === 'Listed' || status === 'Sold';
      if (!isAllotted) return acc;
    }
    const cat = h.category || h.assetType;
    acc[cat] = (acc[cat] || 0) + h.totalPL;
    return acc;
  }, {} as Record<string, number>);

  const plChartData = Object.entries(plMap).map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100
  }));

  // Chart 4: Cumulative value over time
  // Sort transactions chronologically
  const sortedTxs = [...transactions]
    .filter(tx => !isNaN(new Date(tx.date).getTime()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Group and compute cumulative values
  const dateTotalsMap: Record<string, { investedDelta: number; currentDelta: number }> = {};
  sortedTxs.forEach(tx => {
    const dateKey = tx.date;
    if (!dateTotalsMap[dateKey]) {
      dateTotalsMap[dateKey] = { investedDelta: 0, currentDelta: 0 };
    }
    const parent = holdings.find(h => h.id === tx.investmentId);
    if (parent && parent.category === 'IPOs') {
      const status = parent.ipoAllotmentStatus || 'Applied';
      const isAllotted = status === 'Allotted' || status === 'Partially Allotted' || status === 'Listed' || status === 'Sold';
      if (!isAllotted) return;
    }

    const metrics = parent ? getMutualFundTransactionMetrics(tx, parent) : { quantity: tx.quantity, price: tx.price, amount: tx.quantity * tx.price };

    if (tx.type === 'BUY') {
      const cost = metrics.amount + tx.charges;
      dateTotalsMap[dateKey].investedDelta += cost;
      dateTotalsMap[dateKey].currentDelta += cost;
    } else if (tx.type === 'SELL') {
      const soldCost = tx.quantity * (parent?.buyPrice || metrics.price);
      dateTotalsMap[dateKey].investedDelta -= soldCost;
      dateTotalsMap[dateKey].currentDelta -= metrics.amount;
    }
  });

  let runningInvested = 0;
  let runningCurrent = 0;
  const lineChartData = Object.entries(dateTotalsMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, values]) => {
      runningInvested += values.investedDelta;
      runningCurrent += values.currentDelta;
      const currentVal = Math.max(0, runningCurrent);
      const investedVal = Math.max(0, runningInvested);

      return {
        date,
        Invested: Math.round(investedVal * 100) / 100,
        Current: Math.round(currentVal * 100) / 100
      };
    });

  // Custom tooltips
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-205 dark:border-slate-800 p-3 rounded-xl shadow-xl">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{payload[0].name}</p>
          <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
            {formatCurrency(payload[0].value)}
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

  const CustomPLTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      return (
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-205 dark:border-slate-800 p-3 rounded-xl shadow-xl">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{payload[0].payload.name}</p>
          <p className={`text-sm font-extrabold mt-1 ${val >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {val >= 0 ? '+' : ''}{formatCurrency(val)}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Core metrics summary */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-6 shadow-sm flex flex-col justify-between md:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Portfolio Valuation Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-semibold">
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400">Total Capital Invested</span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white mt-1 block">
                {formatCurrency(totalInvested)}
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400">Current Valuation</span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white mt-1 block">
                {formatCurrency(totalCurrent)}
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400">Return Percentage</span>
              <span className={`text-lg font-extrabold mt-1 block ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isProfit ? '+' : ''}{overallReturnPercentage.toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400">Unrealized P/L</span>
              <span className={`text-md font-bold mt-1 block ${unrealizedPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {unrealizedPL >= 0 ? '+' : ''}{formatCurrency(unrealizedPL)}
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400">Realized P/L (Sales)</span>
              <span className={`text-md font-bold mt-1 block ${realizedPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {realizedPL >= 0 ? '+' : ''}{formatCurrency(realizedPL)}
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400">Combined Net Earnings</span>
              <span className={`text-md font-extrabold mt-1 block ${totalPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {totalPL >= 0 ? '+' : ''}{formatCurrency(totalPL)}
              </span>
            </div>
          </div>
        </div>

        {/* Performers Card widget */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Performers Spotlight</h3>
          <div className="space-y-4 text-xs font-semibold">
            {bestPerformer ? (
              <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-850 pb-3">
                <div className="space-y-1">
                  <span className="block text-[8px] uppercase tracking-widest text-slate-400">Top Performer</span>
                  <span className="text-slate-900 dark:text-white font-bold block">{bestPerformer.name}</span>
                  <span className="text-[9px] text-slate-450 uppercase">{bestPerformer.type}</span>
                </div>
                <div className="text-right text-emerald-500 font-extrabold text-sm">
                  <div className="flex items-center justify-end gap-0.5">
                    <ArrowUpRight className="h-4 w-4" />
                    <span>+{bestPerformer.returnPercent.toFixed(1)}%</span>
                  </div>
                  <span className="text-[10px] block font-semibold mt-0.5">+{formatCurrency(bestPerformer.profitLoss)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 py-3">No asset performance stats.</div>
            )}

            {worstPerformer ? (
              <div className="flex items-center justify-between pt-1">
                <div className="space-y-1">
                  <span className="block text-[8px] uppercase tracking-widest text-slate-400">Underperformer</span>
                  <span className="text-slate-900 dark:text-white font-bold block">{worstPerformer.name}</span>
                  <span className="text-[9px] text-slate-450 uppercase">{worstPerformer.type}</span>
                </div>
                <div className="text-right text-rose-500 font-extrabold text-sm">
                  <div className="flex items-center justify-end gap-0.5">
                    <ArrowDownRight className="h-4 w-4" />
                    <span>{worstPerformer.returnPercent.toFixed(1)}%</span>
                  </div>
                  <span className="text-[10px] block font-semibold mt-0.5">{formatCurrency(worstPerformer.profitLoss)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 py-3">No underperforming data.</div>
            )}
          </div>
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
          <div className="grid grid-cols-3 gap-2 text-xs border-t border-slate-50 dark:border-slate-850 pt-3">
            {pieData.map(entry => (
              <div key={entry.name} className="flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: ASSET_COLORS[entry.name] || DEFAULT_COLOR }}
                />
                <span className="truncate">{entry.name}</span>
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
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e2230" opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Cumulative Performance Line Chart & Profit/Loss chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Cumulative performance over time */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">Portfolio Growth Curve</h3>
            <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">Valuation progression comparing capital cost vs current market size.</p>
          </div>

          <div className="h-64 w-full my-4">
            {lineChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-555">Add holdings or demo data to view line chart curve.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e2230" opacity={0.1} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Line type="monotone" dataKey="Invested" stroke="#64748b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Current" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Profit/Loss by asset category */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">Profit & Loss by Category</h3>
            <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">Asset class level net earnings (Realized + Unrealized).</p>
          </div>

          <div className="h-64 w-full my-4">
            {plChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">No profit logs available to graph.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={plChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e2230" opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip content={<CustomPLTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {plChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.value >= 0 ? '#10b981' : '#f43f5e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Transaction Activity Summary Table */}
      <div className="bg-white dark:bg-[#0d0f17] border border-slate-250 dark:border-slate-850 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-850">
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
                            tx.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{tx.quantity}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatCurrency(tx.price)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatCurrency(tx.charges || 0)}</td>
                        <td className="px-6 py-3 text-right font-extrabold text-slate-900 dark:text-white whitespace-nowrap font-extrabold">
                          {formatCurrency(parent ? (getMutualFundTransactionMetrics(tx, parent).amount) : (tx.quantity * tx.price))}
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
