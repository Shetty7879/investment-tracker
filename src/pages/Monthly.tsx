import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { usePortfolio } from '../hooks/usePortfolio';
import { calculateMonthlyInvestments } from '../services/portfolioCalculationService';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { Calendar, Plus, BarChart3, Landmark, ShieldCheck } from 'lucide-react';
import { InvestmentModal } from '../components/InvestmentModal';

// Monthly Savings Planner – uses real investment data only
export const Monthly: React.FC = () => {
  const { monthlyTarget, formatCurrency, setMonthlyTarget, setDataTypeFilter } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTarget, setNewTarget] = useState('');
  const [targetError, setTargetError] = useState('');

  // Ensure we work with real data only – no automatic demo clearing
  useEffect(() => {
    setDataTypeFilter('Real');
  }, [setDataTypeFilter]);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthIdx = currentDate.getMonth(); // 0‑based index

  const { holdings, transactions } = usePortfolio();

  // Monthly data for the current year, including target per month
  const monthlyData = calculateMonthlyInvestments(transactions, holdings, currentYear, monthlyTarget);

  // Helper calculations
  const investedThisMonth = monthlyData[currentMonthIdx]?.actual ?? 0;
  const remainingThisMonth = monthlyTarget > 0 ? monthlyTarget - investedThisMonth : 0;
  const progressPercent = monthlyTarget > 0 ? (investedThisMonth / monthlyTarget) * 100 : 0;

  const handleSetTarget = () => {
    const val = parseFloat(newTarget);
    if (isNaN(val) || val <= 0) {
      setTargetError('Enter a positive number');
      return;
    }
    setMonthlyTarget(val);
    setNewTarget('');
    setTargetError('');
  };

  // Tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl text-xs font-semibold">
          <p className="text-slate-400 uppercase tracking-wider mb-1.5">{data.month}</p>
          <div className="space-y-1">
            {monthlyTarget > 0 && (
              <p className="text-slate-700 dark:text-slate-350 flex justify-between gap-4">
                <span>Target:</span>
                <span className="font-bold">{formatCurrency(data.target)}</span>
              </p>
            )}
            <p className="text-indigo-650 dark:text-indigo-400 flex justify-between gap-4">
              <span>Actual:</span>
              <span className="font-extrabold">{formatCurrency(data.actual)}</span>
            </p>
            {monthlyTarget > 0 && (
              <p className={`${data.diff >= 0 ? 'text-emerald-500' : 'text-rose-500'} flex justify-between gap-4 font-bold`}>
                <span>Diff:</span>
                <span>{data.diff >= 0 ? '+' : ''}{formatCurrency(data.diff)}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const showEmptyState = investedThisMonth === 0;

  return (
    <div className="space-y-6 animate-slide-in pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold m-0">📅 Monthly Savings Planner</h2>
            <p className="text-sm text-slate-405 dark:text-slate-500 m-0">
              Track actual purchase transaction cost basis against monthly saving targets.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors cursor-pointer shadow-lg shadow-indigo-650/15"
        >
          <Plus className="h-4 w-4" />
          <span>Record Purchase</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Target */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">
            <span>📅 Monthly Target</span>
            <Landmark className="h-4 w-4 text-slate-400 dark:text-slate-650" />
          </div>
          <div className="flex flex-col gap-2">
            {monthlyTarget && monthlyTarget > 0 ? (
              <>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
                    {formatCurrency(monthlyTarget)}
                  </div>
                  <button
                    onClick={() => setMonthlyTarget(0)}
                    className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-555 mt-1.5 font-medium">
                  Annual plan: {formatCurrency(monthlyTarget * 12)}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-extrabold text-slate-400 dark:text-slate-500 leading-none">
                  Not set
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter target"
                    value={newTarget}
                    onChange={e => setNewTarget(e.target.value)}
                    className="w-24 p-1.5 border border-slate-200 dark:border-slate-800 rounded bg-transparent text-slate-900 dark:text-white text-xs"
                  />
                  <button
                    onClick={handleSetTarget}
                    className="px-3 py-1 bg-indigo-650 text-white rounded text-xs hover:bg-indigo-700 transition cursor-pointer"
                  >
                    Set
                  </button>
                </div>
                {targetError && <p className="text-rose-500 text-xs mt-1">{targetError}</p>}
              </>
            )}
          </div>
        </div>

        {/* Invested This Month */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">
            <span>📈 Invested This Month</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
            {formatCurrency(investedThisMonth)}
          </div>
        </div>

        {/* Remaining This Month */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">
            <span>💸 Remaining This Month</span>
          </div>
          <div className="text-2xl font-extrabold leading-none">
            {monthlyTarget && monthlyTarget > 0 ? (
              remainingThisMonth > 0 ? formatCurrency(remainingThisMonth) :
                remainingThisMonth === 0 ? "Target reached" : formatCurrency(Math.abs(remainingThisMonth)) + " over target"
            ) : (
              "—"
            )}
          </div>
        </div>

        {/* Target Progress */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">
            <span>🎯 Target Progress</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-650 dark:text-indigo-400 leading-none">
            {monthlyTarget && monthlyTarget > 0 ? `${progressPercent.toFixed(1)}%` : "—"}
          </div>
        </div>
      </div>


      {/* Empty state when no investments this month */}
      {showEmptyState && (
        <div className="mt-6 text-center p-8 bg-white dark:bg-[#0d0f17] rounded-2xl shadow-sm border border-slate-202 dark:border-slate-850">
          <div className="text-3xl mb-2">📊 No investments this month</div>
          <p className="text-slate-600 dark:text-slate-400 mb-4">Add your first investment to start tracking your monthly progress.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-semibold transition"
          >
            + Add Investment
          </button>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-6 shadow-sm mt-6">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-indigo-500" /> Savings Target Achievement
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5 mb-0 font-semibold">
            Monthly actual investment purchase logs plotted against savings plan limits.
          </p>
        </div>
        <div className="h-72 w-full my-6 relative">
          {monthlyData.every(m => m.actual === 0) ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
              No investment data available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e2230" opacity={0.1} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} />
                {monthlyTarget > 0 && (
                  <ReferenceLine y={monthlyTarget} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Target', position: 'right', fill: '#10b981' }} />
                )}
                <Bar dataKey="actual" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Investment Modal */}
      <InvestmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

