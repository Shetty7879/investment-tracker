import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import type { Investment, AssetType, BrokerType } from '../types';
import { X } from 'lucide-react';

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  investmentToEdit?: Investment | null;
}

const TYPE_MAPPING: Record<string, AssetType> = {
  'Stock': 'Stocks',
  'ETF': 'ETFs',
  'Mutual Fund': 'Mutual Funds',
  'IPO': 'IPOs',
  'Digital Gold': 'Gold',
  'Digital Silver': 'Silver',
  'Digital Platinum': 'Platinum',
  'Crypto': 'Crypto',
  'Fixed Deposit': 'Fixed Deposits',
  'Bond': 'Bond',
  'Other': 'Other'
};

const REVERSE_TYPE_MAPPING: Record<string, string> = {
  'Stocks': 'Stock',
  'ETFs': 'ETF',
  'Mutual Funds': 'Mutual Fund',
  'IPOs': 'IPO',
  'Gold': 'Digital Gold',
  'Silver': 'Digital Silver',
  'Platinum': 'Digital Platinum',
  'Crypto': 'Crypto',
  'Fixed Deposits': 'Fixed Deposit',
  'Bond': 'Bond',
  'Other': 'Other'
};

const VALID_TYPES = ['Stock', 'ETF', 'Mutual Fund', 'IPO', 'Digital Gold', 'Digital Silver', 'Digital Platinum', 'Crypto', 'Fixed Deposit', 'Bond', 'Other'];
const VALID_BROKERS: BrokerType[] = ['Dhan', 'Lemon', 'Univest', 'PhonePe', 'FamPay', 'Groww', 'Bank', 'Other'];

const PLACEHOLDERS: Record<string, string> = {
  'Stock': 'e.g. Reliance Industries',
  'ETF': 'e.g. Tata Gold ETF',
  'Digital Gold': 'e.g. Digital Gold',
  'Digital Silver': 'e.g. Digital Silver',
  'Digital Platinum': 'e.g. Digital Platinum',
  'IPO': 'e.g. Tempsens Instruments',
  'Mutual Fund': 'e.g. Parag Parikh Flexi Cap Fund',
  'Crypto': 'e.g. Bitcoin',
  'Fixed Deposit': 'e.g. SBI Fixed Deposit',
  'Bond': 'e.g. NHAI Bond',
  'Other': 'e.g. Real Estate, Artwork'
};

