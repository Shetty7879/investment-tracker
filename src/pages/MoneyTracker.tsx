import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import type { MoneyRecord } from '../types';
import { MoneyModal } from '../components/MoneyModal';
import { PaymentModal } from '../components/PaymentModal';
import {
  getRemainingAmount,
  getStatus,
  getOverdueStatus
} from '../services/moneyTrackerService';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Coins,
  Filter,
  ArrowUpDown,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';

type SortOptionType =
  | 'latest'
  | 'highest-remaining'
  | 'lowest-remaining'
  | 'alphabetical';

export const MoneyTracker: React.FC = () => {
  const {
    formatCurrency,
    moneyRecords,
    deleteMoneyRecord,
    markMoneyRecordReceived,
    dataTypeFilter
  } = useApp();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MoneyRecord | null>(null);
  const [activePaymentRecord, setActivePaymentRecord] = useState<MoneyRecord | null>(null);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortOption, setSortOption] = useState<SortOptionType>('latest');

  const handleEdit = (record: MoneyRecord) => {
    setEditingRecord(record);
    setIsAddModalOpen(true);
  };

  const handleRecordPayment = (record: MoneyRecord) => {
    setActivePaymentRecord(record);
    setIsPaymentModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this money record? This action cannot be undone.')) {
      deleteMoneyRecord(id);
    }
  };

  const handleMarkPaid = (id: string) => {
    markMoneyRecordReceived(id); // legacy context alias marks as fully paid
  };

  const handleAddNew = () => {
    setEditingRecord(null);
    setIsAddModalOpen(false); // Make sure it closes first to reset state
    setTimeout(() => setIsAddModalOpen(true), 50);
  };

  // Filter money records based on active dataTypeFilter
  const filteredByData = moneyRecords.filter(r => {
    if (dataTypeFilter === 'Real') return !r.isDemo;
    if (dataTypeFilter === 'Demo') return !!r.isDemo;
    return true;
  });

  // Calculate Metrics
  const receiveRecords = filteredByData.filter(r => r.type === 'receive');
  const giveRecords = filteredByData.filter(r => r.type === 'give');

  const totalToReceive = receiveRecords.reduce((sum, r) => sum + getRemainingAmount(r), 0);
  const totalToGive = giveRecords.reduce((sum, r) => sum + getRemainingAmount(r), 0);

  const totalReceived = receiveRecords.reduce((sum, r) => sum + r.amountPaid, 0);
  const totalPaid = giveRecords.reduce((sum, r) => sum + r.amountPaid, 0);

  // Status mapping styles
  const getStatusBadgeStyle = (status: string, overdue: string) => {
    if (status === 'Fully Paid') {
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
    if (overdue === 'Overdue') {
      return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    }
    if (overdue === 'Due Soon') {
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
    return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
  };

  const renderStatusLabel = (status: string, overdue: string) => {
    if (status === 'Fully Paid') return '🟢 Fully Paid';
    if (overdue === 'Overdue') return '🔴 Overdue';
    if (overdue === 'Due Soon') return '🟡 Due Soon';
    if (status === 'Partially Paid') return '🟠 Partially Paid';
    return '🟡 Pending';
  };

  // Filter lists by status
  const filterList = (list: MoneyRecord[]) => {
    return list.filter(r => {
      const status = getStatus(r);
      if (statusFilter === 'Pending') return status === 'Pending';
      if (statusFilter === 'Partially Paid') return status === 'Partially Paid';
      if (statusFilter === 'Fully Paid') return status === 'Fully Paid';
      return true;
    });
  };

  // Sort lists
  const sortList = (list: MoneyRecord[]) => {
    return [...list].sort((a, b) => {
      const aRemaining = getRemainingAmount(a);
      const bRemaining = getRemainingAmount(b);
      switch (sortOption) {
        case 'highest-remaining':
          return bRemaining - aRemaining;
        case 'lowest-remaining':
          return aRemaining - bRemaining;
        case 'alphabetical':
          return a.personName.localeCompare(b.personName);
        case 'latest':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });
  };

  const finalReceiveRecords = sortList(filterList(receiveRecords));
  const finalGiveRecords = sortList(filterList(giveRecords));

  return (
    <div className="space-y-6 animate-slide-in pb-8 font-semibold text-xs text-slate-700 dark:text-slate-350">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white m-0">💸 Money Tracker</h2>
            <p className="text-sm text-slate-405 dark:text-slate-500 m-0 font-medium animate-fade-in">
              Track money you need to receive from other people and money you owe.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddNew}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Money</span>
          </button>
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total to Receive */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-4.5 shadow-sm hover:shadow hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-300 group cursor-default">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-550 text-[9px] font-bold uppercase tracking-wider mb-2">
            <span>💰 Total to Receive</span>
            <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/20 group-hover:text-indigo-500 transition-colors">
              <ArrowDownRight className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
            {formatCurrency(totalToReceive)}
          </div>
        </div>

        {/* Total to Give */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-4.5 shadow-sm hover:shadow hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-300 group cursor-default">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-550 text-[9px] font-bold uppercase tracking-wider mb-2">
            <span>💸 Total to Give</span>
            <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/20 group-hover:text-indigo-500 transition-colors">
              <ArrowUpRight className="h-4 w-4 text-rose-500" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
            {formatCurrency(totalToGive)}
          </div>
        </div>

        {/* Received */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-4.5 shadow-sm hover:shadow hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-300 group cursor-default">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-550 text-[9px] font-bold uppercase tracking-wider mb-2">
            <span>✅ Received</span>
            <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/20 group-hover:text-indigo-500 transition-colors">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
            {formatCurrency(totalReceived)}
          </div>
        </div>

        {/* Paid */}
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-4.5 shadow-sm hover:shadow hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-300 group cursor-default">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-550 text-[9px] font-bold uppercase tracking-wider mb-2">
            <span>📤 Paid</span>
            <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/20 group-hover:text-indigo-500 transition-colors">
              <ArrowUpRight className="h-4 w-4 text-indigo-500" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
            {formatCurrency(totalPaid)}
          </div>
        </div>
      </div>

      {/* Main List & Filters */}
      {filteredByData.length === 0 ? (
        <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[350px] animate-fade-in">
          <div className="h-16 w-16 rounded-full bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-880 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-6">
            <Coins className="h-8 w-8" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            💸 No money records yet
          </h3>
          <p className="text-sm text-slate-405 dark:text-slate-555 max-w-sm mx-auto mb-8 leading-relaxed font-semibold">
            Track money you need to receive or pay.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setEditingRecord(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-sm transition-all cursor-pointer shadow-md shadow-indigo-650/10 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>+ Money to Receive</span>
            </button>
            <button
              onClick={() => {
                setEditingRecord(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>+ Money to Give</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Controls Bar */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-[#0d0f17] p-4 border border-slate-200 dark:border-slate-855 rounded-2xl shadow-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-555 mr-2 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filter Status:
              </span>
              <div className="flex flex-wrap gap-1">
                {['All', 'Pending', 'Partially Paid', 'Fully Paid'].map(f => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                      statusFilter === f
                        ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/30 text-indigo-700 dark:text-indigo-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 hover:text-indigo-650 dark:hover:text-indigo-400'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase font-bold text-slate-405 dark:text-slate-555 flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3" /> Sort:
              </span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOptionType)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2 px-3 text-xs font-bold outline-none focus:border-indigo-500 text-slate-950 dark:text-white dark:bg-[#0d0f17]"
              >
                <option value="latest">Latest Entries</option>
                <option value="highest-remaining">Highest Remaining</option>
                <option value="lowest-remaining">Lowest Remaining</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>
          </div>

          {/* Section 1: Money to Receive List */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-855 pb-2">
              <Coins className="h-4.5 w-4.5 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">💰 Money I Need to Receive</h3>
              <span className="text-[10px] text-slate-400 font-bold">({finalReceiveRecords.length} records)</span>
            </div>

            {finalReceiveRecords.length === 0 ? (
              <div className="bg-slate-50/55 dark:bg-[#0d0f17]/40 border border-slate-150 dark:border-slate-850 p-6 rounded-2xl text-center text-slate-400 font-semibold">
                No money to receive matching your active filter.
              </div>
            ) : (
              <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm overflow-hidden">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto w-full">
                  <table className="w-full border-collapse text-left text-xs font-semibold">
                    <thead className="bg-slate-50/55 dark:bg-slate-900/40 text-slate-405 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-150 dark:border-slate-855">
                      <tr>
                        <th className="px-6 py-4">Person</th>
                        <th className="px-4 py-4 text-right">Amount</th>
                        <th className="px-4 py-4 text-right">Received</th>
                        <th className="px-4 py-4 text-right">Remaining</th>
                        <th className="px-4 py-4 text-center">Date Given</th>
                        <th className="px-4 py-4 text-center">Expected Return</th>
                        <th className="px-4 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium">
                      {finalReceiveRecords.map(r => {
                        const remaining = getRemainingAmount(r);
                        const status = getStatus(r);
                        const overdue = getOverdueStatus(r);
                        const badgeStyle = getStatusBadgeStyle(status, overdue);
                        const label = renderStatusLabel(status, overdue);

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/15 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span>{r.personName}</span>
                                {r.isDemo && (
                                  <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded">
                                    DEMO
                                  </span>
                                )}
                              </div>
                              {r.note && (
                                <span className="block text-[10px] font-semibold text-slate-400 dark:text-slate-550 mt-0.5">
                                  {r.note}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right text-slate-700 dark:text-slate-350 font-bold whitespace-nowrap">
                              {formatCurrency(r.amount)}
                            </td>
                            <td className="px-4 py-4 text-right text-slate-700 dark:text-slate-350 font-bold whitespace-nowrap">
                              {formatCurrency(r.amountPaid)}
                            </td>
                            <td className="px-4 py-4 text-right font-extrabold text-indigo-650 dark:text-indigo-400 whitespace-nowrap">
                              {formatCurrency(remaining)}
                            </td>
                            <td className="px-4 py-4 text-center text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {r.date}
                            </td>
                            <td className="px-4 py-4 text-center text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {r.dueDate || '—'}
                            </td>
                            <td className="px-4 py-4 text-center whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] border font-bold ${badgeStyle}`}>
                                {label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-3">
                                {remaining > 0 && (
                                  <>
                                    <button
                                      onClick={() => handleRecordPayment(r)}
                                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:border-amber-500/20 transition-all cursor-pointer"
                                      title="Record Payment"
                                    >
                                      <TrendingUp className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleMarkPaid(r.id)}
                                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all cursor-pointer"
                                      title="Mark as Received"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleEdit(r)}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-slate-600 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:border-indigo-500/20 transition-all cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(r.id)}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-slate-600 dark:text-slate-400 hover:text-red-655 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 hover:border-red-500/20 transition-all cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List View */}
                <div className="md:hidden space-y-4 p-4">
                  {finalReceiveRecords.map(r => {
                    const remaining = getRemainingAmount(r);
                    const status = getStatus(r);
                    const overdue = getOverdueStatus(r);
                    const badgeStyle = getStatusBadgeStyle(status, overdue);
                    const label = renderStatusLabel(status, overdue);

                    return (
                      <div
                        key={r.id}
                        className="bg-slate-50/55 dark:bg-slate-900/15 border border-slate-150 dark:border-slate-850 rounded-xl p-4 space-y-3 font-semibold text-[11px]"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white m-0">
                              {r.personName}
                            </h4>
                            {r.note && <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{r.note}</span>}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${badgeStyle}`}>
                            {label}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                          <div>
                            <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Amount</span>
                            <span className="font-bold text-slate-850 dark:text-slate-200">{formatCurrency(r.amount)}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Received</span>
                            <span className="font-bold text-slate-850 dark:text-slate-200">{formatCurrency(r.amountPaid)}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Remaining</span>
                            <span className="font-extrabold text-indigo-650 dark:text-indigo-400">{formatCurrency(remaining)}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 text-[9px] text-slate-400 dark:text-slate-500">
                          <span>Given: {r.date}</span>
                          <span>Due: {r.dueDate || '—'}</span>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          {remaining > 0 && (
                            <>
                              <button
                                onClick={() => handleRecordPayment(r)}
                                className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-amber-600 dark:text-amber-400 text-[10px] font-bold cursor-pointer min-h-[38px]"
                                title="Record Payment"
                              >
                                <TrendingUp className="h-3.5 w-3.5" />
                                <span>Pay</span>
                              </button>
                              <button
                                onClick={() => handleMarkPaid(r.id)}
                                className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-emerald-600 dark:text-emerald-400 text-[10px] font-bold cursor-pointer min-h-[38px]"
                                title="Mark as Received"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>Receive All</span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleEdit(r)}
                            className="flex items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-slate-600 dark:text-slate-400 cursor-pointer min-h-[38px] min-w-[38px]"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="flex items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-slate-655 dark:text-slate-400 cursor-pointer min-h-[38px] min-w-[38px]"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Money to Give List */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-855 pb-2">
              <Coins className="h-4.5 w-4.5 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">💸 Money I Need to Give</h3>
              <span className="text-[10px] text-slate-400 font-bold">({finalGiveRecords.length} records)</span>
            </div>

            {finalGiveRecords.length === 0 ? (
              <div className="bg-slate-50/55 dark:bg-[#0d0f17]/40 border border-slate-150 dark:border-slate-850 p-6 rounded-2xl text-center text-slate-400 font-semibold">
                No money to give matching your active filter.
              </div>
            ) : (
              <div className="bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm overflow-hidden">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto w-full">
                  <table className="w-full border-collapse text-left text-xs font-semibold">
                    <thead className="bg-slate-50/55 dark:bg-slate-900/40 text-slate-405 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-150 dark:border-slate-855">
                      <tr>
                        <th className="px-6 py-4">Person</th>
                        <th className="px-4 py-4 text-right">Amount</th>
                        <th className="px-4 py-4 text-right">Paid</th>
                        <th className="px-4 py-4 text-right">Remaining</th>
                        <th className="px-4 py-4 text-center">Date Owed</th>
                        <th className="px-4 py-4 text-center">Due Date</th>
                        <th className="px-4 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium">
                      {finalGiveRecords.map(r => {
                        const remaining = getRemainingAmount(r);
                        const status = getStatus(r);
                        const overdue = getOverdueStatus(r);
                        const badgeStyle = getStatusBadgeStyle(status, overdue);
                        const label = renderStatusLabel(status, overdue);

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/15 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span>{r.personName}</span>
                                {r.isDemo && (
                                  <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded">
                                    DEMO
                                  </span>
                                )}
                              </div>
                              {r.note && (
                                <span className="block text-[10px] font-semibold text-slate-400 dark:text-slate-550 mt-0.5">
                                  {r.note}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right text-slate-700 dark:text-slate-350 font-bold whitespace-nowrap">
                              {formatCurrency(r.amount)}
                            </td>
                            <td className="px-4 py-4 text-right text-slate-700 dark:text-slate-350 font-bold whitespace-nowrap">
                              {formatCurrency(r.amountPaid)}
                            </td>
                            <td className="px-4 py-4 text-right font-extrabold text-indigo-650 dark:text-indigo-400 whitespace-nowrap">
                              {formatCurrency(remaining)}
                            </td>
                            <td className="px-4 py-4 text-center text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {r.date}
                            </td>
                            <td className="px-4 py-4 text-center text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {r.dueDate || '—'}
                            </td>
                            <td className="px-4 py-4 text-center whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] border font-bold ${badgeStyle}`}>
                                {label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-3">
                                {remaining > 0 && (
                                  <>
                                    <button
                                      onClick={() => handleRecordPayment(r)}
                                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:border-amber-500/20 transition-all cursor-pointer"
                                      title="Record Payment"
                                    >
                                      <TrendingUp className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleMarkPaid(r.id)}
                                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all cursor-pointer"
                                      title="Mark as Paid"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleEdit(r)}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-slate-600 dark:text-slate-400 hover:text-indigo-655 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:border-indigo-500/20 transition-all cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(r.id)}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-slate-655 dark:text-slate-400 hover:text-red-655 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 hover:border-red-500/20 transition-all cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List View */}
                <div className="md:hidden space-y-4 p-4">
                  {finalGiveRecords.map(r => {
                    const remaining = getRemainingAmount(r);
                    const status = getStatus(r);
                    const overdue = getOverdueStatus(r);
                    const badgeStyle = getStatusBadgeStyle(status, overdue);
                    const label = renderStatusLabel(status, overdue);

                    return (
                      <div
                        key={r.id}
                        className="bg-slate-50/55 dark:bg-slate-900/15 border border-slate-150 dark:border-slate-850 rounded-xl p-4 space-y-3 font-semibold text-[11px]"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white m-0">
                              {r.personName}
                            </h4>
                            {r.note && <span className="block text-[10px] text-slate-400 dark:text-slate-550 mt-0.5">{r.note}</span>}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${badgeStyle}`}>
                            {label}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                          <div>
                            <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Amount</span>
                            <span className="font-bold text-slate-850 dark:text-slate-200">{formatCurrency(r.amount)}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Paid</span>
                            <span className="font-bold text-slate-850 dark:text-slate-200">{formatCurrency(r.amountPaid)}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Remaining</span>
                            <span className="font-extrabold text-indigo-655 dark:text-indigo-400">{formatCurrency(remaining)}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 text-[9px] text-slate-400 dark:text-slate-500">
                          <span>Owed: {r.date}</span>
                          <span>Due: {r.dueDate || '—'}</span>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          {remaining > 0 && (
                            <>
                              <button
                                onClick={() => handleRecordPayment(r)}
                                className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-amber-600 dark:text-amber-400 text-[10px] font-bold cursor-pointer min-h-[38px]"
                                title="Record Payment"
                              >
                                <TrendingUp className="h-3.5 w-3.5" />
                                <span>Pay</span>
                              </button>
                              <button
                                onClick={() => handleMarkPaid(r.id)}
                                className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-emerald-600 dark:text-emerald-400 text-[10px] font-bold cursor-pointer min-h-[38px]"
                                title="Mark as Paid"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>Pay All</span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleEdit(r)}
                            className="flex items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-slate-655 dark:text-slate-400 cursor-pointer min-h-[38px] min-w-[38px]"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="flex items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-slate-655 dark:text-slate-400 cursor-pointer min-h-[38px] min-w-[38px]"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <MoneyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        recordToEdit={editingRecord}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        recordToEdit={activePaymentRecord}
      />
    </div>
  );
};
