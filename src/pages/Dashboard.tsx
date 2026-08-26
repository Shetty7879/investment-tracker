import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { usePortfolio } from '../hooks/usePortfolio';
import {
  Briefcase,
  Plus,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { InvestmentModal } from '../components/InvestmentModal';
import { MoneyModal } from '../components/MoneyModal';
import { getAssetTypeBadgeStyle, getBrokerBadgeStyle } from '../utils/badgeStyles';
import { isCommodityCategory } from '../services/portfolioCalculationService';


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

export const Dashboard: React.FC = () => {
  const {
    formatCurrency,
    navigateTo,
    moneyRecords,
  } = useApp();

  // Modal State
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isMoneyModalOpen, setIsMoneyModalOpen] = useState(false);

  // Invoke shared calculation hook
  const { holdings } = usePortfolio();

  // Calculate basic details: Number of Investments
  const numberOfInvestments = holdings.length;

  const totalInvestedAmount = holdings.reduce((sum, h) => sum + (h.investedAmount ?? 0), 0);

  // Filter and sort for Recent Investments (top 5 sorted by buy date / purchase date)
  const recentInvestments = [...holdings]
    .sort((a, b) => new Date(b.buyDate || b.purchaseDate || 0).getTime() - new Date(a.buyDate || a.purchaseDate || 0).getTime())
    .slice(0, 5);



  // Filter money tracker records to show real data only
  const filteredMoneyRecords = moneyRecords.filter(r => !r.isDemo);

  const totalToReceive = filteredMoneyRecords
    .filter(r => r.type === 'receive')
    .reduce((sum, r) => sum + Math.max(0, r.amount - r.amountPaid), 0);

  const totalToGive = filteredMoneyRecords
    .filter(r => r.type === 'give')
    .reduce((sum, r) => sum + Math.max(0, r.amount - r.amountPaid), 0);

  const pendingReceiveCount = filteredMoneyRecords
    .filter(r => r.type === 'receive' && r.amountPaid < r.amount)
    .length;

  const pendingGiveCount = filteredMoneyRecords
    .filter(r => r.type === 'give' && r.amountPaid < r.amount)
    .length;

  // Group investments by platform for separate card
  const platformInvestmentsMap: Record<string, number> = {};
  holdings.forEach(inv => {
    const rawBroker = inv.broker === 'Other' ? inv.customBroker : inv.broker;
    const platform = (rawBroker && rawBroker.trim()) ? rawBroker.trim() : 'Other';
    const amount = inv.investedAmount ?? 0;
    platformInvestmentsMap[platform] = (platformInvestmentsMap[platform] || 0) + amount;
  });

  const platformInvestments = Object.entries(platformInvestmentsMap)
    .map(([name, amount]) => ({ name, amount }))
    .filter(p => p.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6 animate-slide-in pb-8 font-semibold text-xs text-slate-700 dark:text-slate-350">

      {/* Portfolio Overview Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0">Portfolio Overview</h2>
          <p className="text-sm text-slate-405 dark:text-slate-500 m-0 font-medium">
            Your investment and money overview.
          </p>
        </div>

        {/* Global Filter Switchers & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAssetModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Add Investment</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Amount Invested */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[140px] hover:shadow-md hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-300 group cursor-default animate-fade-in">
          <div className="w-full">
            <div className="flex items-center justify-between text-slate-405 dark:text-slate-550 text-[10px] font-bold uppercase tracking-wider mb-2">
              <span>TOTAL AMOUNT INVESTED</span>
              <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/20 group-hover:text-indigo-500 transition-colors flex-shrink-0">
                <Briefcase className="h-4 w-4 text-slate-405 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none tracking-tight mb-4">
              {formatCurrency(totalInvestedAmount)}
            </div>
            <div className="text-xs text-slate-405 dark:text-slate-550 mt-3 font-medium">
              Total capital invested across all investments
            </div>
          </div>
        </div>

        {/* Active Investments */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[140px] hover:shadow-md hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-300 group cursor-default">
          <div className="flex items-center justify-between text-slate-405 dark:text-slate-555 text-[10px] font-bold uppercase tracking-wider mb-2">
            <span>📦 Active Investments</span>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/20 group-hover:text-indigo-500 transition-colors">
              <ArrowUpRight className="h-4.5 w-4.5 text-slate-400 dark:text-slate-655 group-hover:text-indigo-500 transition-colors" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
              {numberOfInvestments}
            </div>
            <div className="text-xs text-slate-405 dark:text-slate-550 mt-3 font-medium">
              Investments in your portfolio
            </div>
          </div>
        </div>

        {/* Money to Receive */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[140px] hover:shadow-md hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-300 group cursor-default">
          <div className="flex items-center justify-between text-slate-405 dark:text-slate-555 text-[10px] font-bold uppercase tracking-wider mb-2">
            <span>💰 Money to Receive</span>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/20 group-hover:text-indigo-500 transition-colors">
              <ArrowDownRight className="h-4.5 w-4.5 text-slate-400 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
              {formatCurrency(totalToReceive)}
            </div>
            <div className="text-xs text-slate-405 dark:text-slate-550 mt-3 font-medium">
              People who owe you
            </div>
          </div>
        </div>

        {/* Money to Give */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[140px] hover:shadow-md hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-300 group cursor-default">
          <div className="flex items-center justify-between text-slate-405 dark:text-slate-555 text-[10px] font-bold uppercase tracking-wider mb-2">
            <span>💸 Money to Give</span>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/20 group-hover:text-indigo-500 transition-colors">
              <ArrowUpRight className="h-4.5 w-4.5 text-slate-400 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
              {formatCurrency(totalToGive)}
            </div>
            <div className="text-xs text-slate-405 dark:text-slate-550 mt-3 font-medium">
              Payments you need to make
            </div>
          </div>
        </div>
      </div>

      {/* Recent Investments List Section */}
      <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-855 pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">
              📋 Recent Investments
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-550 mt-0.5 mb-0 font-medium">
              Your latest investment records.
            </p>
          </div>
          {numberOfInvestments > 0 && (
            <button
              onClick={() => navigateTo('investments')}
              className="text-xs font-bold text-indigo-650 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
            >
              View All
            </button>
          )}
        </div>

        {recentInvestments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-3xl mb-3">📭</span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">No investments yet</h4>
            <p className="text-xs text-slate-405 dark:text-slate-500 max-w-xs mb-4 font-medium">
              Start tracking your investments by adding your first investment.
            </p>
            <button
              onClick={() => setIsAssetModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/10 cursor-pointer active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Investment</span>
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full border-collapse text-left text-xs font-semibold">
                <thead className="bg-slate-50/50 dark:bg-slate-900/40 text-slate-450 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-150 dark:border-slate-855">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Platform</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Invested Amount</th>
                    <th className="px-4 py-3 text-center">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium">
                  {recentInvestments.map(inv => {
                    const displayType = REVERSE_TYPE_MAPPING[inv.category] || REVERSE_TYPE_MAPPING[inv.assetType] || 'Other';
                    const broker = inv.broker === 'Other' && inv.customBroker ? inv.customBroker : (inv.broker || 'Other');
                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-55/50 dark:hover:bg-slate-800/15 transition-colors animate-fade-in"
                      >
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{inv.assetName}</span>
                            {inv.isDemo && (
                              <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded">
                                DEMO
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getAssetTypeBadgeStyle(displayType)}`}>
                            {displayType}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getBrokerBadgeStyle(broker)}`}>
                            {broker}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-350 whitespace-nowrap font-bold">
                          {isCommodityCategory(inv.category || inv.assetType) ? `${inv.weightGrams ?? inv.quantity} ${inv.weightUnit || 'g'}` : inv.quantity}
                        </td>
                        <td className="px-4 py-3.5 text-right font-extrabold text-indigo-650 dark:text-indigo-400 whitespace-nowrap">
                          {formatCurrency(inv.investedAmount)}
                        </td>
                        <td className="px-4 py-3.5 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {inv.buyDate || inv.purchaseDate || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden space-y-4">
              {recentInvestments.map(inv => {
                const displayType = REVERSE_TYPE_MAPPING[inv.category] || REVERSE_TYPE_MAPPING[inv.assetType] || 'Other';
                const broker = inv.broker === 'Other' && inv.customBroker ? inv.customBroker : (inv.broker || 'Other');
                return (
                  <div
                    key={inv.id}
                    className="bg-slate-50/50 dark:bg-slate-900/10 border border-slate-150 dark:border-slate-855 rounded-xl p-4 space-y-2.5 font-semibold text-[11px]"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white m-0">
                          {inv.assetName}
                        </h4>
                        <span className="block text-[10px] text-slate-400 dark:text-slate-550 mt-0.5">{inv.buyDate}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getAssetTypeBadgeStyle(displayType)}`}>
                        {displayType}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-105 dark:border-slate-800 text-[10px]">
                      <div>
                        <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Platform</span>
                        <span className="font-bold text-slate-850 dark:text-slate-200">{broker}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">
                          {isCommodityCategory(inv.category || inv.assetType) ? 'Weight' : 'Quantity'}
                        </span>
                        <span className="font-bold text-slate-855 dark:text-slate-200">
                          {isCommodityCategory(inv.category || inv.assetType) ? `${inv.weightGrams ?? inv.quantity} ${inv.weightUnit || 'g'}` : inv.quantity}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Invested</span>
                        <span className="font-extrabold text-indigo-650 dark:text-indigo-400">{formatCurrency(inv.investedAmount)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Money Tracker & Platform Breakdown side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Money Tracker Summary Section */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-300 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-855 pb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0 flex items-center gap-1.5">
                  <span>💸 Money Tracker</span>
                </h3>
                <button
                  onClick={() => navigateTo('money-tracker')}
                  className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-indigo-650 dark:text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 hover:border-indigo-500/20 rounded-lg transition-all cursor-pointer whitespace-nowrap active:scale-95"
                >
                  View Money Tracker →
                </button>
              </div>

              {/* Dual grid for Receive and Give */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Section 1: Money to Receive */}
                <div className="bg-slate-50/50 dark:bg-slate-900/10 border border-slate-150 dark:border-slate-855 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">💰 To Receive</span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white block">
                      {formatCurrency(totalToReceive)}
                    </span>
                    <span className="text-[10px] text-slate-405 dark:text-slate-500 font-semibold block mt-1">
                      {pendingReceiveCount > 0
                        ? `${pendingReceiveCount} ${pendingReceiveCount === 1 ? 'person owes you' : 'people owe you'}`
                        : '0 people owe you'
                      }
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/5 text-emerald-500">
                    <ArrowDownRight className="h-4 w-4" />
                  </div>
                </div>

                {/* Section 2: Money to Give */}
                <div className="bg-slate-50/50 dark:bg-slate-900/10 border border-slate-150 dark:border-slate-855 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">💸 To Give</span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white block">
                      {formatCurrency(totalToGive)}
                    </span>
                    <span className="text-[10px] text-slate-405 dark:text-slate-500 font-semibold block mt-1">
                      {pendingGiveCount > 0
                        ? `${pendingGiveCount} pending ${pendingGiveCount === 1 ? 'payment' : 'payments'}`
                        : '0 pending payments'
                      }
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-500/5 text-rose-500">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Breakdown Section */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-300 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-855 pb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">
                  TOTAL AMOUNT INVESTED PER APP/PLATFORM
                </h3>
              </div>

              {platformInvestments.length === 0 ? (
                <div className="text-center py-6 text-slate-405 dark:text-slate-500 text-xs font-medium">
                  No platform investments recorded.
                </div>
              ) : (
                <div className="space-y-4">
                  {platformInvestments.map(platform => {
                    const percentage = totalInvestedAmount > 0 
                      ? (platform.amount / totalInvestedAmount) * 100 
                      : 0;
                    return (
                      <div key={platform.name} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300 break-words max-w-[70%]">
                            {platform.name}
                          </span>
                          <span className="font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                            {formatCurrency(platform.amount)}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Investment Modal */}
      <InvestmentModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
      />

      {/* Money Modal */}
      <MoneyModal
        isOpen={isMoneyModalOpen}
        onClose={() => setIsMoneyModalOpen(false)}
      />
    </div>
  );
};
