import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { usePortfolio } from '../hooks/usePortfolio';
import { DatePickerField } from '../components/calendar-9';
import { AssetLogo } from '../components/AssetLogo';
import {
  isCommodityCategory,
  calculateTotalInvested,
  calculateMonthlyInvested,
  getEffectiveTransactions,
  getEffectiveTransactionCost,
  isDemoInvestment,
  isDemoTransaction
} from '../services/portfolioCalculationService';
import { getPortfolioValuation } from '../services/portfolioValuationService';
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
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { HistoricalPriceProvider } from '../services/historicalPriceService';
import { generatePortfolioSnapshots, type PortfolioSnapshot } from '../services/portfolioSnapshotService';


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

export const normalizeAssetClass = (category: string | undefined): string => {
  if (!category) return 'Others';
  const clean = category.trim().toLowerCase();

  if (clean === 'stock' || clean === 'stocks' || clean === 'equity' || clean === 'shares') return 'Stocks';
  if (clean === 'etf' || clean === 'etfs') return 'ETFs';
  if (clean === 'mutual fund' || clean === 'mutual funds' || clean === 'mf') return 'Mutual Funds';
  if (clean === 'fixed deposit' || clean === 'fixed deposits') return 'Fixed Deposits';
  if (clean === 'gold' || clean === 'digital gold' || clean === 'sovereign gold bond' || clean === 'gold bond' || clean === 'sgb') return 'Gold';
  if (clean === 'silver' || clean === 'digital silver' || clean === 'physical silver') return 'Silver';
  if (clean === 'platinum' || clean === 'digital platinum') return 'Platinum';
  if (clean === 'savings/cash' || clean === 'savings' || clean === 'cash') return 'Savings/Cash';
  if (clean === 'ipo' || clean === 'ipos') return 'IPOs';
  if (clean === 'crypto' || clean === 'cryptocurrency') return 'Crypto';
  if (clean === 'bond' || clean === 'bonds') return 'Bonds';
  return 'Others';
};