export const InvestmentModal: React.FC<InvestmentModalProps> = ({
  isOpen,
  onClose,
  investmentToEdit
}) => {
  const { addInvestment, updateInvestment, formatCurrency } = useApp();

  // Form Fields
  const [name, setName] = useState('');
  const [type, setType] = useState('Stock');
  const [customType, setCustomType] = useState('');
  const [broker, setBroker] = useState<BrokerType>('Dhan');
  const [customBroker, setCustomBroker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyDate, setBuyDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill fields on edit mode or reset on new mode
  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setIsSubmitting(false);
      if (investmentToEdit) {
        setName(investmentToEdit.assetName || '');
        const mappedType = REVERSE_TYPE_MAPPING[investmentToEdit.category] || REVERSE_TYPE_MAPPING[investmentToEdit.assetType] || 'Other';
        // If the resolved type is not in VALID_TYPES, safely map to Other but preserve it if it's custom
        setType(VALID_TYPES.includes(mappedType) ? mappedType : 'Other');
        
        const storedBroker = investmentToEdit.broker as BrokerType;
        setBroker(VALID_BROKERS.includes(storedBroker) ? storedBroker : 'Other');
        
        setQuantity(investmentToEdit.quantity?.toString() || '');
        setBuyPrice(investmentToEdit.buyPrice?.toString() || '');
        setBuyDate(investmentToEdit.buyDate || investmentToEdit.purchaseDate || new Date().toISOString().split('T')[0]);
        setNotes(investmentToEdit.notes || '');

        setCustomType(investmentToEdit.customAssetType || '');
        setCustomBroker(investmentToEdit.customBroker || '');
      } else {
        setName('');
        setType('Stock');
        setCustomType('');
        setBroker('Dhan');
        setCustomBroker('');
        setQuantity('');
        setBuyPrice('');
        setBuyDate(new Date().toISOString().split('T')[0]);
        setNotes('');
      }
    }
  }, [isOpen, investmentToEdit]);

  if (!isOpen) return null;

  const handleTypeChange = (val: string) => {
    setType(val);
    if (val !== 'Other') {
      setCustomType('');
    }
  };

  const handleBrokerChange = (val: BrokerType) => {
    setBroker(val);
    if (val !== 'Other') {
      setCustomBroker('');
    }
  };

  // Real-time calculated invested amount
  const qtyNum = parseFloat(quantity);
  const priceNum = parseFloat(buyPrice);
  const investedAmount = (!isNaN(qtyNum) && !isNaN(priceNum) && qtyNum > 0 && priceNum > 0)
    ? qtyNum * priceNum
    : 0;

  const validate = () => {
    const tempErrors: Record<string, string> = {};

    if (!name.trim()) {
      tempErrors.name = 'Investment Name is required.';
    }
    if (!type) {
      tempErrors.type = 'Investment Type is required.';
    }
    if (type === 'Other' && !customType.trim()) {
      tempErrors.customType = 'Please specify the investment type.';
    }
    if (!broker) {
      tempErrors.broker = 'Broker / Platform is required.';
    }
    if (broker === 'Other' && !customBroker.trim()) {
      tempErrors.customBroker = 'Please specify the platform.';
    }
    if (!quantity || isNaN(qtyNum) || qtyNum <= 0) {
      tempErrors.quantity = 'Quantity / Units must be greater than 0.';
    }
    if (!buyPrice || isNaN(priceNum) || priceNum <= 0) {
      tempErrors.buyPrice = 'Buy Price / Price per Unit must be greater than 0.';
    }
    if (!buyDate) {
      tempErrors.buyDate = 'Buy Date is required.';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const category = TYPE_MAPPING[type] || 'Other';
    
    // Structure standard payload
    const payload: Omit<Investment, 'id'> = {
      assetName: name.trim(),
      category,
      assetType: category,
      broker: broker,
      quantity: qtyNum,
      buyPrice: priceNum,
      buyDate: buyDate,
      purchaseDate: buyDate,
      notes: notes.trim() || undefined,
      owner: 'Me',
      charges: 0,
      isDemo: false,
      customAssetType: type === 'Other' ? customType.trim() : undefined,
      customBroker: broker === 'Other' ? customBroker.trim() : undefined
    } as Omit<Investment, 'id'>;

    try {
      if (investmentToEdit) {
        // Safe updates: preserve old properties not managed by this form, if any
        updateInvestment({
          ...investmentToEdit,
          ...payload,
          updatedAt: new Date().toISOString()
        });
      } else {
        addInvestment(payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setErrors({ submit: 'Failed to save investment. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm overflow-y-auto font-semibold animate-fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-855 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-modal-enter">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-855">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {investmentToEdit ? 'Edit Investment Details' : 'Record New Investment'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-500/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
          {errors.submit && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-semibold">
              {errors.submit}
            </div>
          )}

          {/* Investment Name */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
              Investment Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={PLACEHOLDERS[type] || 'e.g. Reliance Industries'}
              className={`w-full rounded-xl border ${
                errors.name ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/10'
              } bg-transparent py-2.5 px-3.5 text-sm outline-none focus:ring-4 text-slate-955 dark:text-white transition-all`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Investment Type */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                Investment Type *
              </label>
              <select
                value={type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-955 dark:text-white transition-all dark:bg-[#0d0f17]"
              >
                {VALID_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Broker / Platform */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                Platform / Broker *
              </label>
              <select
                value={broker}
                onChange={(e) => handleBrokerChange(e.target.value as BrokerType)}
                className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-955 dark:text-white transition-all dark:bg-[#0d0f17]"
              >
                {VALID_BROKERS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Specify Investment Type when "Other" selected */}
          {type === 'Other' && (
            <div className="animate-slide-in">
              <label className="block text-xs font-bold text-slate-405 dark:text-slate-500 mb-2 uppercase tracking-wider">
                Specify Investment Type *
              </label>
              <input
                type="text"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="e.g. Real Estate, Artwork, P2P Lending"
                className={`w-full rounded-xl border ${
                  errors.customType ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                } bg-transparent py-2.5 px-3.5 text-sm outline-none text-slate-955 dark:text-white transition-all`}
              />
              {errors.customType && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.customType}</p>}
            </div>
          )}

          {/* Specify Platform when "Other" selected */}
          {broker === 'Other' && (
            <div className="animate-slide-in">
              <label className="block text-xs font-bold text-slate-405 dark:text-slate-500 mb-2 uppercase tracking-wider">
                Specify Platform *
              </label>
              <input
                type="text"
                value={customBroker}
                onChange={(e) => setCustomBroker(e.target.value)}
                placeholder="e.g. Paytm, Kuvera, Local Bank"
                className={`w-full rounded-xl border ${
                  errors.customBroker ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                } bg-transparent py-2.5 px-3.5 text-sm outline-none text-slate-955 dark:text-white transition-all`}
              />
              {errors.customBroker && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.customBroker}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quantity / Units */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                Quantity / Units *
              </label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className={`w-full rounded-xl border ${
                  errors.quantity ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                } bg-transparent py-2.5 px-3.5 text-sm outline-none text-slate-955 dark:text-white transition-all`}
              />
              {errors.quantity && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.quantity}</p>}
            </div>

            {/* Buy Price / Price per Unit */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                Buy Price / Price per Unit *
              </label>
              <input
                type="number"
                step="any"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                placeholder="0.00"
                className={`w-full rounded-xl border ${
                  errors.buyPrice ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                } bg-transparent py-2.5 px-3.5 text-sm outline-none text-slate-955 dark:text-white transition-all`}
              />
              {errors.buyPrice && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.buyPrice}</p>}
            </div>
          </div>

          {/* Invested Amount Card */}
          <div className="bg-indigo-500/[0.02] dark:bg-indigo-500/[0.04] border border-indigo-500/10 rounded-2xl p-4.5 flex justify-between items-center text-xs font-bold shadow-sm">
            <div>
              <span className="text-slate-400 dark:text-slate-550 block text-[9px] uppercase tracking-wider mb-0.5">Calculated Principal</span>
              <span className="text-slate-405 font-medium">{quantity || '0'} × {buyPrice || '0.00'}</span>
            </div>
            <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(investedAmount)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Buy Date */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                Buy Date *
              </label>
              <input
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                className={`w-full rounded-xl border ${
                  errors.buyDate ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                } bg-transparent py-2.5 px-3.5 text-sm outline-none text-slate-955 dark:text-white transition-all`}
              />
              {errors.buyDate && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.buyDate}</p>}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Long term hold"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-955 dark:text-white transition-all"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-150 dark:border-slate-855">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : investmentToEdit ? 'Save Changes' : 'Record Investment'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
