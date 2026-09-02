"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  totalPages?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (page: number) => void;
}

export function Pagination({
  totalPages = 1,
  value,
  defaultValue = 1,
  onChange,
}: PaginationProps) {
  const isControlled = value !== undefined;
  const [internalPage, setInternalPage] = React.useState(defaultValue);

  const currentPage = isControlled ? value! : internalPage;

  const goToPage = (page: number) => {
    const next = Math.min(totalPages, Math.max(1, page));
    if (next === currentPage) return;
    if (!isControlled) {
      setInternalPage(next);
    }
    onChange?.(next);
  };

  const pageNumbers = React.useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | '...')[] = [];
    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap select-none">
      {/* Previous Button */}
      <button
        type="button"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Previous</span>
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1 flex-wrap">
        {pageNumbers.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="h-8 min-w-[28px] px-1 flex items-center justify-center text-xs font-bold text-slate-400 dark:text-slate-500 select-none"
              >
                ...
              </span>
            );
          }

          const isSelected = p === currentPage;
          return (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => goToPage(p)}
              className={`h-8 min-w-[32px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white font-extrabold shadow-sm shadow-indigo-600/30'
                  : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              aria-label={`Page ${p}`}
              aria-current={isSelected ? 'page' : undefined}
            >
              {p}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        type="button"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
        aria-label="Next page"
      >
        <span>Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
