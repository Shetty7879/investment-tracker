import React from 'react';

const PLATFORM_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  'PhonePe': {
    bg: 'bg-purple-500/10 dark:bg-purple-950/20',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-200/50 dark:border-purple-900/30',
    icon: '🟣'
  },
  'Dhan': {
    bg: 'bg-emerald-500/10 dark:bg-emerald-950/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200/50 dark:border-emerald-900/30',
    icon: '🟢'
  },
  'Groww': {
    bg: 'bg-teal-500/10 dark:bg-teal-950/20',
    text: 'text-teal-700 dark:text-teal-400',
    border: 'border-teal-200/50 dark:border-teal-900/30',
    icon: '🔵'
  },
  'Zerodha': {
    bg: 'bg-orange-500/10 dark:bg-orange-950/20',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-200/50 dark:border-orange-900/30',
    icon: '🟠'
  },
  'Lemon': {
    bg: 'bg-yellow-500/10 dark:bg-yellow-950/20',
    text: 'text-yellow-700 dark:text-yellow-400',
    border: 'border-yellow-200/50 dark:border-yellow-900/30',
    icon: '🟡'
  },
  'Univest': {
    bg: 'bg-blue-500/10 dark:bg-blue-950/20',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200/50 dark:border-blue-900/30',
    icon: '🔵'
  },
  'FamPay': {
    bg: 'bg-pink-500/10 dark:bg-pink-950/20',
    text: 'text-pink-700 dark:text-pink-400',
    border: 'border-pink-200/50 dark:border-pink-900/30',
    icon: '🔴'
  },
  'Bank': {
    bg: 'bg-slate-500/10 dark:bg-slate-900/40',
    text: 'text-slate-700 dark:text-slate-400',
    border: 'border-slate-200/50 dark:border-slate-800/50',
    icon: '🏦'
  }
};

const DEFAULT_PLATFORM_STYLE = {
  bg: 'bg-slate-500/10 dark:bg-slate-950/20',
  text: 'text-slate-700 dark:text-slate-400',
  border: 'border-slate-200/50 dark:border-slate-800/30',
  icon: '🔌'
};

interface PlatformBadgeProps {
  name: string;
}

export const PlatformBadge: React.FC<PlatformBadgeProps> = ({ name }) => {
  const cleanName = name ? name.trim() : '';
  const style = PLATFORM_STYLES[cleanName] || {
    ...DEFAULT_PLATFORM_STYLE,
    icon: cleanName.toLowerCase().includes('bank') ? '🏦' : '🔌'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border text-xs font-semibold leading-none shadow-sm cursor-default transition-all hover:scale-[1.02] ${style.bg} ${style.text} ${style.border}`}>
      <span className="text-[13px] select-none leading-none flex items-center justify-center h-3.5 w-3.5">{style.icon}</span>
      <span>{cleanName}</span>
    </span>
  );
};
