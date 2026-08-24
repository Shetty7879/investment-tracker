import React from 'react';
import { useApp } from '../contexts/AppContext';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast, hideToast } = useApp();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-emerald-500" />,
    warning: <AlertCircle className="h-5 w-5 text-amber-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  const bgClasses = {
    success: 'border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200',
    warning: 'border-amber-500/20 bg-amber-500/10 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200',
    info: 'border-blue-500/20 bg-blue-500/10 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200',
  };

  const type = toast.type || 'info';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-toast-enter">
      <div
        className={`flex items-center gap-3.5 rounded-2xl border px-4 py-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 font-semibold ${bgClasses[type]}`}
      >
        <span className="flex-shrink-0">{icons[type]}</span>
        <p className="text-sm pr-1.5 whitespace-nowrap">{toast.message}</p>
        <button
          onClick={hideToast}
          className="rounded-xl p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-500/10 transition-colors cursor-pointer"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
