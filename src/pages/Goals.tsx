import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { usePortfolio } from '../hooks/usePortfolio';
import type { Goal } from '../types';
import { GoalModal } from '../components/GoalModal';
import { calculateGoalMetrics } from '../services/portfolioCalculationService';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Calendar,
  Layers,
  Check,
  AlertCircle,
  PlusCircle,
  MinusCircle,
  Link as LinkIcon,
  TrendingUp,
  Award
} from 'lucide-react';

export const Goals: React.FC = () => {
  const {
    goals,
    updateGoal,
    deleteGoal,
    formatCurrency,
    dataTypeFilter,
    showToast
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Invoke shared calculation hook
  const { holdings } = usePortfolio();

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this financial goal?')) {
      deleteGoal(id);
      showToast('Financial goal deleted successfully.', 'info');
    }
  };

  const handleAddNew = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };

  // Quick Money Adjustments (Manual Only)
  const handleAddMoney = (goal: Goal) => {
    if (goal.progressMode === 'Automatic') return;
    const amountStr = window.prompt(`Enter amount to add to "${goal.name}" saved balance:`);
    if (amountStr !== null) {
      const val = parseFloat(amountStr);
      if (!isNaN(val) && val > 0) {
        const nextAmount = goal.currentAmount + val;
        updateGoal({
          ...goal,
          currentAmount: nextAmount,
          isCompleted: nextAmount >= goal.targetAmount
        });
        showToast(`Added ${formatCurrency(val)} to "${goal.name}".`, 'success');
      } else {
        alert("Please enter a valid positive number.");
      }
    }
  };

  const handleWithdrawMoney = (goal: Goal) => {
    if (goal.progressMode === 'Automatic') return;
    const amountStr = window.prompt(`Enter amount to withdraw from "${goal.name}" saved balance:`);
    if (amountStr !== null) {
      const val = parseFloat(amountStr);
      if (!isNaN(val) && val > 0) {
        const nextAmount = Math.max(0, goal.currentAmount - val);
        updateGoal({
          ...goal,
          currentAmount: nextAmount,
          isCompleted: nextAmount >= goal.targetAmount
        });
        showToast(`Withdrew ${formatCurrency(val)} from "${goal.name}".`, 'info');
      } else {
        alert("Please enter a valid positive number.");
      }
    }
  };

  // Helper to calculate days remaining
  const getDaysRemaining = (dateStr?: string): { days: number; text: string; isOverdue: boolean } | null => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { days: Math.abs(diffDays), text: `${Math.abs(diffDays)} days overdue`, isOverdue: true };
    } else if (diffDays === 0) {
      return { days: 0, text: 'Due today', isOverdue: false };
    }
    return { days: diffDays, text: `${diffDays} days remaining`, isOverdue: false };
  };

  // Category styling map
  const categoryStyles: Record<string, { bg: string; text: string }> = {
    'Savings': { bg: 'bg-emerald-500/10 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400' },
    'Emergency Fund': { bg: 'bg-rose-500/10 dark:bg-rose-955/20', text: 'text-rose-600 dark:text-rose-400' },
    'Investment': { bg: 'bg-indigo-500/10 dark:bg-indigo-950/20', text: 'text-indigo-600 dark:text-indigo-400' },
    'IPO': { bg: 'bg-purple-500/10 dark:bg-purple-950/20', text: 'text-purple-600 dark:text-purple-400' },
    'Travel': { bg: 'bg-sky-500/10 dark:bg-sky-955/20', text: 'text-sky-600 dark:text-sky-400' },
    'Education': { bg: 'bg-amber-500/10 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400' },
    'Vehicle': { bg: 'bg-orange-500/10 dark:bg-orange-955/20', text: 'text-orange-600 dark:text-orange-400' },
    'Property': { bg: 'bg-blue-500/10 dark:bg-blue-955/20', text: 'text-blue-600 dark:text-blue-400' },
    'Retirement': { bg: 'bg-pink-500/10 dark:bg-pink-955/20', text: 'text-pink-600 dark:text-pink-400' },
    'Other': { bg: 'bg-slate-500/10 dark:bg-slate-950/20', text: 'text-slate-600 dark:text-slate-400' },
  };

  // Filter goals by dataTypeFilter ('All' | 'Real' | 'Demo')
  const typeFilteredGoals = useMemo(() => {
    return goals.filter(g => {
      if (dataTypeFilter === 'Real' && g.isDemo) return false;
      if (dataTypeFilter === 'Demo' && !g.isDemo) return false;
      return true;
    });
  }, [goals, dataTypeFilter]);

  const filteredGoalMetrics = useMemo(() => {
    return typeFilteredGoals.map(goal => calculateGoalMetrics(goal, holdings));
  }, [typeFilteredGoals, holdings]);

  // Overall Goal KPI Summary
  const { totalTarget, totalProgress, completedCount, overallPercent } = useMemo(() => {
    let targetSum = 0;
    let progressSum = 0;
    let done = 0;

    typeFilteredGoals.forEach((goal, idx) => {
      const metric = filteredGoalMetrics[idx];
      if (metric) {
        targetSum += metric.target;
        const currentVal = goal.progressMode === 'Automatic' ? metric.currentValue : metric.contributed;
        progressSum += currentVal;
        if (goal.isCompleted || metric.progressPercent >= 100) {
          done++;
        }
      }
    });

    const percent = targetSum > 0 ? Math.min(100, Math.round((progressSum / targetSum) * 100)) : 0;
    return {
      totalTarget: targetSum,
      totalProgress: progressSum,
      completedCount: done,
      overallPercent: percent
    };
  }, [typeFilteredGoals, filteredGoalMetrics]);

  return (
    <div className="space-y-6 animate-slide-in pb-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white m-0">🎯 Financial Goals</h2>
            <p className="text-sm text-slate-405 dark:text-slate-500 m-0 font-semibold">
              Create and manage milestones for liquid cash, property buys, or retirement.
            </p>
          </div>
        </div>

        {/* Global Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleAddNew}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-sm transition-all cursor-pointer shadow-sm hover:shadow active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create Goal</span>
          </button>
        </div>
      </div>

      {/* Goal Summary KPI Section */}
      {typeFilteredGoals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Goal Targets</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(totalTarget)}</div>
            <p className="text-xs text-slate-400 font-semibold m-0">{typeFilteredGoals.length} tracked milestone{typeFilteredGoals.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Accumulated</span>
            <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{formatCurrency(totalProgress)}</div>
            <p className="text-xs text-slate-400 font-semibold m-0">Saved & linked portfolio value</p>
          </div>

          <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Completion</span>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <span>{overallPercent}%</span>
            </div>
            <p className="text-xs text-slate-400 font-semibold m-0">Weighted goal completion</p>
          </div>

          <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Milestones Achieved</span>
            <div className="text-2xl font-extrabold text-amber-500 flex items-center gap-1.5">
              <Award className="h-5 w-5 text-amber-500" />
              <span>{completedCount} / {typeFilteredGoals.length}</span>
            </div>
            <p className="text-xs text-slate-400 font-semibold m-0">Completed goals</p>
          </div>
        </div>
      )}

      {/* Goal list grid */}
      {typeFilteredGoals.length === 0 ? (
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[350px]">
          <div className="h-16 w-16 rounded-full bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-550 mb-4">
            <Target className="h-8 w-8 text-indigo-500" />
          </div>
          
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            No financial goals tracked yet
          </h3>
          <p className="text-sm text-slate-405 dark:text-slate-555 max-w-sm mx-auto mb-6 font-semibold">
            Start building your financial map by defining your first cash milestone.
          </p>

          <button
            onClick={handleAddNew}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-sm cursor-pointer shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create Goal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-semibold">
          {typeFilteredGoals.map((goal, idx) => {
            const metric = filteredGoalMetrics[idx] || { contributed: 0, currentValue: 0, target: 0, remaining: 0, progressPercent: 0 };
            const { contributed, currentValue, target, remaining, progressPercent } = metric;
            const daysData = getDaysRemaining(goal.targetDate);
            const style = categoryStyles[goal.category] || categoryStyles.Other;
            const isCompleted = goal.isCompleted || progressPercent >= 100;

            // Resolve linked holding name
            const linkedHolding = goal.linkedAssetId
              ? holdings.find(h => h.id === goal.linkedAssetId)
              : null;

            return (
              <div
                key={goal.id}
                className={`bg-white dark:bg-[#0d0f17] border rounded-2xl p-6 flex flex-col justify-between transition-all shadow-sm ${
                  isCompleted 
                    ? 'border-emerald-500/30 shadow-emerald-500/[0.02]' 
                    : 'border-slate-200 dark:border-slate-850'
                }`}
              >
                {/* Card Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${style.bg} ${style.text}`}>
                      {goal.category}
                    </span>
                    
                    {/* Demo label tag */}
                    {goal.isDemo && (
                      <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded">
                        DEMO
                      </span>
                    )}

                    {/* Auto sync indicators */}
                    {goal.linkedAssetId && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-indigo-500 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                        <LinkIcon className="h-2.5 w-2.5" />
                        <span>{goal.progressMode === 'Automatic' ? 'AUTO-SYNCED' : 'LINKED'}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2 pt-1.5">
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white m-0 line-clamp-1 flex-1" title={goal.name}>
                      {goal.name}
                    </h4>
                    {isCompleted && (
                      <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                    )}
                  </div>

                  {goal.notes && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-550 m-0 leading-relaxed font-medium line-clamp-2" title={goal.notes}>
                      {goal.notes}
                    </p>
                  )}
                </div>

                {/* Progress stats */}
                <div className="my-5 space-y-4">
                  {/* Visual Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-450 dark:text-slate-555">🏆 Goal Progress</span>
                      <span className="font-extrabold text-indigo-650 dark:text-indigo-400">{progressPercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Saved vs Target totals */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-slate-100 dark:border-slate-850 text-xs">
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {goal.linkedAssetId ? '💰 Principal Invested' : '📈 Current Progress'}
                      </span>
                      <span className="font-extrabold text-slate-700 dark:text-slate-300 block mt-0.5">
                        {formatCurrency(contributed)}
                      </span>
                    </div>

                    {goal.linkedAssetId ? (
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">📈 Current Value</span>
                        <span className="font-extrabold text-indigo-650 dark:text-indigo-400 block mt-0.5">
                          {formatCurrency(currentValue)}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">🎯 Target Amount</span>
                        <span className="font-bold text-slate-900 dark:text-white block mt-0.5">
                          {formatCurrency(target)}
                        </span>
                      </div>
                    )}

                    {goal.linkedAssetId && (
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">🎯 Target Amount</span>
                        <span className="font-bold text-slate-900 dark:text-white block mt-0.5">
                          {formatCurrency(target)}
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="block text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-550">Remaining</span>
                      <span className="font-bold text-slate-900 dark:text-white block mt-0.5">
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                  </div>

                  {/* Auto Synced Details Banner */}
                  {linkedHolding && (
                    <div className="bg-indigo-500/[0.02] border border-indigo-550/10 rounded-xl p-2.5 text-[10px] text-slate-450 dark:text-slate-400 flex items-center justify-between font-semibold">
                      <span>Valuation linked to:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 max-w-[120px] truncate" title={linkedHolding.assetName}>
                        {linkedHolding.assetName}
                      </span>
                    </div>
                  )}

                  {/* Goal Remaining or Completed status */}
                  <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-850 pt-3 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {isCompleted ? (
                      <span className="text-emerald-500 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Milestone Achieved
                      </span>
                    ) : (
                      <span>Remaining: <strong className="text-slate-700 dark:text-slate-300 font-bold">{formatCurrency(remaining)}</strong></span>
                    )}

                    {/* Date status */}
                    {daysData && (
                      <span className={`flex items-center gap-1.5 ${daysData.isOverdue ? 'text-rose-500' : 'text-slate-450'}`}>
                        {daysData.isOverdue ? <AlertCircle className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
                        <span>{daysData.text}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 border-t border-slate-50 dark:border-slate-850 pt-4 flex-wrap">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleEdit(goal)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e111a] text-slate-600 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all cursor-pointer"
                      title="Edit Goal"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e111a] text-slate-600 dark:text-slate-400 hover:text-red-655 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
                      title="Delete Goal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    {/* Quick money adjustments only visible for manual progress goals */}
                    {goal.progressMode !== 'Automatic' ? (
                      <>
                        <button
                          onClick={() => handleWithdrawMoney(goal)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e111a] text-slate-600 dark:text-slate-400 hover:bg-rose-500/5 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/20 text-[10px] font-bold cursor-pointer"
                          title="Withdraw Money"
                        >
                          <MinusCircle className="h-3.5 w-3.5 text-rose-500" />
                          <span>Reduce</span>
                        </button>
                        <button
                          onClick={() => handleAddMoney(goal)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-650 hover:text-white hover:border-indigo-650 text-[10px] font-bold cursor-pointer"
                          title="Add Money"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          <span>Add</span>
                        </button>
                      </>
                    ) : (
                      // Display Auto indicator badge for synced goals instead of modification buttons
                      <span className="text-[9px] text-slate-400 border border-slate-100 dark:border-slate-800 px-2.5 py-1.5 rounded-xl font-bold bg-slate-50 dark:bg-slate-900 flex items-center gap-1 select-none">
                        <Layers className="h-3 w-3" /> Sync Valuation Active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Modal */}
      <GoalModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGoal(null);
        }}
        goalToEdit={editingGoal}
      />
    </div>
  );
};
