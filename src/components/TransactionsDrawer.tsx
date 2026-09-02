import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../contexts/AppContext';
import type { ConsolidatedHolding } from '../utils/consolidation';
import { X, Trash2, Calendar, ArrowLeft, ChevronRight, FileText, Tag, DollarSign, Layers } from 'lucide-react';
import { PlatformBadge } from './PlatformBadge';
import { ContinuousPagination } from './ui/continuous-pagination';

interface TransactionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  holding: ConsolidatedHolding | null;
  onAddBuy: () => void;
  onAddSell: () => void;
}

export const TransactionsDrawer: React.FC<TransactionsDrawerProps> = ({
  isOpen,
  onClose,
  holding,
  onAddBuy,
  onAddSell
}) => {
  const { deleteTransaction, formatCurrency, showToast } = useApp();
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  // Pagination for transactions list (10 per page)
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset selectedTx and currentPage when drawer opens/closes or holding changes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTx(null);
    }
    setCurrentPage(1);
  }, [isOpen, holding?.holdingKey]);

  // Prevent background scrolling when modal is open & handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedTx) {
          setSelectedTx(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, selectedTx]);

  if (!isOpen || !holding) return null;

  const isMutualFund = holding.category === 'Mutual Funds';
  const isCommodity = holding.category === 'Digital Gold' || holding.category === 'Digital Silver' || holding.category === 'Digital Platinum' || holding.category === 'Gold' || holding.category === 'Silver' || holding.category === 'Platinum';

  const quantityLabel = isMutualFund ? 'Units' : isCommodity ? 'Weight (g)' : 'Quantity';
  const priceLabel = isMutualFund ? 'NAV' : isCommodity ? 'Price/g' : 'Price';

  const totalTxItems = holding.transactions.length;
  const totalPages = Math.max(1, Math.ceil(totalTxItems / ITEMS_PER_PAGE));

  const paginatedTxs = holding.transactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const startItem = totalTxItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalTxItems);

  const handleDelete = async (txId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (window.confirm('Are you sure you want to delete this transaction record?')) {
      await deleteTransaction(txId);
      if (selectedTx?.id === txId) {
        setSelectedTx(null);
      }
      showToast('Transaction deleted successfully.', 'info');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl max-w-2xl sm:max-w-3xl w-full p-6 shadow-2xl space-y-5 text-slate-900 dark:text-white font-semibold text-xs animate-scale-up max-h-[85vh] flex flex-col relative z-[10000]">
        
        {/* Detail View vs List View Header */}
        {selectedTx ? (
          <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-855 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-slate-800/50 transition-all font-bold text-xs cursor-pointer shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Transactions</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between border-b border-slate-150 dark:border-slate-855 pb-4 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white m-0">
                  Transaction History — {holding.assetName}
                </h3>
              </div>
              <p className="text-xs text-slate-405 dark:text-slate-500 font-semibold m-0 mt-1">
                {holding.displayType} · {holding.broker} ({holding.txCount} transaction{holding.txCount !== 1 ? 's' : ''})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onAddBuy}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer shadow-sm"
              >
                + BUY
              </button>
              <button
                type="button"
                onClick={onAddSell}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all cursor-pointer shadow-sm"
              >
                SELL
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content Section: Detail Card OR Transaction Table */}
        {selectedTx ? (
          <div className="overflow-y-auto flex-1 pr-1 space-y-4 animate-fade-in">
            {/* Header Badge & Title */}
            <div className="bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-850 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Transaction Details
                </span>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white m-0 flex items-center gap-2">
                  <span>{holding.assetName}</span>
                  <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                    selectedTx.type === 'BUY'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                  }`}>
                    {selectedTx.type}
                  </span>
                </h4>
              </div>

              <div className="text-right">
                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">
                  Total Amount
                </span>
                <span className={`text-base font-extrabold ${selectedTx.type === 'BUY' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatCurrency(selectedTx.amount || (selectedTx.quantity * selectedTx.price))}
                </span>
              </div>
            </div>

            {/* Grid of Key Transaction Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 border border-slate-200 dark:border-slate-850 rounded-xl p-4 bg-white dark:bg-[#0d0f17]">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-slate-400" /> Transaction Date
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {selectedTx.date || '—'}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Tag className="h-3 w-3 text-slate-400" /> {quantityLabel}
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {selectedTx.quantity?.toLocaleString(undefined, { maximumFractionDigits: 4 }) || 0}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-slate-400" /> {priceLabel}
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {formatCurrency(selectedTx.price || 0)}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Layers className="h-3 w-3 text-slate-400" /> App / Platform
                </span>
                <div className="mt-0.5">
                  <PlatformBadge name={holding.broker} />
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider mb-1">
                  Charges / Fees
                </span>
                <span className="font-extrabold text-slate-700 dark:text-slate-300 text-xs">
                  {selectedTx.charges ? formatCurrency(selectedTx.charges) : '₹0'}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider mb-1">
                  Category & Type
                </span>
                <span className="font-extrabold text-slate-700 dark:text-slate-300 text-xs">
                  {holding.category} · {holding.displayType}
                </span>
              </div>
            </div>

            {/* Notes & Description */}
            <div className="border border-slate-200 dark:border-slate-855 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/20">
              <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3 text-slate-400" /> Notes / Remarks
              </span>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 m-0 leading-relaxed">
                {selectedTx.notes || selectedTx.description || 'No additional notes recorded for this transaction.'}
              </p>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-150 dark:border-slate-855">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-all cursor-pointer"
              >
                ← Back to List
              </button>

              <button
                type="button"
                onClick={(e) => handleDelete(selectedTx.id, e)}
                className="px-4 py-2 rounded-xl bg-rose-600/10 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-500/20 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Record</span>
              </button>
            </div>
          </div>
        ) : (
          /* Transactions Table / List View */
          <div className="overflow-y-auto flex-1 pr-1 space-y-3">
            {holding.transactions.length === 0 ? (
              <div className="py-12 text-center text-slate-450 dark:text-slate-555">
                No transactions recorded for this asset.
              </div>
            ) : (
              <>
                <div className="border border-slate-200 dark:border-slate-855 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <colgroup>
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '90px' }} />
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '140px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '80px' }} />
                    </colgroup>
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500 uppercase text-[9px] font-bold tracking-wider border-b border-slate-150 dark:border-slate-855">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-3 py-3">Type</th>
                        <th className="px-3 py-3 text-right">{quantityLabel}</th>
                        <th className="px-3 py-3 text-right">{priceLabel}</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-3 py-3 text-right">Charges</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium">
                      {paginatedTxs.map((tx) => {
                        const isBuy = tx.type === 'BUY';
                        const isSell = tx.type === 'SELL';

                        return (
                          <tr
                            key={tx.id}
                            onClick={() => setSelectedTx(tx)}
                            className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                            title="Click to view full transaction details"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400 font-bold">
                              <span className="flex items-center gap-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                <Calendar className="h-3 w-3 text-slate-400 group-hover:text-indigo-500" />
                                {tx.date || '—'}
                              </span>
                            </td>

                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] ${
                                isBuy
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : isSell
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              }`}>
                                {tx.type}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {tx.quantity?.toLocaleString(undefined, { maximumFractionDigits: 4 }) || 0}
                            </td>

                            <td className="px-3 py-3 text-right font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {formatCurrency(tx.price || 0)}
                            </td>

                            <td className="px-4 py-3 text-right font-extrabold whitespace-nowrap">
                              <span className={isBuy ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                {formatCurrency(tx.amount || (tx.quantity * tx.price))}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-right text-slate-500 dark:text-slate-400 whitespace-nowrap font-semibold">
                              {tx.charges ? formatCurrency(tx.charges) : '₹0'}
                            </td>

                            <td className="px-4 py-3 text-center whitespace-nowrap flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleDelete(tx.id, e)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                                title="Delete Transaction"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls inside Modal */}
                {totalTxItems > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Showing <strong className="text-slate-900 dark:text-white font-extrabold">{startItem}–{endItem}</strong> of <strong className="text-slate-900 dark:text-white font-extrabold">{totalTxItems}</strong>
                    </div>

                    {totalPages > 1 && (
                      <ContinuousPagination
                        totalPages={totalPages}
                        value={currentPage}
                        onChange={(page) => setCurrentPage(page)}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
