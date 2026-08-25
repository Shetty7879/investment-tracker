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

const VALID_TYPES = [
  'Stock', 'ETF', 'Mutual Fund', 'IPO', 'Digital Gold',
  'Digital Silver', 'Digital Platinum', 'Crypto', 'Fixed Deposit', 'Bond', 'Other'
];
const VALID_BROKERS: BrokerType[] = ['Dhan', 'Lemon', 'Univest', 'PhonePe', 'FamPay', 'Groww', 'Bank', 'Other'];

const ALLOTMENT_STATUSES = ['Applied', 'Allotted', 'Not Allotted'] as const;
type AllotmentStatusType = typeof ALLOTMENT_STATUSES[number];

const PLACEHOLDERS: Record<string, string> = {
  'Stock': 'e.g. Reliance Industries',
  'ETF': 'e.g. Tata Gold ETF',
  'Digital Gold': 'e.g. Digital Gold',
  'Digital Silver': 'e.g. Digital Silver',
  'Digital Platinum': 'e.g. Digital Platinum',
  'IPO': 'e.g. ABC Technologies IPO',
  'Mutual Fund': 'e.g. Parag Parikh Flexi Cap Fund',
  'Crypto': 'e.g. Bitcoin',
  'Fixed Deposit': 'e.g. SBI Fixed Deposit',
  'Bond': 'e.g. NHAI Bond',
  'Other': 'e.g. Real Estate, Artwork'
};

const inputClass = (error?: string) =>
  `w-full rounded-xl border ${
    error
      ? 'border-red-500 focus:ring-red-500/10'
      : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/10'
  } bg-transparent py-2.5 px-3.5 text-sm outline-none focus:ring-4 text-slate-900 dark:text-white transition-all`;

