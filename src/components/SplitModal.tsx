import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { usePortfolio } from '../hooks/usePortfolio';
import type { Investment } from '../types';
import { X, ArrowRight, Info } from 'lucide-react';

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  investment: Investment | null;
}

export const SplitModal: React.FC<SplitModalProps> = ({
  isOpen,
  onClose,
  investment
}) => {
  const { addTransaction, formatCurrency } = useApp();
  const { holdings } = usePortfolio();

  const [oldRatio, setOldRatio] = useState('1');
  const [newRatio, setNewRatio] = useState('2');
  const [splitDate, setSplitDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setOldRatio('1');
      setNewRatio('2');
      setSplitDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !investment) return null;

  const holding = holdings.find(h => h.id === investment.id);
  const currentQty = holding?.quantity ?? investment.quantity ?? 0;
  const currentAvgPrice = holding?.buyPrice ?? investment.buyPrice ?? 0;

  const oldRatioNum = parseFloat(oldRatio);
  const newRatioNum = parseFloat(newRatio);

  let newQty = currentQty;
  let newAvgPrice = currentAvgPrice;
  const isValidRatio = !isNaN(oldRatioNum) && oldRatioNum > 0 && !isNaN(newRatioNum) && newRatioNum > 0;

  if (isValidRatio) {
    newQty = currentQty * (newRatioNum / oldRatioNum);
    newAvgPrice = currentAvgPrice * (oldRatioNum / newRatioNum);
  }

  const costBefore = currentQty * currentAvgPrice;
  const costAfter = newQty * newAvgPrice;
  const isFractional = newQty % 1 !== 0;

  const validate = () => {
    const tempErrors: Record<string, string> = {};

    if (isNaN(oldRatioNum) || oldRatioNum <= 0) {
      tempErrors.oldRatio = 'Ratio must be greater than 0.';
    }
    if (isNaN(newRatioNum) || newRatioNum <= 0) {
      tempErrors.newRatio = 'Ratio must be greater than 0.';
    }
    if (!splitDate) {
      tempErrors.splitDate = 'Please select a split date.';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const ratioStr = `${oldRatio}:${newRatio}`;

    try {
      await addTransaction({
        investmentId: investment.id,
        type: 'SPLIT',
        quantity: newQty,
        price: newAvgPrice,
        amount: 0,
        charges: 0,
        date: splitDate,
        ratio: ratioStr,
        oldQuantity: currentQty,
        newQuantity: newQty,
        oldPrice: currentAvgPrice,
        newPrice: newAvgPrice,
        notes: notes.trim() || `Corporate action: Split ${ratioStr}`,
        isDemo: !!investment.isDemo
      });
      onClose();
    } catch (err) {
      console.error(err);
      setErrors({ submit: 'Failed to record split transaction.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayType = investment.category === 'Stocks' || investment.assetType === 'Stocks' ? 'Stock' : 'ETF';
  const unitLabel = displayType === 'Stock' ? 'shares' : 'units';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm overflow-y-auto font-semibold animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] animate-modal-enter">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-855">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>⚙️ Record {displayType} Split</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs overflow-y-auto">
          {errors.submit && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-semibold">
              {errors.submit}
            </div>
          )}

          {/* Details Overview */}
          <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-855 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 dark:text-slate-550">Asset Name:</span>
              <span className="font-extrabold text-slate-900 dark:text-white">{investment.assetName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 dark:text-slate-555">Asset Type:</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{displayType}</span>
            </div>
          </div>

          {/* Split Ratio Inputs */}
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550 tracking-wider">
              Split Ratio (Old Shares : New Shares)
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  value={oldRatio}
                  onChange={(e) => setOldRatio(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-bold"
                  placeholder="Old"
                />
                {errors.oldRatio && <p className="text-red-500 text-[10px] mt-1">{errors.oldRatio}</p>}
              </div>
              <span className="text-slate-450 dark:text-slate-555 font-extrabold text-lg">:</span>
              <div className="flex-1">
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  value={newRatio}
                  onChange={(e) => setNewRatio(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-bold"
                  placeholder="New"
                />
                {errors.newRatio && <p className="text-red-500 text-[10px] mt-1">{errors.newRatio}</p>}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-555 font-semibold mt-1">
              Example: 1:2 split means 1 old share becomes 2 new shares.
            </p>
          </div>

          {/* Date Picker */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550 tracking-wider">
                Split / Ex-Date
              </label>
              <input
                type="date"
                value={splitDate}
                onChange={(e) => setSplitDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-bold"
              />
              {errors.splitDate && <p className="text-red-500 text-[10px] mt-1">{errors.splitDate}</p>}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550 tracking-wider">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-bold"
              placeholder="e.g. 1:2 stock split corporate action"
            />
          </div>

          {/* Preview Section */}
          <div className="border border-indigo-100 dark:border-indigo-950/20 bg-indigo-50/15 dark:bg-indigo-950/5 rounded-2xl p-4 space-y-3">
            <h4 className="text-[10px] uppercase font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider m-0">
              ⚡ Split Preview
            </h4>
            
            <div className="grid grid-cols-3 gap-2 border-b border-indigo-100/40 dark:border-indigo-950/10 pb-2">
              <span className="text-[10px] font-bold text-slate-405 dark:text-slate-500">Metric</span>
              <span className="text-[10px] font-bold text-slate-405 dark:text-slate-500 text-right">Before</span>
              <span className="text-[10px] font-bold text-slate-405 dark:text-slate-500 text-right">After</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Quantity ({unitLabel}):</span>
              <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
                <span>{currentQty}</span>
                <ArrowRight className="h-3 w-3 text-slate-405" />
                <span className="text-indigo-600 dark:text-indigo-400">{isValidRatio ? newQty : '—'}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Average Price:</span>
              <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
                <span>{formatCurrency(currentAvgPrice)}</span>
                <ArrowRight className="h-3 w-3 text-slate-405" />
                <span className="text-indigo-600 dark:text-indigo-400">{isValidRatio ? formatCurrency(newAvgPrice) : '—'}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs border-t border-indigo-100/40 dark:border-indigo-950/10 pt-2 font-bold">
              <span className="text-slate-500 dark:text-slate-400">Total Cost:</span>
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold">
                <span>{formatCurrency(costBefore)}</span>
                <ArrowRight className="h-3 w-3 text-slate-405" />
                <span>{isValidRatio ? formatCurrency(costAfter) : '—'}</span>
              </div>
            </div>
          </div>

          {/* Fractional warning */}
          {isValidRatio && isFractional && (
            <div className="flex items-start gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-amber-600 dark:text-amber-400 font-semibold text-[11px] leading-relaxed">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block mb-0.5">Fractional shares alert</span>
                This split results in fractional shares ({newQty.toFixed(4)} {unitLabel}). Verify if your broker supports fractional shares. Otherwise, you may need to settle fractional entitlements separately.
              </div>
            </div>
          )}

          {/* Confirmation Box */}
          <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] leading-relaxed">
            Applying this split will adjust your quantity and average price without changing your total cost basis.
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent text-slate-700 dark:text-slate-300 font-bold transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-650/10 active:scale-[0.98]"
            >
              {isSubmitting ? 'Applying...' : 'Apply Split'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
