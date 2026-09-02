import { type FC, type ReactNode, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface ContinuousPaginationProps {
  totalPages?: number;
  currentPage?: number;
  value?: number;
  defaultPage?: number;
  onChange?: (page: number) => void;
  onPageChange?: (page: number) => void;
}

interface PageButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

const PageButton: FC<PageButtonProps> = ({ children, onClick, disabled }) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl flex items-center justify-center border transition-all shadow-sm ${
        disabled
          ? "border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 text-slate-300 dark:text-zinc-700 cursor-not-allowed opacity-40"
          : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
      }`}
      whileHover={!disabled ? { scale: 1.08, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.92 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {children}
    </motion.button>
  );
};

export const ContinuousPagination: FC<ContinuousPaginationProps> = ({
  totalPages = 1,
  currentPage: propCurrentPage,
  value,
  defaultPage = 1,
  onChange,
  onPageChange,
}) => {
  const active = value !== undefined ? value : propCurrentPage !== undefined ? propCurrentPage : defaultPage;

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === active) return;
    onChange?.(page);
    onPageChange?.(page);
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | '...')[] = [];
    if (active <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (active >= totalPages - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      pages.push(active - 1);
      pages.push(active);
      pages.push(active + 1);
      pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [active, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-sm select-none flex-wrap">
      {/* Prev */}
      <PageButton
        disabled={active <= 1}
        onClick={() => handlePageChange(active - 1)}
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </PageButton>

      {/* Pages */}
      <div className="relative flex gap-1 sm:gap-1.5 flex-wrap items-center">
        {pageNumbers.map((p, i) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${i}`}
                className="h-9 min-w-[28px] sm:h-10 px-1 flex items-center justify-center text-xs font-bold text-slate-400 dark:text-zinc-500"
              >
                ...
              </span>
            );
          }

          const page = p as number;
          const isActive = page === active;

          return (
            <motion.button
              key={page}
              type="button"
              onClick={() => handlePageChange(page)}
              className={`relative z-10 h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold transition-colors duration-300 border border-slate-200 dark:border-zinc-800 cursor-pointer ${
                isActive
                  ? "text-white"
                  : "text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-900"
              }`}
              whileHover={!isActive ? { y: -2 } : {}}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              {/* Active background */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="active-bg"
                    className="absolute inset-0 rounded-lg sm:rounded-xl overflow-hidden"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 220, damping: 24, mass: 0.8 }}
                  >
                    <div
                      className="absolute inset-0 rounded-lg sm:rounded-xl"
                      style={{
                        background: `linear-gradient(135deg, #4f46e5 0%, #3730a3 50%, #1e1b4b 100%)`,
                        border: `1px solid #6366f1`,
                        boxShadow: `0 4px 12px -2px rgba(99,102,241,0.5)`,
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <span className="relative z-10 font-extrabold">{page}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Next */}
      <PageButton
        disabled={active >= totalPages}
        onClick={() => handlePageChange(active + 1)}
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </PageButton>
    </div>
  );
};