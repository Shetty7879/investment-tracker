import React, { useState } from 'react';
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
  Tooltip
} from 'recharts';
import { Calendar, Plus, BarChart3, TrendingUp, Landmark, ShieldCheck } from 'lucide-react';
import { InvestmentModal } from '../components/InvestmentModal';

export const Monthly: React.FC = () => {
  const { monthlyTarget, formatCurrency } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentYear = new Date().getFullYear();


  // Invoke shared calculation hook
  const { holdings, transactions } = usePortfolio();

  // Calculate actuals per month for the current year based on BUY transactions using centralized service
  const monthlyData = calculateMonthlyInvestments(transactions, holdings, currentYear, monthlyTarget);

  // Aggregates for summary cards
  const totalTargetYTD = monthlyTarget * 12;
  const totalActualYTD = monthlyData.reduce((s, m) => s + m.actual, 0);
  const totalDiffYTD = totalActualYTD - totalTargetYTD;
  const overallAchieveYTD = totalTargetYTD > 0 ? (totalActualYTD / totalTargetYTD) * 100 : 0;

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl text-xs font-semibold">
          <p className="text-slate-400 uppercase tracking-wider mb-1.5">{payload[0].payload.month}</p>
          <div className="space-y-1">
            <p className="text-slate-700 dark:text-slate-350 flex justify-between gap-4">
              <span>Target:</span>
              <span className="font-bold">{formatCurrency(payload[0].payload.target)}</span>
            </p>
            <p className="text-indigo-650 dark:text-indigo-400 flex justify-between gap-4">
              <span>Actual:</span>
              <span className="font-extrabold">{formatCurrency(payload[0].value)}</span>
            </p>
            <p className={`${payload[0].payload.diff >= 0 ? 'text-emerald-500' : 'text-rose-500'} flex justify-between gap-4 font-bold`}>
              <span>Diff:</span>
              <span>
                {payload[0].payload.diff >= 0 ? '+' : ''}
                {formatCurrency(payload[0].payload.diff)}
              </span>
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
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
              {formatCurrency(monthlyTarget)}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-550 mt-1.5 font-medium">
              Annual plan: {formatCurrency(totalTargetYTD)}
            </div>
          </div>
        </div>

        {/* YTD Saved Actual */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">
            <span>💰 Invested This Month</span>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
              {formatCurrency(totalActualYTD)}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-550 mt-1.5 font-medium">
              Accumulated cost basis
            </div>
          </div>
        </div>

        {/* Difference */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">
            <span>Difference YTD</span>
            {totalDiffYTD >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <Calendar className="h-4 w-4 text-rose-500" />
            )}
          </div>
          <div>
            <div className={`text-2xl font-extrabold leading-none ${totalDiffYTD >= 0 ? 'text-emerald-600 dark:text-emerald-455' : 'text-rose-600 dark:text-rose-455'}`}>
              {totalDiffYTD >= 0 ? '+' : ''}{formatCurrency(totalDiffYTD)}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-550 mt-1.5 font-medium">
              Progress relative to target
            </div>
          </div>
        </div>

        {/* Achievement rate */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">
            <span>🎯 Target Progress</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-indigo-650 dark:text-indigo-400 leading-none">
              {overallAchieveYTD.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-550 mt-1.5 font-medium">
              YTD planner completion
            </div>
          </div>
        </div>
      </div>

      {/* Target vs Actual Progress Chart */}
      <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-indigo-500" /> Savings Target Achievement
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5 mb-0 font-semibold">
            Monthly actual investment purchase logs plotted against savings plan limits.
          </p>
        </div>

        <div className="h-72 w-full my-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e2230" opacity={0.1} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} />
              
              <Bar dataKey="actual" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Details Grid Table */}
      <div className="bg-white dark:bg-[#0d0f17] border border-slate-202 dark:border-slate-850 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50/50 dark:bg-slate-900/40 text-slate-405 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-150 dark:border-slate-855">
              <tr>
                <th className="px-6 py-3.5">Month</th>
                <th className="px-6 py-3.5 text-right">Target</th>
                <th className="px-6 py-3.5 text-right">Actual Saved</th>
                <th className="px-6 py-3.5 text-right">Difference</th>
                <th className="px-6 py-3.5 text-center">Achievement %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
              {monthlyData.map((row) => {
                const isOverTarget = row.diff >= 0;
                return (
                  <tr key={row.month} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors font-medium">
                    <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">{row.month}</td>
                    <td className="px-6 py-3.5 text-right text-slate-500 dark:text-slate-400 whitespace-nowrap font-bold">
                      {formatCurrency(row.target)}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-850 dark:text-slate-205 whitespace-nowrap font-extrabold">
                      {formatCurrency(row.actual)}
                    </td>
                    <td className={`px-6 py-3.5 text-right font-bold whitespace-nowrap ${
                      isOverTarget ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {isOverTarget ? '+' : ''}
                      {formatCurrency(row.diff)}
                    </td>
                    <td className="px-6 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${Math.min(row.percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-indigo-550 dark:text-indigo-400">
                          {row.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Wrapper */}
      <InvestmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
