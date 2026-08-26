import React from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import { getInvestmentAge } from '../utils/calculations';
import { getBrokerBadgeStyle } from '../utils/badgeStyles';

export const AgeOfInvestments: React.FC = () => {
  const { holdings } = usePortfolio();

  // Sort investments from oldest (earliest date) to newest (latest date)
  const getInvDate = (inv: any) => inv.buyDate || inv.purchaseDate || inv.applicationDate;
  const sortedByAge = [...holdings]
    .filter(inv => getInvDate(inv))
    .sort((a, b) => new Date(getInvDate(a)!).getTime() - new Date(getInvDate(b)!).getTime());

  return (
    <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-855 pb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">
            ⏳ AGE OF INVESTMENTS
          </h3>
          <p className="text-xs text-slate-405 dark:text-slate-555 mt-0.5 mb-0 font-medium">
            How long you have held each investment, sorted from oldest to newest.
          </p>
        </div>
      </div>

      {sortedByAge.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-3xl mb-3">⏳</span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">No investments yet</h4>
          <p className="text-xs text-slate-405 dark:text-slate-555 max-w-xs font-medium">
            Add investments to track how long you have held them.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full border-collapse text-left text-xs font-semibold">
              <thead className="bg-slate-50/50 dark:bg-slate-900/40 text-slate-405 dark:text-slate-550 text-[10px] font-bold uppercase tracking-wider border-b border-slate-150 dark:border-slate-855">
                <tr>
                  <th className="px-4 py-3">Investment Name</th>
                  <th className="px-4 py-3">Platform/App</th>
                  <th className="px-4 py-3">Investment Date</th>
                  <th className="px-4 py-3 text-right">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium">
                {sortedByAge.map(inv => {
                  const broker = inv.broker === 'Other' && inv.customBroker ? inv.customBroker : (inv.broker || 'Other');
                  const invDate = inv.buyDate || inv.purchaseDate || inv.applicationDate || '—';
                  const age = getInvestmentAge(inv.buyDate || inv.purchaseDate || inv.applicationDate);
                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-55/50 dark:hover:bg-slate-800/15 transition-colors animate-fade-in"
                    >
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white max-w-[200px] break-words">
                        {inv.assetName}
                      </td>
                      <td className="px-4 py-3.5 max-w-[150px] break-words">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getBrokerBadgeStyle(broker)}`}>
                          {broker}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {invDate}
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-indigo-650 dark:text-indigo-400 whitespace-nowrap">
                        {age}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-4">
            {sortedByAge.map(inv => {
              const broker = inv.broker === 'Other' && inv.customBroker ? inv.customBroker : (inv.broker || 'Other');
              const invDate = inv.buyDate || inv.purchaseDate || inv.applicationDate || '—';
              const age = getInvestmentAge(inv.buyDate || inv.purchaseDate || inv.applicationDate);
              return (
                <div
                  key={inv.id}
                  className="bg-slate-50/50 dark:bg-slate-900/10 border border-slate-150 dark:border-slate-855 rounded-xl p-4 space-y-2.5 font-semibold text-[11px]"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white m-0 break-words">
                        {inv.assetName}
                      </h4>
                    </div>
                    <span className="font-extrabold text-indigo-650 dark:text-indigo-400 whitespace-nowrap flex-shrink-0 text-right">{age}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-105 dark:border-slate-800 text-[10px]">
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Platform</span>
                      <span className="font-bold text-slate-850 dark:text-slate-200">{broker}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Inv. Date</span>
                      <span className="font-bold text-slate-850 dark:text-slate-200">{invDate}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
