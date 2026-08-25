import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import type { MoneyRecord, MoneyRecordType } from '../types';
import { X } from 'lucide-react';

interface MoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit?: MoneyRecord | null;
}

export const MoneyModal: React.FC<MoneyModalProps> = ({
  isOpen,
  onClose,
  recordToEdit
}) => {
  const { addMoneyRecord, updateMoneyRecord } = useApp();

  const [type, setType] = useState<MoneyRecordType>('receive');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setIsSubmitting(false);
      if (recordToEdit) {
        setType(recordToEdit.type || 'receive');
        setPersonName(recordToEdit.personName || '');
        setAmount(recordToEdit.amount?.toString() || '');
        setDate(recordToEdit.date || new Date().toISOString().split('T')[0]);
        setDueDate(recordToEdit.dueDate || '');
        setNote(recordToEdit.note || '');
      } else {
        setType('receive');
        setPersonName('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setDueDate('');
        setNote('');
      }
    }
  }, [isOpen, recordToEdit]);

  if (!isOpen) return null;

  const validate = () => {
    const tempErrors: Record<string, string> = {};

    if (!personName.trim()) {
      tempErrors.personName = 'Person name is required.';
    }

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      tempErrors.amount = 'Amount must be greater than 0.';
    }

    if (!date) {
      tempErrors.date = 'Date is required.';
    }

    if (dueDate && date) {
      if (new Date(dueDate) < new Date(date)) {
        tempErrors.dueDate = 'Due date cannot be before the start date.';
      }
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const payload = {
      type,
      personName: personName.trim(),
      amount: parseFloat(amount),
      amountPaid: recordToEdit ? recordToEdit.amountPaid : 0,
      date,
      dueDate: dueDate || undefined,
      note: note.trim() || undefined,
      isDemo: recordToEdit ? recordToEdit.isDemo : false
    };

    try {
      if (recordToEdit) {
        updateMoneyRecord({
          ...recordToEdit,
          ...payload
        });
      } else {
        addMoneyRecord(payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setErrors({ submit: 'Failed to save record.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm overflow-y-auto font-semibold animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] animate-modal-enter">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-855">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {recordToEdit ? '✏️ Edit Payment Record' : '💸 Record Payment Transaction'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {errors.submit && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[11px] font-semibold">
              {errors.submit}
            </div>
          )}

          {/* Type Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-2">
              Transaction Direction *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => !recordToEdit && setType('receive')}
                className={`py-2.5 px-4 rounded-xl border text-center font-bold transition-all flex items-center justify-center gap-1.5 ${
                  type === 'receive'
                    ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/30 text-indigo-700 dark:text-indigo-400 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-transparent text-slate-600 dark:text-slate-400 hover:bg-indigo-50/40 dark:hover:bg-slate-850 hover:text-indigo-650 dark:hover:text-indigo-400'
                } ${recordToEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span>💰 Money to Receive</span>
              </button>
              <button
                type="button"
                onClick={() => !recordToEdit && setType('give')}
                className={`py-2.5 px-4 rounded-xl border text-center font-bold transition-all flex items-center justify-center gap-1.5 ${
                  type === 'give'
                    ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/30 text-indigo-700 dark:text-indigo-400 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-transparent text-slate-600 dark:text-slate-400 hover:bg-indigo-50/40 dark:hover:bg-slate-850 hover:text-indigo-650 dark:hover:text-indigo-400'
                } ${recordToEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span>💸 Money to Give</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Person Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 mb-2 uppercase tracking-wider">
                👤 Person Name *
              </label>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="e.g. Rahul, Friend, John"
                className={`w-full rounded-xl border ${
                  errors.personName ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/10'
                } bg-transparent py-2.5 px-3.5 outline-none focus:ring-4 text-slate-950 dark:text-white transition-all`}
              />
              {errors.personName && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.personName}</p>}
            </div>

            {/* Note / Reason */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 mb-2 uppercase tracking-wider">
                📝 Reason / Note (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Emergency split"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-955 dark:text-white transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-555 mb-2 uppercase tracking-wider">
                💰 Amount *
              </label>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full rounded-xl border ${
                  errors.amount ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                } bg-transparent py-2.5 px-3.5 outline-none text-slate-955 dark:text-white transition-all`}
              />
              {errors.amount && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.amount}</p>}
            </div>

            {/* Date */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-555 mb-2 uppercase tracking-wider">
                📅 Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full rounded-xl border ${
                  errors.date ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                } bg-transparent py-2.5 px-3.5 outline-none text-slate-955 dark:text-white transition-all`}
              />
              {errors.date && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.date}</p>}
            </div>
          </div>

          {/* Expected Return / Due Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-555 mb-2 uppercase tracking-wider">
              📆 {type === 'receive' ? 'Expected Return Date' : 'Due Date'} (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`w-full rounded-xl border ${
                errors.dueDate ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
              } bg-transparent py-2.5 px-3.5 outline-none text-slate-955 dark:text-white transition-all`}
            />
            {errors.dueDate && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.dueDate}</p>}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-150 dark:border-slate-855">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-slate-700 dark:text-slate-350 font-bold text-xs hover:bg-indigo-50/40 hover:border-indigo-500/20 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : recordToEdit ? 'Save Changes' : 'Record Transaction'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
