
export const getAssetTypeBadgeStyle = (type: string): string => {
  switch (type) {
    case 'Stock':
      return 'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
    case 'ETF':
      return 'bg-cyan-50 text-cyan-700 border border-cyan-100 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/30';
    case 'Mutual Fund':
      return 'bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30';
    case 'IPO':
      return 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
    case 'Digital Gold':
      return 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
    case 'Digital Silver':
      return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800/50';
    case 'Digital Platinum':
      return 'bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30';
    case 'Crypto':
      return 'bg-violet-50 text-violet-700 border border-violet-100 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/30';
    case 'Fixed Deposit':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
    case 'Bond':
      return 'bg-teal-50 text-teal-700 border border-teal-100 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/30';
    default:
      return 'bg-slate-50 text-slate-600 border border-slate-100 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800/30';
  }
};

export const getBrokerBadgeStyle = (broker: string): string => {
  switch (broker) {
    case 'Dhan':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
    case 'Lemon':
      return 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
    case 'Univest':
      return 'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
    case 'PhonePe':
      return 'bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30';
    case 'FamPay':
      return 'bg-pink-50 text-pink-700 border border-pink-100 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/30';
    case 'Groww':
      return 'bg-teal-50 text-teal-700 border border-teal-100 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/30';
    case 'Bank':
      return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800/50';
    default:
      return 'bg-slate-50 text-slate-600 border border-slate-100 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800/30';
  }
};
