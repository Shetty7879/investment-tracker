import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import type { Dividend, DividendStatus, BrokerType } from '../types';
import { X, DollarSign, Calculator, RefreshCw, Search, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { DatePickerField, formatYMDDate } from './calendar-9';
import { Stepper } from './stepper';

interface DividendModalProps {
  isOpen: boolean;
  onClose: () => void;
  dividendToEdit?: Dividend | null;
  defaultInvestmentId?: string;
}

export const DividendModal: React.FC<DividendModalProps> = ({
  isOpen,
  onClose,
  dividendToEdit,
  defaultInvestmentId
}) => {
  const { investments, addDividend, updateDividend } = useApp();

  const [investmentId, setInvestmentId] = useState('');
  const [assetName, setAssetName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [broker, setBroker] = useState<BrokerType | string>('Dhan');
  const [eligibleQuantity, setEligibleQuantity] = useState<number>(1);
  const [dividendPerShare, setDividendPerShare] = useState<string>('0');
  const [tax, setTax] = useState<string>('0');
  const [dividendDate, setDividendDate] = useState<string>(formatYMDDate(new Date()));
  const [paymentDate, setPaymentDate] = useState<string>(formatYMDDate(new Date()));
  const [status, setStatus] = useState<DividendStatus>('Paid');
  const [notes, setNotes] = useState<string>('');
  
  // Reinvestment options
  const [reinvest, setReinvest] = useState<boolean>(false);
  const [reinvestPrice, setReinvestPrice] = useState<string>('');

  // Asset Search Dropdown State
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Eligible assets (Stocks, ETFs, Mutual Funds, IPOs, etc.)
  const eligibleInvestments = useMemo(() => {
    return investments.filter(inv => {
      const cat = inv.category || inv.assetType;
      return cat === 'Stocks' || cat === 'Stock' || cat === 'ETFs' || cat === 'ETF' || cat === 'Mutual Funds' || cat === 'Mutual Fund';
    });
  }, [investments]);

  // Instant Search filter across assetName, symbol, and broker
  const filteredSearchInvestments = useMemo(() => {
    const q = assetSearchQuery.trim().toLowerCase();
    if (!q) return eligibleInvestments;
    return eligibleInvestments.filter(inv => {
      const nameMatch = inv.assetName.toLowerCase().includes(q);
      const symbolMatch = (inv.symbol || '').toLowerCase().includes(q);
      const brokerName = inv.broker === 'Other' && inv.customBroker ? inv.customBroker : (inv.broker || '');
      const brokerMatch = brokerName.toLowerCase().includes(q);
      return nameMatch || symbolMatch || brokerMatch;
    });
  }, [eligibleInvestments, assetSearchQuery]);

  // Click outside listener for asset dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAssetDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isAssetDropdownOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setAssetSearchQuery('');
    }
  }, [isAssetDropdownOpen]);

  const handleSelectInvestment = useCallback((id: string) => {
    setInvestmentId(id);
    const found = investments.find(inv => inv.id === id);
    if (found) {
      setAssetName(found.assetName);
      setSymbol(found.symbol || '');
      const b = found.broker === 'Other' && found.customBroker ? found.customBroker : (found.broker || 'Dhan');
      setBroker(b);
      setEligibleQuantity(found.quantity && found.quantity > 0 ? Math.max(1, Math.round(found.quantity)) : 1);
    }
    setIsAssetDropdownOpen(false);
    setAssetSearchQuery('');
  }, [investments]);

  useEffect(() => {
    if (dividendToEdit) {
      setInvestmentId(dividendToEdit.investmentId);
      setAssetName(dividendToEdit.assetName);
      setSymbol(dividendToEdit.symbol || '');
      setBroker(dividendToEdit.broker || 'Dhan');
      setEligibleQuantity(dividendToEdit.eligibleQuantity || 1);
      setDividendPerShare(dividendToEdit.dividendPerShare?.toString() || '0');
      setTax(dividendToEdit.tax?.toString() || '0');
      setDividendDate(dividendToEdit.dividendDate || formatYMDDate(new Date()));
      setPaymentDate(dividendToEdit.paymentDate || formatYMDDate(new Date()));
      setStatus(dividendToEdit.status || 'Paid');
      setNotes(dividendToEdit.notes || '');
      setReinvest(dividendToEdit.reinvested || false);
      setReinvestPrice('');
    } else {
      const selectedId = defaultInvestmentId || (eligibleInvestments.length > 0 ? eligibleInvestments[0].id : '');
      if (selectedId) {
        handleSelectInvestment(selectedId);
      } else {
        setInvestmentId('');
        setAssetName('');
        setSymbol('');
        setEligibleQuantity(1);
      }
      setDividendPerShare('0');
      setTax('0');
      setDividendDate(formatYMDDate(new Date()));
      setPaymentDate(formatYMDDate(new Date()));
      setStatus('Paid');
      setNotes('');
      setReinvest(false);
      setReinvestPrice('');
    }
    setErrors({});
  }, [dividendToEdit, isOpen, defaultInvestmentId, eligibleInvestments, handleSelectInvestment]);

  const perShareNum = parseFloat(dividendPerShare) || 0;
  const taxNum = parseFloat(tax) || 0;
  const grossDividend = Math.round(eligibleQuantity * perShareNum * 100) / 100;
  const netDividend = Math.max(0, Math.round((grossDividend - taxNum) * 100) / 100);

  const selectedInvestment = investments.find(inv => inv.id === investmentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!investmentId) {
      newErrors.investmentId = 'Please select an asset/holding.';
    }
    if (eligibleQuantity <= 0) {
      newErrors.eligibleQuantity = 'Eligible quantity must be greater than 0.';
    }
    if (perShareNum < 0) {
      newErrors.dividendPerShare = 'Dividend per share cannot be negative.';
    }
    if (taxNum < 0) {
      newErrors.tax = 'Tax/TDS cannot be negative.';
    }
    if (taxNum > grossDividend) {
      newErrors.tax = 'Tax/TDS cannot exceed Gross Dividend.';
    }
    if (!dividendDate) {
      newErrors.dividendDate = 'Dividend date is required.';
    }
    if (reinvest && (!reinvestPrice || parseFloat(reinvestPrice) <= 0)) {
      newErrors.reinvestPrice = 'Please enter a valid reinvestment share price.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: Omit<Dividend, 'id' | 'createdAt'> = {
      investmentId,
      symbol,
      assetName,
      broker,
      eligibleQuantity,
      dividendPerShare: perShareNum,
      grossDividend,
      tax: taxNum,
      netDividend,
      dividendDate,
      paymentDate: paymentDate || dividendDate,
      status: reinvest ? 'Reinvested' : status,
      notes: notes.trim(),
      isDemo: dividendToEdit ? !!dividendToEdit.isDemo : false
    };

    if (dividendToEdit) {
      updateDividend({
        ...dividendToEdit,
        ...payload,
        updatedAt: new Date().toISOString()
      });
    } else {
      addDividend(payload, {
        reinvest,
        price: parseFloat(reinvestPrice) || 0,
        buyDate: paymentDate || dividendDate
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#121824] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#171e2e]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
                {dividendToEdit ? 'Edit Dividend Record' : 'Record Dividend Income'}
              </h2>
              <p className="text-xs text-gray-400">
                Log dividend payout without altering invested capital
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* Custom Searchable Asset Selection */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Dividend Asset / Holding <span className="text-red-400">*</span>
            </label>
            
            {/* Trigger Button */}
            <button
              type="button"
              disabled={!!dividendToEdit}
              onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-[#1a2234] border ${
                errors.investmentId
                  ? 'border-red-500 ring-red-500/10'
                  : isAssetDropdownOpen
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-gray-700/60 hover:border-gray-600'
              } rounded-xl text-white text-sm text-left focus:outline-none disabled:opacity-60 transition-all cursor-pointer`}
            >
              <div className="flex items-center space-x-2 truncate pr-2">
                <span className="truncate font-medium text-gray-100">
                  {selectedInvestment
                    ? `${selectedInvestment.assetName}${selectedInvestment.symbol ? ` (${selectedInvestment.symbol})` : ''} - ${selectedInvestment.broker || 'Broker'}`
                    : assetName
                    ? `${assetName} ${symbol ? `(${symbol})` : ''} - ${broker}`
                    : 'Select Stock / ETF Holding'}
                </span>
              </div>
              {isAssetDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              )}
            </button>

            {errors.investmentId && (
              <p className="text-xs text-red-400 mt-1">{errors.investmentId}</p>
            )}

            {/* Searchable Overlay Menu */}
            {isAssetDropdownOpen && !dividendToEdit && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-[#1a2234] border border-gray-700/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-72 flex flex-col">
                
                {/* Search Bar at Top */}
                <div className="p-2.5 bg-[#171e2e] border-b border-gray-800 flex items-center space-x-2 sticky top-0 z-10">
                  <Search className="w-4 h-4 text-emerald-400 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={assetSearchQuery}
                    onChange={(e) => setAssetSearchQuery(e.target.value)}
                    placeholder="Search asset, symbol or platform..."
                    className="w-full bg-transparent text-white text-xs placeholder-gray-400 focus:outline-none"
                  />
                  {assetSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setAssetSearchQuery('')}
                      className="text-gray-400 hover:text-white p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtered Investment List */}
                <div className="overflow-y-auto max-h-56 divide-y divide-gray-800/60 custom-scrollbar">
                  {filteredSearchInvestments.length === 0 ? (
                    <div className="py-6 px-4 text-center text-xs text-gray-400">
                      No dividend-eligible holdings found
                    </div>
                  ) : (
                    filteredSearchInvestments.map((inv) => {
                      const isSelected = inv.id === investmentId;
                      const brokerName = inv.broker === 'Other' && inv.customBroker ? inv.customBroker : (inv.broker || 'Broker');
                      return (
                        <button
                          key={inv.id}
                          type="button"
                          onClick={() => handleSelectInvestment(inv.id)}
                          className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-emerald-500/10 transition-colors cursor-pointer ${
                            isSelected ? 'bg-emerald-500/15 text-emerald-400 font-semibold' : 'text-gray-200'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-semibold text-white truncate flex items-center space-x-2">
                              <span>{inv.assetName}</span>
                              {inv.symbol && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">
                                  {inv.symbol}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5 flex items-center space-x-2">
                              <span>Platform: <strong className="text-gray-300">{brokerName}</strong></span>
                              <span>•</span>
                              <span>Qty: <strong className="text-gray-300">{inv.quantity || 1}</strong></span>
                            </div>
                          </div>

                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

              </div>
            )}
          </div>

          {/* Platform & Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Platform / Broker
              </label>
              <input
                type="text"
                value={broker}
                onChange={(e) => setBroker(e.target.value as BrokerType)}
                placeholder="e.g. Dhan, Groww"
                className="w-full px-3 py-2.5 bg-[#1a2234] border border-gray-700/60 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DividendStatus)}
                disabled={reinvest}
                className="w-full px-3 py-2.5 bg-[#1a2234] border border-gray-700/60 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-60"
              >
                <option value="Paid">Paid (Received)</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Declared">Declared</option>
                <option value="Reinvested">Reinvested</option>
              </select>
            </div>
          </div>

          {/* Quantity & Dividend Per Share Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Eligible Quantity / Units <span className="text-red-400">*</span>
              </label>
              <Stepper
                value={eligibleQuantity}
                onChange={(val) => setEligibleQuantity(Math.max(1, Math.round(val)))}
                min={1}
                step={1}
                className="w-full"
              />
              {errors.eligibleQuantity && (
                <p className="text-xs text-red-400 mt-1">{errors.eligibleQuantity}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Dividend Per Share (₹) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 text-sm">₹</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={dividendPerShare}
                  onChange={(e) => setDividendPerShare(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2.5 bg-[#1a2234] border border-gray-700/60 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 font-['Space_Grotesk']"
                />
              </div>
              {errors.dividendPerShare && (
                <p className="text-xs text-red-400 mt-1">{errors.dividendPerShare}</p>
              )}
            </div>
          </div>

          {/* Gross, TDS & Net Dividend Breakdown Box */}
          <div className="p-4 rounded-xl bg-[#171f30] border border-gray-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-300">
              <span className="flex items-center space-x-1.5">
                <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gross Dividend:</span>
              </span>
              <span className="font-semibold text-white font-['Space_Grotesk']">
                ₹{grossDividend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-300">
              <label className="font-medium">TDS / Tax Deducted (₹):</label>
              <div className="w-32">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1 bg-[#121824] border border-gray-700/60 rounded-lg text-right text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            {errors.tax && <p className="text-xs text-red-400 text-right">{errors.tax}</p>}

            <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Net Dividend Received:
              </span>
              <span className="text-base font-bold text-[#36E6B4] font-['Space_Grotesk']">
                ₹{netDividend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Date Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <DatePickerField
                label="Dividend Record / Ex Date"
                value={dividendDate}
                onChange={(val: string) => setDividendDate(val)}
              />
              {errors.dividendDate && (
                <p className="text-xs text-red-400 mt-1">{errors.dividendDate}</p>
              )}
            </div>

            <div>
              <DatePickerField
                label="Payment / Credit Date"
                value={paymentDate}
                onChange={(val: string) => setPaymentDate(val)}
              />
            </div>
          </div>

          {/* Dividend Reinvestment Option */}
          {!dividendToEdit && (
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reinvest}
                  onChange={(e) => setReinvest(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-xs font-medium text-purple-200 flex items-center space-x-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                  <span>Reinvest Dividend (Auto-create Purchase Transaction)</span>
                </span>
              </label>

              {reinvest && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Reinvestment Price Per Share (₹) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={reinvestPrice}
                    onChange={(e) => setReinvestPrice(e.target.value)}
                    placeholder="Enter current share price"
                    className="w-full px-3 py-2 bg-[#121824] border border-purple-500/30 rounded-lg text-white text-xs focus:outline-none focus:border-purple-400"
                  />
                  {errors.reinvestPrice && (
                    <p className="text-xs text-red-400 mt-1">{errors.reinvestPrice}</p>
                  )}
                  <p className="text-[11px] text-purple-300/70 mt-1">
                    Net Dividend (₹{netDividend}) will be logged as income AND used to record a new buy transaction.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Notes / Memo (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Q2 Interim dividend payout"
              className="w-full px-3 py-2.5 bg-[#1a2234] border border-gray-700/60 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold hover:brightness-110 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              {dividendToEdit ? 'Update Dividend' : 'Record Dividend'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
