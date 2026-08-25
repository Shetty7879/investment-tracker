import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import type { Goal } from '../types';
import { X } from 'lucide-react';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit?: Goal | null;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  goalToEdit
}) => {
  const { addGoal, updateGoal, investments } = useApp();

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState('Savings');
  const [notes, setNotes] = useState('');

  // Linked Asset States
  const [isLinked, setIsLinked] = useState(false);
  const [linkedAssetId, setLinkedAssetId] = useState('');
  const [progressMode, setProgressMode] = useState<'Manual' | 'Automatic'>('Manual');
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter linked asset list based on whether it is a demo goal or real goal
  const isGoalDemo = goalToEdit ? !!goalToEdit.isDemo : false;
  const availableInvestments = investments.filter(inv => {
    return isGoalDemo ? !!inv.isDemo : !inv.isDemo;
  });

  const categoriesList = [
    'Savings',
    'Emergency Fund',
    'Investment',
    'IPO',
    'Travel',
    'Education',
    'Vehicle',
    'Property',
    'Retirement',
    'Other'
  ];

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      if (goalToEdit) {
        setName(goalToEdit.name);
        setTargetAmount(goalToEdit.targetAmount.toString());
        setCurrentAmount(goalToEdit.currentAmount.toString());
        setTargetDate(goalToEdit.targetDate || '');
        setCategory(goalToEdit.category || 'Savings');
        setNotes(goalToEdit.notes || '');
        setIsLinked(!!goalToEdit.linkedAssetId);
        setLinkedAssetId(goalToEdit.linkedAssetId || '');
        setProgressMode(goalToEdit.progressMode || 'Manual');
      } else {
        setName('');
        setTargetAmount('');
        setCurrentAmount('0');
        setTargetDate('');
        setCategory('Savings');
        setNotes('');
        setIsLinked(false);
        setLinkedAssetId('');
        setProgressMode('Manual');
      }
    }
  }, [isOpen, goalToEdit]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) {
      errs.name = 'Goal name is required.';
    }

    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) {
      errs.targetAmount = 'Target amount must be greater than ₹0.';
    }

    if (progressMode === 'Manual') {
      const current = parseFloat(currentAmount);
      if (isNaN(current) || current < 0) {
        errs.currentAmount = 'Current savings cannot be negative.';
      }
    }

    if (isLinked && !linkedAssetId) {
      errs.linkedAssetId = 'Please select a linked asset.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const currentVal = progressMode === 'Automatic' ? 0 : parseFloat(currentAmount);

    const payload = {
      name: name.trim(),
      targetAmount: parseFloat(targetAmount),
      currentAmount: currentVal,
      targetDate: targetDate || undefined,
      category,
      notes: notes.trim(),
      isCompleted: currentVal >= parseFloat(targetAmount),
      linkedAssetId: isLinked ? linkedAssetId : undefined,
      progressMode: isLinked ? progressMode : 'Manual'
    };

    if (goalToEdit) {
      updateGoal({
        ...payload,
        id: goalToEdit.id,
        isDemo: goalToEdit.isDemo,
        owner: goalToEdit.owner
      });
    } else {
      addGoal(payload);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-850 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-modal-enter">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-850 shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {goalToEdit ? 'Edit Milestone Goal' : 'Create Financial Goal'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5">Goal Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Retirement Fund or Electric Vehicle"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3 text-sm outline-none focus:border-indigo-500 text-slate-950 dark:text-white"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5">Target Amount (₹)</label>
              <input
                type="number"
                step="any"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3 text-sm outline-none focus:border-indigo-500 text-slate-950 dark:text-white"
              />
              {errors.targetAmount && <p className="text-red-500 text-xs mt-1">{errors.targetAmount}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5">
                Current Savings (₹) {progressMode === 'Automatic' && <span className="text-indigo-500 font-bold">(Auto Synced)</span>}
              </label>
              <input
                type="number"
                step="any"
                value={progressMode === 'Automatic' ? '' : currentAmount}
                disabled={progressMode === 'Automatic'}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder={progressMode === 'Automatic' ? 'Synced from asset' : '0.00'}
                className={`w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3 text-sm outline-none focus:border-indigo-500 text-slate-950 dark:text-white ${
                  progressMode === 'Automatic' ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900/40' : ''
                }`}
              />
              {errors.currentAmount && <p className="text-red-500 text-xs mt-1">{errors.currentAmount}</p>}
              {progressMode === 'Automatic' && (
                <p className="text-[10px] text-indigo-500 mt-1 italic leading-relaxed">
                  Saved amount is locked and syncs with the linked asset's current valuation.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5">Target Date (Optional)</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3 text-sm outline-none focus:border-indigo-500 text-slate-955 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3 text-sm outline-none focus:border-indigo-500 text-slate-950 dark:text-white"
              >
                {categoriesList.map(cat => (
                  <option key={cat} value={cat} className="dark:bg-slate-900">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Set aside for down payment"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3 text-sm outline-none focus:border-indigo-500 text-slate-955 dark:text-white"
            />
          </div>

          {/* Explicit Linked Asset section */}
          <div className="space-y-3 border-t border-slate-100 dark:border-slate-850 pt-4 shrink-0">
            <div className="flex items-center gap-2">
              <input
                id="link-asset-checkbox"
                type="checkbox"
                checked={isLinked}
                onChange={(e) => {
                  setIsLinked(e.target.checked);
                  if (!e.target.checked) {
                    setLinkedAssetId('');
                    setProgressMode('Manual');
                  }
                }}
                className="rounded border-slate-300 dark:border-slate-800 bg-transparent h-4 w-4 accent-indigo-500 cursor-pointer"
              />
              <label htmlFor="link-asset-checkbox" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none">
                Link goal to a Portfolio Asset (Optional)
              </label>
            </div>

            {isLinked && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-in">
                <div>
                  <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5">Select Asset</label>
                  <select
                    value={linkedAssetId}
                    onChange={(e) => setLinkedAssetId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3 text-sm outline-none focus:border-indigo-500 text-slate-950 dark:text-white"
                  >
                    <option value="" className="dark:bg-slate-900">-- Choose Asset --</option>
                    {availableInvestments.map(inv => (
                      <option key={inv.id} value={inv.id} className="dark:bg-slate-900">
                        {inv.assetName} ({inv.assetType})
                      </option>
                    ))}
                  </select>
                  {errors.linkedAssetId && <p className="text-red-500 text-xs mt-1">{errors.linkedAssetId}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400 mb-1.5">Progress Mode</label>
                  <select
                    value={progressMode}
                    onChange={(e) => setProgressMode(e.target.value as 'Manual' | 'Automatic')}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3 text-sm outline-none focus:border-indigo-500 text-slate-950 dark:text-white"
                  >
                    <option value="Manual" className="dark:bg-slate-900">Manual Progress (Enter Saved Amount)</option>
                    <option value="Automatic" className="dark:bg-slate-900">Automatic Progress (Sync with Asset)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-150 dark:border-slate-850 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-slate-700 dark:text-slate-350 font-semibold text-sm hover:bg-indigo-50/40 hover:border-indigo-500/20 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-650/10 transition-colors cursor-pointer"
            >
              {goalToEdit ? 'Save Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