export const Reports: React.FC = () => {
  const { formatCurrency, investments, transactions: allTransactions, marketPrices, dataTypeFilter, ownerFilter } = useApp();

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

  // Single Valuation Engine: Portfolio Summary & Asset Class Allocation
  const portfolioValSummary = useMemo(() => {
    return getPortfolioValuation(filteredInvs, filteredTxs, marketPrices, ownerFilter);
  }, [filteredInvs, filteredTxs, marketPrices, ownerFilter]);

  /*
    if (h.category === 'IPOs' || h.assetType === 'IPOs') {
      const status = h.ipoAllotmentStatus || 'Applied';
      const isAllotted = status === 'Allotted' || status === 'Partially Allotted' || status === 'Listed' || status === 'Sold';
      if (!isAllotted) return;
    }

    const cat = normalizeAssetClass(h.category || h.assetType);
    if (!['Stocks', 'Mutual Funds', 'ETFs', 'Gold', 'Silver', 'Platinum'].includes(cat)) return;
    const parentTxs = filteredTxs.filter(t => t.investmentId === h.id);
    const valResult = calculateHoldingMarketValue(h, parentTxs, marketPrices);
    const val = valResult.marketValue ?? 0;
    if (val > 0) {
      allocationMap[cat] = (allocationMap[cat] || 0) + val;
    }
  */







  const pieData = portfolioValSummary.allocations;
  /*
    .map(name => {
      const value = allocationMap[name] || 0;
      const pct = totalAllocationValue > 0 ? (value / totalAllocationValue) * 100 : 0;
      return {
        name,
        value: Math.round(value * 100) / 100,
        percentage: pct
      };
    })
    .filter(item => DESIRED_ORDER.includes(item.name) || item.value > 0)
    .sort((a, b) => {
      const order = ['Stocks', 'Mutual Funds', 'ETFs', 'Gold', 'Silver', 'Platinum'];
      const idxA = order.indexOf(a.name);
      const idxB = order.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return b.value - a.value;
    }); */

  // Diagnostic Table Debug Output (Requirement 13)
  React.useEffect(() => {
    console.log('========== DIAGNOSTIC PORTFOLIO VALUATION TABLE ==========');
    portfolioValSummary.holdingsValuation.forEach(hv => {
      console.log(
        `Asset Name: ${hv.assetName} | Type: ${hv.assetType} | Qty: ${hv.quantity} | Ticker/ISIN: ${hv.yahooSymbol || hv.symbol || 'N/A'} | Price: ₹${hv.currentPrice ?? 'N/A'} | Source: ${hv.valuationSource} | Market Value: ₹${hv.marketValue ?? 'UNPRICED'} | Status: ${hv.isValued ? 'VALUED' : 'UNVALUED'}`
      );
    });

    console.log('========== ASSET CLASS TOTALS ==========');
    console.log(`STOCKS TOTAL: ₹${(portfolioValSummary.assetClassTotals['Stocks'] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    console.log(`MUTUAL FUNDS TOTAL: ₹${(portfolioValSummary.assetClassTotals['Mutual Funds'] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    console.log(`ETF TOTAL: ₹${(portfolioValSummary.assetClassTotals['ETFs'] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    console.log(`GOLD TOTAL: ₹${(portfolioValSummary.assetClassTotals['Gold'] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    console.log(`SILVER TOTAL: ₹${(portfolioValSummary.assetClassTotals['Silver'] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    console.log(`PLATINUM TOTAL: ₹${(portfolioValSummary.assetClassTotals['Platinum'] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    console.log(`TOTAL PORTFOLIO: ₹${portfolioValSummary.totalMarketValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);

    console.log('========== ALLOCATION ==========');
    portfolioValSummary.allocations.forEach(item => {
      console.log(`${item.name}: ${item.percentage.toFixed(1)}% (₹${item.value.toLocaleString('en-IN')})`);
    });
  }, [portfolioValSummary]);

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

  // Growth Curve states
  const [growthRange, setGrowthRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('ALL');
  const [reconciliationMode, setReconciliationMode] = useState<'Auto' | 'Transactions' | 'Market Data' | 'Snapshots'>('Auto');
  const [historicalPricesCache, setHistoricalPricesCache] = useState<Record<string, Record<string, number>>>({});
  const [isHistoricalPricesLoading, setIsHistoricalPricesLoading] = useState(false);
  const [showDebugBreakdown, setShowDebugBreakdown] = useState(false);

  // Compute earliest start date dynamically across active investments & transactions
  const earliestStartDate = useMemo(() => {
    const dates: string[] = [];
    filteredInvs.forEach(inv => {
      const d = inv.buyDate || inv.purchaseDate;
      if (d) dates.push(d.split('T')[0]);
    });
    filteredTxs.forEach(tx => {
      if (tx.date) dates.push(tx.date.split('T')[0]);
    });
    if (dates.length === 0) return '2024-01-01';
    dates.sort();
    return dates[0];
  }, [filteredInvs, filteredTxs]);

  // Asynchronously fetch historical market prices for active holdings starting from earliestStartDate
  React.useEffect(() => {
    let isSubscribed = true;
    const loadPrices = async () => {
      setIsHistoricalPricesLoading(true);
      try {
        const eligibleHoldings = filteredInvs.map(inv => ({
          symbol: inv.symbol,
          category: (inv.category || inv.assetType || 'Stocks') as any
        }));
        const startDate = earliestStartDate;
        const endDate = new Date().toISOString().split('T')[0];

        const cache = await HistoricalPriceProvider.getHistoricalPrices(eligibleHoldings, startDate, endDate);
        if (isSubscribed) {
          setHistoricalPricesCache({ ...cache });
        }
      } catch (err) {
        console.warn('Historical price fetching completed with warnings:', err);
      } finally {
        if (isSubscribed) {
          setIsHistoricalPricesLoading(false);
        }
      }
    };

    loadPrices();
    return () => {
      isSubscribed = false;
    };
  }, [filteredInvs, earliestStartDate]);

  // Generate continuous daily portfolio valuation snapshots
  const snapshots: PortfolioSnapshot[] = useMemo(() => {
    return generatePortfolioSnapshots({
      investments: filteredInvs,
      transactions: filteredTxs,
      marketPrices,
      historicalPricesCache,
      dateFilter: growthRange
    });
  }, [filteredInvs, filteredTxs, marketPrices, historicalPricesCache, growthRange]);

  // Format line chart series based on selected reconciliationMode
  const lineChartData = useMemo(() => {
    return snapshots.map(s => {
      const marketVal = reconciliationMode === 'Transactions'
        ? null
        : (reconciliationMode === 'Market Data' ? (s.hasPartialMarketData ? null : s.marketValue) : s.marketValue);

      return {
        date: s.displayDate,
        rawDate: s.date,
        'Net Invested': s.netInvested,
        'Portfolio Market Value': marketVal,
        hasPartialData: s.hasPartialMarketData
      };
    });
  }, [snapshots, reconciliationMode]);

  // Compute earliest date where valid historical market price exists
  const firstMarketValueDate = useMemo(() => {
    const point = lineChartData.find(d => typeof d['Portfolio Market Value'] === 'number' && d['Portfolio Market Value'] > 0);
    return point ? point.date : null;
  }, [lineChartData]);

  // Compute dynamic Y-axis maximum with ~15% headroom across Net Invested and Portfolio Market Value
  const yAxisMaxDomain = useMemo(() => {
    let max = 0;
    lineChartData.forEach(d => {
      const net = typeof d['Net Invested'] === 'number' ? d['Net Invested'] : 0;
      const mkt = typeof d['Portfolio Market Value'] === 'number' ? d['Portfolio Market Value'] : 0;
      if (net > max) max = net;
      if (mkt > max) max = mkt;
    });
    if (max === 0) return 10000;
    return Math.ceil((max * 1.15) / 1000) * 1000;
  }, [lineChartData]);

  // Check if historical price data exists for chart display
  const isMarketDataAvailable = useMemo(() => {
    return lineChartData.some(d => d['Portfolio Market Value'] !== null && d['Portfolio Market Value'] > 0);
  }, [lineChartData]);

  // Latest Snapshot for calculation breakdown & developer reconciliation
  const latestSnapshot = useMemo(() => {
    return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  }, [snapshots]);

  // Custom tooltips with activity log for transaction events
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
      const dataPoint = payload[0].payload;
      const netInvested = typeof dataPoint['Net Invested'] === 'number' ? dataPoint['Net Invested'] : 0;
      const marketVal = typeof dataPoint['Portfolio Market Value'] === 'number' ? dataPoint['Portfolio Market Value'] : null;

      const diff = marketVal !== null ? marketVal - netInvested : null;

      // Find transactions occurring on this specific date
      const txsOnDate = filteredTxs.filter(t => t.date && t.date.split('T')[0] === dataPoint.rawDate);

      return (
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-205 dark:border-slate-800 p-3.5 rounded-xl shadow-xl text-xs font-semibold">
          <p className="text-slate-400 uppercase tracking-wider mb-2.5 font-bold">{dataPoint.date}</p>
          <div className="space-y-2 min-w-[220px]">
            <p className="text-emerald-600 dark:text-emerald-400 flex justify-between gap-4">
              <span>Net Invested:</span>
              <span className="font-extrabold">{formatCurrency(netInvested)}</span>
            </p>

            <p className="text-indigo-600 dark:text-indigo-400 flex justify-between gap-4">
              <span>Portfolio Market Value:</span>
              <span className="font-extrabold">
                {marketVal !== null ? formatCurrency(marketVal) : 'Unavailable'}
              </span>
            </p>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
              <p className="flex justify-between gap-4 text-slate-600 dark:text-slate-300">
                <span>Gain / Loss:</span>
                <span className={`font-bold ${diff !== null ? (diff >= 0 ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-400'}`}>
                  {diff !== null ? `${diff >= 0 ? '+' : ''}${formatCurrency(diff)}` : 'Unavailable'}
                </span>
              </p>
            </div>

            {txsOnDate.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Activity Log</span>
                {txsOnDate.map((tx, idx) => {
                  const parent = filteredInvs.find(h => h.id === tx.investmentId);
                  return (
                    <div key={idx} className="text-[11px] flex justify-between items-center gap-2 py-0.5">
                      <span className={`font-bold ${tx.type === 'BUY' ? 'text-emerald-500' : tx.type === 'SELL' ? 'text-rose-500' : 'text-indigo-500'}`}>
                        {tx.type} {parent ? parent.assetName : 'Holding'} ({tx.quantity} sh)
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">{formatCurrency(tx.amount || (tx.quantity * tx.price))}</span>
                    </div>
                  );
                })}
              </div>
            )}
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${dateFilter === opt.value
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 p-4 rounded-2xl max-w-md animate-slide-in">
          <div>
            <DatePickerField
              label="Start Date"
              value={customStart}
              onChange={setCustomStart}
            />
          </div>
          <div>
            <DatePickerField
              label="End Date"
              value={customEnd}
              onChange={setCustomEnd}
            />
          </div>
        </div>
      )}

      {/* Overall Performance Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Capital Invested */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">TOTAL CAPITAL INVESTED</span>
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
            <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">CURRENT VALUATION</span>
            
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 block">
              {formatCurrency(totalCurrent)}
            </span>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-550 mt-4 m-0 font-semibold">
            Current market value of all active holdings.
          </p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Donut asset class allocation */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white m-0">Asset Class Allocation</h3>
            <p className="text-sm text-slate-400 dark:text-slate-550 mt-1 m-0">
              Allocation based on current holdings market value.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-6 my-auto py-4">
            {/* Left side: Donut chart */}
            <div className="h-56 w-full flex items-center justify-center">
            {pieData.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">No active holdings to display allocation.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={ASSET_COLORS[entry.name] || DEFAULT_COLOR}
                        stroke="#0d0f17"
                        strokeWidth={1.5}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Color Legend */}
            <div className="flex flex-col gap-2.5 w-full justify-center">
            {pieData.map(entry => (
              <div key={entry.name} className="flex items-center justify-between text-sm py-0.5">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ASSET_COLORS[entry.name] || DEFAULT_COLOR }}
                  />
                  <span className="whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">{entry.name}</span>
                </div>
                <span className="text-slate-900 dark:text-white font-bold text-sm flex-shrink-0 min-w-[55px] text-right">
                  {entry.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
        </div>

        {/* Monthly investments history bar chart */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white m-0">Monthly Savings Growth</h3>
            <p className="text-sm text-slate-400 dark:text-slate-550 mt-1 m-0">Investment buy transaction amounts compiled chronologically.</p>
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
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-855">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">Portfolio Growth Curve</h3>
                {isHistoricalPricesLoading && (
                  <RefreshCw className="h-3.5 w-3.5 text-indigo-500 animate-spin" />
                )}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5 m-0 font-medium">
                Historical valuation progression comparing capital cost vs actual market value.
              </p>
            </div>

            {/* Reconciliation Mode & Time Range Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Functional Reconciliation Mode Selector */}
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                {(['Auto', 'Transactions', 'Market Data', 'Snapshots'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setReconciliationMode(mode)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${reconciliationMode === mode
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Time Range Selector */}
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map(rng => (
                  <button
                    key={rng}
                    onClick={() => setGrowthRange(rng)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${growthRange === rng
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    {rng}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowDebugBreakdown(!showDebugBreakdown)}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                title="Toggle valuation breakdown"
              >
                <span>Reconciliation</span>
                {showDebugBreakdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {/* Missing Market Data Communication Banner */}
          {firstMarketValueDate && snapshots.length > 0 && firstMarketValueDate !== snapshots[0].displayDate && (
            <div className="mt-3 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-semibold flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Historical market price data is available from <strong>{firstMarketValueDate}</strong>. Earlier periods show capital cost baseline.</span>
            </div>
          )}

          <div className="h-80 w-full my-4">
            {lineChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-550">
                Add holdings or transactions to display the portfolio growth curve.
              </div>
            ) : !isMarketDataAvailable && reconciliationMode === 'Market Data' ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 dark:text-slate-500 gap-2">
                <AlertCircle className="h-6 w-6 text-amber-500" />
                <p className="font-semibold m-0">Historical market-value data unavailable for this date range.</p>
                <p className="text-[11px] text-slate-500 m-0">Showing capital investment baseline curve below.</p>
                <ResponsiveContainer width="100%" height="80%">
                  <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e2230" opacity={0.1} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={35} tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={formatYAxis} domain={[0, yAxisMaxDomain]} />
                    <Tooltip content={<CustomLineTooltip />} />
                    <Line type="monotone" dataKey="Net Invested" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e2230" opacity={0.1} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={35} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={formatYAxis} domain={[0, yAxisMaxDomain]} />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Line type="monotone" dataKey="Net Invested" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Portfolio Market Value" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend Footer */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-855 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-400">Net Invested</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-indigo-600" />
              <span className="text-slate-600 dark:text-slate-400">Portfolio Market Value</span>
            </div>
          </div>

          {/* Developer Portfolio Reconciliation Panel */}
          {showDebugBreakdown && latestSnapshot && (
            <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4 animate-slide-in space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 m-0">
                    <span>⚡ Portfolio Reconciliation ({latestSnapshot.displayDate})</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" /> Reconciled
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 m-0">
                    Single source of truth calculation verifying Reports, Growth Curve, and Holdings reconciliation.
                  </p>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Invested</span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
                    {formatCurrency(totalInvested)}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Market Value</span>
                  <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 block">
                    {formatCurrency(totalCurrent)}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Unrealized Gain / Loss</span>
                  <span className={`text-base font-extrabold mt-1 block ${totalCurrent - totalInvested >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {totalCurrent - totalInvested >= 0 ? '+' : ''}{formatCurrency(totalCurrent - totalInvested)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase font-bold text-[9px]">
                    <tr>
                      <th className="px-4 py-2">SYMBOL / Asset</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2 text-right">Quantity Held</th>
                      <th className="px-3 py-2 text-right">Latest Price</th>
                      <th className="px-3 py-2 text-right">Invested Capital</th>
                      <th className="px-4 py-2 text-right">Market Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {latestSnapshot.holdingsBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-3 text-center text-slate-500">
                          No active holdings on this date.
                        </td>
                      </tr>
                    ) : (
                      latestSnapshot.holdingsBreakdown.map((item, idx) => (
                        <tr key={item.investmentId || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="px-4 py-2 font-bold text-slate-900 dark:text-white">
                            {item.symbol || item.assetName} <span className="text-slate-400 font-normal">({item.assetName})</span>
                          </td>
                          <td className="px-3 py-2 text-slate-500">{item.category}</td>
                          <td className="px-3 py-2 text-right font-semibold">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-slate-500">
                            {item.price !== null ? formatCurrency(item.price) : <span className="text-amber-500 font-semibold">Unavailable</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                            {formatCurrency(item.investedCapital)}
                          </td>
                          <td className="px-4 py-2 text-right font-extrabold text-indigo-600 dark:text-indigo-400">
                            {item.marketValue !== null ? formatCurrency(item.marketValue) : <span className="text-amber-500 font-semibold">Unavailable</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50/80 dark:bg-slate-900/80 font-extrabold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800">
                    <tr>
                      <td colSpan={4} className="px-4 py-2.5 uppercase text-[10px]">
                        Total Snapshot Portfolio Values
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-900 dark:text-white">
                        {formatCurrency(latestSnapshot.investedCapital)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-indigo-600 dark:text-indigo-400">
                        {latestSnapshot.marketValue !== null ? formatCurrency(latestSnapshot.marketValue) : 'N/A'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
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
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <AssetLogo
                              name={title}
                              symbol={parent?.symbol}
                              assetType={category}
                              logoUrl={parent?.logoUrl || parent?.logo_url}
                              size="sm"
                            />
                            <span>{title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{category}</td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${tx.type === 'BUY'
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

      {/* Missing Price Assets Modal */}






    </div>
  );
};