export const InvestmentModal: React.FC<InvestmentModalProps> = ({
  isOpen,
  onClose,
  investmentToEdit
}) => {
  const { addInvestment, updateInvestment, formatCurrency } = useApp();

  // ── Common fields ──────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [type, setType] = useState('Stock');
  const [customType, setCustomType] = useState('');
  const [broker, setBroker] = useState<BrokerType>('Dhan');
  const [customBroker, setCustomBroker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyDate, setBuyDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // ── Mutual Fund-specific fields ───────────────────────────────────
  const [mfInvestmentAmount, setMfInvestmentAmount] = useState('');
  const [mfNav, setMfNav] = useState('');
  const [mfUnits, setMfUnits] = useState('');

  const handleMfAmountChange = (val: string) => {
    setMfInvestmentAmount(val);
    const amt = parseFloat(val);
    const nav = parseFloat(mfNav);
    if (!isNaN(amt) && !isNaN(nav) && nav > 0) {
      const computedUnits = amt / nav;
      const unitsStr = computedUnits.toFixed(4);
      setMfUnits(unitsStr);
      setQuantity(unitsStr);
    } else {
      setMfUnits('');
      setQuantity('');
    }
  };

  const handleMfNavChange = (val: string) => {
    setMfNav(val);
    setBuyPrice(val);
    const nav = parseFloat(val);

    // Check if we have amount, if so update units
    if (mfInvestmentAmount && !isNaN(nav) && nav > 0) {
      const amt = parseFloat(mfInvestmentAmount);
      if (!isNaN(amt)) {
        const computedUnits = amt / nav;
        const unitsStr = computedUnits.toFixed(4);
        setMfUnits(unitsStr);
        setQuantity(unitsStr);
        return;
      }
    }

    // Check if we have units, if so update amount
    if (mfUnits && !isNaN(nav)) {
      const units = parseFloat(mfUnits);
      if (!isNaN(units)) {
        const computedAmt = units * nav;
        setMfInvestmentAmount(computedAmt.toFixed(2));
      }
    }
  };

  const handleMfUnitsChange = (val: string) => {
    setMfUnits(val);
    setQuantity(val);
    const units = parseFloat(val);
    const nav = parseFloat(mfNav);
    if (!isNaN(units) && !isNaN(nav)) {
      const computedAmt = units * nav;
      setMfInvestmentAmount(computedAmt.toFixed(2));
    } else {
      setMfInvestmentAmount('');
    }
  };

  // ── IPO-specific fields ────────────────────────────────────────────
  const [priceLow, setPriceLow] = useState('');
  const [priceHigh, setPriceHigh] = useState('');
  const [finalAllotmentPrice, setFinalAllotmentPrice] = useState('');
  const [appliedLots, setAppliedLots] = useState('');
  const [sharesPerLot, setSharesPerLot] = useState('');
  const [allottedLots, setAllottedLots] = useState('');
  const [allotmentStatus, setAllotmentStatus] = useState<AllotmentStatusType>('Applied');
  const [applicationDate, setApplicationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [listingDate, setListingDate] = useState('');

  // ── UI state ───────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isIPO = type === 'IPO';

  // ── Pre-fill / reset on open ───────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setIsSubmitting(false);

    if (investmentToEdit) {
      const mappedType =
        REVERSE_TYPE_MAPPING[investmentToEdit.category] ||
        REVERSE_TYPE_MAPPING[investmentToEdit.assetType] ||
        'Other';
      const resolvedType = VALID_TYPES.includes(mappedType) ? mappedType : 'Other';
      setType(resolvedType);
      setName(investmentToEdit.assetName || '');

      const storedBroker = investmentToEdit.broker as BrokerType;
      setBroker(VALID_BROKERS.includes(storedBroker) ? storedBroker : 'Other');
      setCustomBroker(investmentToEdit.customBroker || '');
      setCustomType(investmentToEdit.customAssetType || '');
      setNotes(investmentToEdit.notes || '');

      if (resolvedType === 'IPO') {
        // Restore IPO-specific fields with fallbacks for legacy records
        const legacyPrice = (investmentToEdit.issuePrice ?? investmentToEdit.ipoAllotmentPrice ?? investmentToEdit.buyPrice ?? '').toString();
        const storedPriceLow = (investmentToEdit.priceLow ?? '').toString();
        const storedPriceHigh = (investmentToEdit.priceHigh ?? '').toString();

        setPriceLow(storedPriceLow || legacyPrice);
        setPriceHigh(storedPriceHigh || legacyPrice);
        setFinalAllotmentPrice(
          (investmentToEdit.ipoAllotmentPrice ?? investmentToEdit.issuePrice ?? investmentToEdit.buyPrice ?? '').toString()
        );

        setAppliedLots(
          (investmentToEdit.appliedLots ?? investmentToEdit.ipoLotsApplied ?? '').toString()
        );
        setSharesPerLot(
          (investmentToEdit.sharesPerLot ?? '').toString()
        );
        setAllottedLots(
          (investmentToEdit.allottedLots ?? investmentToEdit.ipoQuantityAllotted ?? '').toString()
        );
        // Map legacy ipoAllotmentStatus values to new simplified set
        const legacyStatus = investmentToEdit.allotmentStatus || (investmentToEdit.ipoAllotmentStatus as string) || 'Applied';
        const statusMap: Record<string, AllotmentStatusType> = {
          'Applied': 'Applied',
          'Allotted': 'Allotted',
          'Partially Allotted': 'Allotted',
          'Listed': 'Allotted',
          'Sold': 'Allotted',
          'Not Allotted': 'Not Allotted',
          'Refunded': 'Not Allotted',
          'Refund Pending': 'Not Allotted',
          'Allocation Pending': 'Applied',
          'Payment Pending': 'Applied',
          'Withdrawn': 'Not Allotted',
        };
        setAllotmentStatus(statusMap[legacyStatus] || 'Applied');
        setApplicationDate(
          investmentToEdit.applicationDate || investmentToEdit.buyDate || investmentToEdit.purchaseDate ||
          new Date().toISOString().split('T')[0]
        );
        setListingDate(investmentToEdit.listingDate || '');
        // Reset standard fields (not used for IPO)
        setQuantity('');
        setBuyPrice('');
        setBuyDate(new Date().toISOString().split('T')[0]);
      } else {
        const qtyVal = investmentToEdit.quantity ?? investmentToEdit.units ?? 0;
        const priceVal = investmentToEdit.buyPrice ?? investmentToEdit.nav ?? 0;

        setQuantity(qtyVal ? qtyVal.toString() : '');
        setBuyPrice(priceVal ? priceVal.toString() : '');
        setBuyDate(
          investmentToEdit.buyDate || investmentToEdit.purchaseDate || new Date().toISOString().split('T')[0]
        );

        if (resolvedType === 'Mutual Fund') {
          const amtVal = qtyVal * priceVal;
          setMfUnits(qtyVal ? qtyVal.toString() : '');
          setMfNav(priceVal ? priceVal.toString() : '');
          setMfInvestmentAmount(amtVal ? amtVal.toFixed(2) : '');
        } else {
          setMfUnits('');
          setMfNav('');
          setMfInvestmentAmount('');
        }

        // Clear IPO fields
        setPriceLow('');
        setPriceHigh('');
        setFinalAllotmentPrice('');
        setAppliedLots('');
        setSharesPerLot('');
        setAllottedLots('');
        setAllotmentStatus('Applied');
        setApplicationDate(new Date().toISOString().split('T')[0]);
        setListingDate('');
      }
    } else {
      // New investment – full reset
      setName('');
      setType('Stock');
      setCustomType('');
      setBroker('Dhan');
      setCustomBroker('');
      setQuantity('');
      setBuyPrice('');
      setBuyDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setPriceLow('');
      setPriceHigh('');
      setFinalAllotmentPrice('');
      setAppliedLots('');
      setSharesPerLot('');
      setAllottedLots('');
      setAllotmentStatus('Applied');
      setApplicationDate(new Date().toISOString().split('T')[0]);
      setListingDate('');

      setMfUnits('');
      setMfNav('');
      setMfInvestmentAmount('');
    }
  }, [isOpen, investmentToEdit]);

  if (!isOpen) return null;

  // ── Computed values ────────────────────────────────────────────────
  const priceLowNum = parseFloat(priceLow);
  const priceHighNum = parseFloat(priceHigh);
  const finalPriceNum = parseFloat(finalAllotmentPrice);
  const appliedLotsNum = parseFloat(appliedLots);
  const sharesPerLotNum = parseFloat(sharesPerLot);
  const allottedLotsNum = parseFloat(allottedLots);

  // IPO invested amount: only counts if Allotted
  const ipoInvestedAmount =
    allotmentStatus === 'Allotted' &&
    !isNaN(allottedLotsNum) && allottedLotsNum > 0 &&
    !isNaN(sharesPerLotNum) && sharesPerLotNum > 0 &&
    !isNaN(finalPriceNum) && finalPriceNum > 0
      ? allottedLotsNum * sharesPerLotNum * finalPriceNum
      : 0;

  // Applied amount (for display only) using the upper price (priceHigh)
  const ipoAppliedAmount =
    !isNaN(appliedLotsNum) && appliedLotsNum > 0 &&
    !isNaN(sharesPerLotNum) && sharesPerLotNum > 0 &&
    !isNaN(priceHighNum) && priceHighNum > 0
      ? appliedLotsNum * sharesPerLotNum * priceHighNum
      : 0;

  // Standard qty * price
  const qtyNum = parseFloat(quantity);
  const priceNum = parseFloat(buyPrice);
  const standardInvestedAmount =
    !isNaN(qtyNum) && !isNaN(priceNum) && qtyNum > 0 && priceNum > 0
      ? qtyNum * priceNum
      : 0;

  // ── Handlers ───────────────────────────────────────────────────────
  const handleTypeChange = (val: string) => {
    setType(val);
    if (val !== 'Other') setCustomType('');

    setMfInvestmentAmount('');
    setMfNav('');
    setMfUnits('');
    setQuantity('');
    setBuyPrice('');
  };

  const handleBrokerChange = (val: BrokerType) => {
    setBroker(val);
    if (val !== 'Other') setCustomBroker('');
  };

  // ── Validation ─────────────────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {};

    if (type === 'Other') {
      if (!name.trim()) {
        errs.name = 'Asset description / details is required.';
      } else if (name.trim().toLowerCase() === 'other') {
        errs.name = 'Investment Name cannot be "Other". Please describe the specific asset.';
      }
      if (!customType.trim()) {
        errs.customType = 'Investment Name is required.';
      }
    } else if (isIPO) {
      if (!name.trim()) {
        errs.name = 'IPO / Company Name is required.';
      }
    } else {
      if (!name.trim()) {
        errs.name = 'Investment Name is required.';
      }
    }

    if (!type) errs.type = 'Investment Type is required.';
    if (!broker) errs.broker = 'Broker / Platform is required.';
    if (broker === 'Other' && !customBroker.trim()) errs.customBroker = 'Please specify the platform.';

    if (isIPO) {
      if (!priceLow || isNaN(priceLowNum) || priceLowNum <= 0)
        errs.priceLow = 'Lower Price must be greater than 0.';
      if (!priceHigh || isNaN(priceHighNum) || priceHighNum <= 0)
        errs.priceHigh = 'Upper Price must be greater than 0.';
      if (priceLow && priceHigh && priceLowNum > priceHighNum)
        errs.priceHigh = 'Upper Price cannot be less than Lower Price.';
      if (!appliedLots || isNaN(appliedLotsNum) || appliedLotsNum <= 0)
        errs.appliedLots = 'Applied Lots must be greater than 0.';
      if (!sharesPerLot || isNaN(sharesPerLotNum) || sharesPerLotNum <= 0)
        errs.sharesPerLot = 'Shares per Lot must be greater than 0.';
      if (allotmentStatus === 'Allotted') {
        if (allottedLots === '' || isNaN(allottedLotsNum) || allottedLotsNum < 0)
          errs.allottedLots = 'Allotted Lots must be 0 or more.';
        else if (!isNaN(appliedLotsNum) && allottedLotsNum > appliedLotsNum)
          errs.allottedLots = 'Allotted Lots cannot exceed Applied Lots.';

        if (!finalAllotmentPrice || isNaN(finalPriceNum) || finalPriceNum <= 0)
          errs.finalAllotmentPrice = 'Final / Allotted Price must be greater than 0.';
      }
      if (!applicationDate) errs.applicationDate = 'Application Date is required.';
    } else {
      if (!quantity || isNaN(qtyNum) || qtyNum <= 0)
        errs.quantity = 'Quantity / Units must be greater than 0.';
      if (!buyPrice || isNaN(priceNum) || priceNum <= 0)
        errs.buyPrice = 'Buy Price / Price per Unit must be greater than 0.';
      if (!buyDate) errs.buyDate = 'Buy Date is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const category = TYPE_MAPPING[type] || 'Other';

    let payload: Omit<Investment, 'id'>;

    if (isIPO) {
      // Derive quantity & buyPrice from IPO fields for backward compat
      const effectiveQuantity =
        allotmentStatus === 'Allotted' && !isNaN(allottedLotsNum) && !isNaN(sharesPerLotNum)
          ? allottedLotsNum * sharesPerLotNum
          : appliedLotsNum * sharesPerLotNum;

      const finalPrice = allotmentStatus === 'Allotted' ? finalPriceNum : priceHighNum;
      const investedAmt = ipoInvestedAmount;

      payload = {
        assetName: name.trim(),
        category,
        assetType: category,
        broker,
        quantity: effectiveQuantity,
        buyPrice: finalPrice || 0,
        buyDate: applicationDate,
        purchaseDate: applicationDate,
        notes: notes.trim() || undefined,
        owner: 'Me',
        charges: 0,
        isDemo: false,
        customAssetType: undefined,
        customBroker: broker === 'Other' ? customBroker.trim() : undefined,
        investedAmount: investedAmt,
        // New IPO fields
        companyName: name.trim(),
        issuePrice: finalPrice || 0,
        appliedLots: appliedLotsNum,
        sharesPerLot: sharesPerLotNum,
        allottedLots: allotmentStatus === 'Allotted' ? allottedLotsNum : 0,
        allotmentStatus,
        applicationDate,
        listingDate: listingDate || undefined,
        priceLow: priceLowNum,
        priceHigh: priceHighNum,
        appliedAmount: appliedLotsNum * sharesPerLotNum * priceHighNum,
        // Keep legacy fields for service layer compatibility
        ipoLotsApplied: appliedLotsNum,
        ipoQuantityApplied: appliedLotsNum * sharesPerLotNum,
        ipoAllotmentStatus: allotmentStatus === 'Allotted' ? 'Allotted'
          : allotmentStatus === 'Not Allotted' ? 'Not Allotted'
          : 'Applied',
        ipoQuantityAllotted: allotmentStatus === 'Allotted' ? allottedLotsNum * sharesPerLotNum : 0,
        ipoAllotmentPrice: finalPrice || 0,
      } as Omit<Investment, 'id'>;
    } else {
      const isMF = type === 'Mutual Fund';
      payload = {
        assetName: name.trim(),
        category,
        assetType: category,
        broker,
        quantity: qtyNum,
        buyPrice: priceNum,
        buyDate,
        purchaseDate: buyDate,
        notes: notes.trim() || undefined,
        owner: 'Me',
        charges: 0,
        isDemo: false,
        customAssetType: type === 'Other' ? customType.trim() : undefined,
        customBroker: broker === 'Other' ? customBroker.trim() : undefined,
        ...(isMF ? { units: qtyNum, nav: priceNum, investedAmount: standardInvestedAmount } : {})
      } as Omit<Investment, 'id'>;
    }

    try {
      if (investmentToEdit) {
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

  // ── Allotment status badge color ───────────────────────────────────
  const statusColor: Record<AllotmentStatusType, string> = {
    'Applied': 'text-amber-700 bg-amber-50 border-amber-300 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20',
    'Allotted': 'text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20',
    'Not Allotted': 'text-red-700 bg-red-50 border-red-300 dark:text-red-400 dark:bg-red-500/10 dark:border-red-500/20',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm overflow-y-auto font-semibold animate-fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] animate-modal-enter">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {investmentToEdit ? 'Edit Investment Details' : 'Record New Investment'}
            </h3>
            {isIPO && (
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5 font-semibold">
                📋 IPO Application Form
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
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

          {/* ── Investment Name / IPO / Company Name ── */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-550 mb-2 uppercase tracking-wider">
              {isIPO ? '📋 IPO / Company Name *' : type === 'Other' ? 'Asset Description / Details *' : 'Investment Name *'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isIPO ? 'e.g. ABC Technologies Ltd. IPO' : PLACEHOLDERS[type] || 'e.g. Reliance Industries'}
              className={inputClass(errors.name)}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.name}</p>}
          </div>

          {/* ── Type & Broker ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                Investment Type *
              </label>
              <select
                value={type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-900 dark:text-white transition-all dark:bg-[#0d0f17]"
              >
                {VALID_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                Platform / Broker *
              </label>
              <select
                value={broker}
                onChange={(e) => handleBrokerChange(e.target.value as BrokerType)}
                className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-900 dark:text-white transition-all dark:bg-[#0d0f17]"
              >
                {VALID_BROKERS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom type - named Investment Name for type === 'Other' */}
          {type === 'Other' && (
            <div className="animate-slide-in">
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-550 mb-2 uppercase tracking-wider">
                Investment Name *
              </label>
              <input
                type="text"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="e.g. Real Estate, Artwork, Collectible, Other Asset"
                className={inputClass(errors.customType)}
              />
              {errors.customType && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.customType}</p>}
            </div>
          )}

          {/* Custom broker */}
          {broker === 'Other' && (
            <div className="animate-slide-in">
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                Specify Platform *
              </label>
              <input
                type="text"
                value={customBroker}
                onChange={(e) => setCustomBroker(e.target.value)}
                placeholder="e.g. Paytm, Kuvera, Local Bank"
                className={inputClass(errors.customBroker)}
              />
              {errors.customBroker && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.customBroker}</p>}
            </div>
          )}

          {/* ── IPO-SPECIFIC SECTION ────────────────────────────────────────── */}
          {isIPO && (
            <div className="animate-slide-in space-y-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.03] p-4">
              <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                IPO Details
              </p>

              {/* Price Band (Lower Price, Upper Price) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-550 mb-2 uppercase tracking-wider">
                    💰 Lower Price *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={priceLow}
                    onChange={(e) => setPriceLow(e.target.value)}
                    placeholder="280"
                    className={inputClass(errors.priceLow)}
                  />
                  {errors.priceLow && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.priceLow}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-550 mb-2 uppercase tracking-wider">
                    💰 Upper Price *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={priceHigh}
                    onChange={(e) => setPriceHigh(e.target.value)}
                    placeholder="300"
                    className={inputClass(errors.priceHigh)}
                  />
                  {errors.priceHigh && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.priceHigh}</p>}
                </div>
              </div>

              {/* Lots & Shares per lot */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-550 mb-2 uppercase tracking-wider">
                    📦 Applied Lots *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={appliedLots}
                    onChange={(e) => setAppliedLots(e.target.value)}
                    placeholder="1"
                    className={inputClass(errors.appliedLots)}
                  />
                  {errors.appliedLots && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.appliedLots}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-550 mb-2 uppercase tracking-wider">
                    🔢 Shares / Lot *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={sharesPerLot}
                    onChange={(e) => setSharesPerLot(e.target.value)}
                    placeholder="50"
                    className={inputClass(errors.sharesPerLot)}
                  />
                  {errors.sharesPerLot && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.sharesPerLot}</p>}
                </div>
              </div>

              {/* Applied Amount display */}
              {ipoAppliedAmount > 0 && (
                <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-3 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">
                    Applied Amount ({appliedLots} lot{appliedLotsNum !== 1 ? 's' : ''} × {sharesPerLot} × ₹{priceHigh})
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-extrabold text-sm">
                    {formatCurrency(ipoAppliedAmount)}
                  </span>
                </div>
              )}

              {/* Allotment Status */}
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-550 mb-2 uppercase tracking-wider">
                  📌 Allotment Status *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {ALLOTMENT_STATUSES.map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setAllotmentStatus(status)}
                      className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                        allotmentStatus === status
                          ? statusColor[status] + ' ring-2 ring-offset-1 ring-offset-transparent ring-current shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allotted Details – only when status = Allotted */}
              {allotmentStatus === 'Allotted' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-550 mb-2 uppercase tracking-wider">
                      🎟️ Allotted Lots *
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={allottedLots}
                      onChange={(e) => setAllottedLots(e.target.value)}
                      placeholder="e.g. 1"
                      className={inputClass(errors.allottedLots)}
                    />
                    {errors.allottedLots && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.allottedLots}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-550 mb-2 uppercase tracking-wider">
                      💰 Final / Allotted Price Per Share *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={finalAllotmentPrice}
                      onChange={(e) => setFinalAllotmentPrice(e.target.value)}
                      placeholder="e.g. ₹300"
                      className={inputClass(errors.finalAllotmentPrice)}
                    />
                    {errors.finalAllotmentPrice && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.finalAllotmentPrice}</p>}
                  </div>
                </div>
              )}

              {/* Status info banners */}
              {allotmentStatus === 'Applied' && (
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-4 py-3 text-xs text-amber-700 dark:text-amber-300 font-semibold">
                  ⏳ Applied – this IPO will not be counted in invested capital until allotted.
                </div>
              )}
              {allotmentStatus === 'Not Allotted' && (
                <div className="rounded-xl bg-red-500/5 border border-red-500/15 px-4 py-3 text-xs text-red-600 dark:text-red-400 font-semibold">
                  ❌ Not Allotted – no capital will be counted. Record kept for history.
                </div>
              )}

              {/* Invested Amount (read-only) */}
              <div className="bg-indigo-500/[0.04] border border-indigo-500/15 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">
                    Total Invested Amount
                  </span>
                  {allotmentStatus === 'Applied' && ipoAppliedAmount > 0 ? (
                    <span className="text-slate-500 text-xs font-medium">
                      ₹0 (Pending allotment: {formatCurrency(ipoAppliedAmount)})
                    </span>
                  ) : allotmentStatus === 'Allotted' && ipoInvestedAmount > 0 ? (
                    <span className="text-slate-500 text-xs font-medium">
                      {allottedLots} lot{allottedLotsNum !== 1 ? 's' : ''} × {sharesPerLot} shares × ₹{finalAllotmentPrice}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs font-medium italic">Not counted until allotted</span>
                  )}
                </div>
                <span className={`text-lg font-extrabold ${ipoInvestedAmount > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-600'}`}>
                  {ipoInvestedAmount > 0 ? formatCurrency(ipoInvestedAmount) : '₹0'}
                </span>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STANDARD FIELDS (non-IPO)
          ═══════════════════════════════════════════════════════════ */}
          {!isIPO && (
            <>
              {type === 'Mutual Fund' ? (
                // Mutual Fund specific inputs
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                        Investment Amount (₹) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={mfInvestmentAmount}
                        onChange={(e) => handleMfAmountChange(e.target.value)}
                        placeholder="0.00"
                        className={inputClass(errors.quantity || errors.buyPrice)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                        NAV (₹ per unit) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={mfNav}
                        onChange={(e) => handleMfNavChange(e.target.value)}
                        placeholder="0.00"
                        className={inputClass(errors.buyPrice)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                        Units *
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={mfUnits}
                        onChange={(e) => handleMfUnitsChange(e.target.value)}
                        placeholder="0.0000"
                        className={inputClass(errors.quantity)}
                      />
                    </div>
                  </div>
                  {(errors.quantity || errors.buyPrice) && (
                    <p className="text-red-500 text-xs mt-1 font-semibold">
                      {errors.quantity || errors.buyPrice}
                    </p>
                  )}
                </div>
              ) : (
                // Standard fields
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className={inputClass(errors.quantity)}
                    />
                    {errors.quantity && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.quantity}</p>}
                  </div>

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
                      className={inputClass(errors.buyPrice)}
                    />
                    {errors.buyPrice && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.buyPrice}</p>}
                  </div>
                </div>
              )}

              {/* Invested Amount Card */}
              <div className="bg-indigo-500/[0.02] dark:bg-indigo-500/[0.04] border border-indigo-500/10 rounded-2xl p-4 flex justify-between items-center text-xs font-bold shadow-sm">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase tracking-wider mb-0.5">Calculated Principal</span>
                  {type === 'Mutual Fund' ? (
                    <span className="text-slate-400 font-medium">{mfUnits || '0'} units × ₹{mfNav || '0.00'} NAV</span>
                  ) : (
                    <span className="text-slate-400 font-medium">{quantity || '0'} × {buyPrice || '0.00'}</span>
                  )}
                </div>
                <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(standardInvestedAmount)}
                </span>
              </div>
            </>
          )}

          {/* ── Date fields ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                {isIPO ? '📅 Application Date *' : 'Buy Date *'}
              </label>
              <input
                type="date"
                value={isIPO ? applicationDate : buyDate}
                onChange={(e) => isIPO ? setApplicationDate(e.target.value) : setBuyDate(e.target.value)}
                className={inputClass(isIPO ? errors.applicationDate : errors.buyDate)}
              />
              {(isIPO ? errors.applicationDate : errors.buyDate) && (
                <p className="text-red-500 text-xs mt-1 font-semibold">
                  {isIPO ? errors.applicationDate : errors.buyDate}
                </p>
              )}
            </div>

            {isIPO ? (
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                  🗓️ Listing Date (Optional)
                </label>
                <input
                  type="date"
                  value={listingDate}
                  onChange={(e) => setListingDate(e.target.value)}
                  className={inputClass()}
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Long term hold"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-900 dark:text-white transition-all"
                />
              </div>
            )}
          </div>

          {/* Notes (IPO) */}
          {isIPO && (
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional IPO application notes"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-900 dark:text-white transition-all"
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-150 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0f17] text-slate-700 dark:text-slate-350 font-bold text-sm hover:bg-indigo-50/40 hover:border-indigo-500/20 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : investmentToEdit ? 'Save Changes' : isIPO ? 'Submit IPO Application' : 'Record Investment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
