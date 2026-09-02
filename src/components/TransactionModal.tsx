import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../contexts/AppContext';
import type { ConsolidatedHolding } from '../utils/consolidation';
import { X, Plus, AlertCircle } from 'lucide-react';
import type { Transaction } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding: ConsolidatedHolding | null;
  initialMode?: 'BUY' | 'SELL';
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  holding,
  initialMode = 'BUY'
}) => {
  const { addTransaction, showToast } = useApp();

  const [mode, setMode] = useState<'BUY' | 'SELL'>(initialMode);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [charges, setCharges] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    if (isOpen && holding) {
      setMode(initialMode);
      setDate(new Date().toISOString().split('T')[0]);
      setQuantity('');
      setPrice(holding.metrics.currentPrice ? String(holding.metrics.currentPrice) : (holding.averageBuyPrice ? String(holding.averageBuyPrice) : ''));
      setAmount('');
      setCharges('0');
      setNotes('');
      setValidationError('');
    }
  }, [isOpen, holding, initialMode]);

  // Recalculate amount automatically when quantity or price changes
  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    setValidationError('');
    const q = parseFloat(val);
    const p = parseFloat(price);
    if (!isNaN(q) && !isNaN(p) && q > 0 && p > 0) {
      setAmount((q * p).toFixed(2));
    }
  };

  const handlePriceChange = (val: string) => {
    setPrice(val);
    setValidationError('');
    const q = parseFloat(quantity);
    const p = parseFloat(val);
    if (!isNaN(q) && !isNaN(p) && q > 0 && p > 0) {
      setAmount((q * p).toFixed(2));
    }
  };

  if (!isOpen || !holding) return null;

  const category = holding.category;
  const isMutualFund = category === 'Mutual Funds';
  const isCommodity = category === 'Digital Gold' || category === 'Digital Silver' || category === 'Digital Platinum' || category === 'Gold' || category === 'Silver' || category === 'Platinum';

  const quantityLabel = isMutualFund ? 'Units' : isCommodity ? 'Weight (grams)' : 'Quantity / Shares';
  const priceLabel = isMutualFund ? 'NAV (₹)' : isCommodity ? 'Price per Gram (₹)' : 'Price per Share / Unit (₹)';

  const availableQty = holding.currentQuantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const parsedQty = parseFloat(quantity);
    const parsedPrice = parseFloat(price);
    const parsedAmount = parseFloat(amount) || (parsedQty * parsedPrice);
    const parsedCharges = parseFloat(charges) || 0;

    if (isNaN(parsedQty) || parsedQty <= 0) {
      setValidationError(`${quantityLabel} must be greater than 0.`);
      return;
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setValidationError(`${priceLabel} must be greater than 0.`);
      return;
    }

    if (!date) {
      setValidationError('Transaction date is required.');
      return;
    }

    // SELL validation
    if (mode === 'SELL' && parsedQty > availableQty + 0.00001) {
      const msg = `You only have ${availableQty.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${quantityLabel.toLowerCase()} available to sell.`;
      setValidationError(msg);
      showToast(msg, 'warning');
      return;
    }

    const newTx: Transaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 11),
      investmentId: holding.primaryInvestment.id,
      type: mode,
      quantity: parsedQty,
      price: parsedPrice,
      amount: parsedAmount,
      charges: parsedCharges,
      date,
      notes: notes || (mode === 'BUY' ? 'Buy purchase' : 'Sell redemption'),
      isDemo: !!holding.isDemo,
      createdAt: new Date().toISOString()
    };

    await addTransaction(newTx);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-850 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-900 dark:text-white font-semibold text-xs animate-scale-up relative z-[10000]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-150 dark:border-slate-855 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">💼</span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white m-0">
                {holding.assetName}
              </h3>
            </div>
            <p className="text-xs text-slate-405 dark:text-slate-500 font-semibold m-0 mt-1">
              {holding.displayType} · {holding.broker}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BUY / SELL Mode Selector */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => { setMode('BUY'); setValidationError(''); }}
            className={`py-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'BUY'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Plus className="h-3.5 w-3.5" /> BUY
          </button>

          <button
            type="button"
            onClick={() => { setMode('SELL'); setValidationError(''); }}
            className={`py-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'SELL'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            SELL
          </button>
        </div>

        {/* Current Available Info for SELL */}
        {mode === 'SELL' && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-3 rounded-xl flex items-center justify-between text-[11px]">
            <span>Available to Sell:</span>
            <span className="font-extrabold">
              {availableQty.toLocaleString(undefined, { maximumFractionDigits: 4 })} {quantityLabel}
            </span>
          </div>
        )}

        {/* Error Banner */}
        {validationError && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 p-3 rounded-xl flex items-center gap-2 text-[11px] font-bold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Transaction Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Date */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs font-bold outline-none focus:border-indigo-500 text-slate-900 dark:text-white dark:bg-[#0d0f17]"
              />
            </div>

            {/* Quantity / Units */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                {quantityLabel} <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.000001"
                required
                placeholder="0.00"
                value={quantity}
                onChange={e => handleQuantityChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs font-bold outline-none focus:border-indigo-500 text-slate-900 dark:text-white dark:bg-[#0d0f17]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Price / NAV */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                {priceLabel} <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="0.00"
                value={price}
                onChange={e => handlePriceChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs font-bold outline-none focus:border-indigo-500 text-slate-900 dark:text-white dark:bg-[#0d0f17]"
              />
            </div>

            {/* Calculated Amount */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                Calculated Amount (₹)
              </label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs font-extrabold outline-none focus:border-indigo-500 text-indigo-650 dark:text-indigo-400 dark:bg-[#0d0f17]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Charges */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                Charges (₹)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={charges}
                onChange={e => setCharges(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs font-bold outline-none focus:border-indigo-500 text-slate-900 dark:text-white dark:bg-[#0d0f17]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="Reference or note..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs font-semibold outline-none focus:border-indigo-500 text-slate-900 dark:text-white dark:bg-[#0d0f17]"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-855">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl text-white font-extrabold shadow-md transition-all cursor-pointer active:scale-95 ${
                mode === 'BUY'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
              }`}
            >
              Confirm {mode}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
