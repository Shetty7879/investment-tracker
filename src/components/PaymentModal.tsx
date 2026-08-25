import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import type { MoneyRecord } from '../types';
import { X } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit: MoneyRecord | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  recordToEdit
}) => {
  const { updateMoneyRecord, formatCurrency } = useApp();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPaymentAmount('');
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !recordToEdit) return null;

  const remaining = recordToEdit.amount - recordToEdit.amountPaid;

  const validate = () => {
    const tempErrors: Record<string, string> = {};
    const val = parseFloat(paymentAmount);

    if (!paymentAmount || isNaN(val) || val <= 0) {
      tempErrors.paymentAmount = 'Please enter a valid amount greater than 0.';
    } else if (val > remaining) {
      tempErrors.paymentAmount = `Recorded amount cannot exceed remaining balance of ${formatCurrency(remaining)}.`;
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const val = parseFloat(paymentAmount);
    const updatedRecord: MoneyRecord = {
      ...recordToEdit,
      amountPaid: recordToEdit.amountPaid + val,
      updatedAt: new Date().toISOString()
    };

    try {
      updateMoneyRecord(updatedRecord);
      onClose();
    } catch (err) {
      console.error(err);
      setErrors({ submit: 'Failed to record payment.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm overflow-y-auto font-semibold animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-modal-enter">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-855">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>💰 Record Payment for {recordToEdit.personName}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errors.submit && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-semibold">
              {errors.submit}
            </div>
          )}

          {/* Details Overview */}
          <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-855 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 dark:text-slate-550">Original Amount:</span>
              <span className="font-extrabold text-slate-900 dark:text-white">{formatCurrency(recordToEdit.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 dark:text-slate-550">Paid So Far:</span>
              <span className="font-extrabold text-slate-700 dark:text-slate-350">{formatCurrency(recordToEdit.amountPaid)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2 font-bold">
              <span className="text-slate-400 dark:text-slate-550">Remaining Due:</span>
              <span className="font-extrabold text-indigo-650 dark:text-indigo-400">{formatCurrency(remaining)}</span>
            </div>
          </div>

          {/* Input field */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-2">
              Payment Amount to Record *
            </label>
            <input
              type="number"
              step="any"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
              className={`w-full rounded-xl border ${
                errors.paymentAmount ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
              } bg-transparent py-2.5 px-3.5 outline-none text-slate-950 dark:text-white transition-all`}
            />
            {errors.paymentAmount && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.paymentAmount}</p>}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-855">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-slate-700 dark:text-slate-350 font-bold text-xs hover:bg-indigo-50/40 hover:border-indigo-500/20 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer"
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
