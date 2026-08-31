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
  const [mfEditHistory, setMfEditHistory] = useState<('amount' | 'nav' | 'units')[]>(['amount', 'nav', 'units']);

  // ── Commodity-specific fields ──────────────────────────────────────
  const [currentPricePerGram, setCurrentPricePerGram] = useState('');
  const [manuallyEnteredInvestedAmount, setManuallyEnteredInvestedAmount] = useState('');
  const [manuallyEnteredCurrentValue, setManuallyEnteredCurrentValue] = useState('');
  const [weightUnit, setWeightUnit] = useState<'g' | 'mg'>('g');

  // ── Fixed Deposit-specific fields ─────────────────────────────────
  const [fdPrincipalAmount, setFdPrincipalAmount] = useState('');
  const [fdInterestRate, setFdInterestRate] = useState('');
  const [fdTenureYears, setFdTenureYears] = useState('0');
  const [fdTenureMonths, setFdTenureMonths] = useState('0');
  const [fdTenureDays, setFdTenureDays] = useState('0');
  const [fdMaturityAmount, setFdMaturityAmount] = useState('');
  const [fdMaturityDate, setFdMaturityDate] = useState('');
  const [fdCompoundingFrequency, setFdCompoundingFrequency] = useState<'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly'>('Quarterly');

  // Auto-calculate FD Maturity Date when Start Date or Tenure changes
  React.useEffect(() => {
    if (type === 'Fixed Deposit' && buyDate) {
      const y = parseInt(fdTenureYears || '0', 10);
      const m = parseInt(fdTenureMonths || '0', 10);
      const d = parseInt(fdTenureDays || '0', 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d) && (y > 0 || m > 0 || d > 0)) {
        const date = new Date(buyDate);
        if (!isNaN(date.getTime())) {
          if (y > 0) date.setFullYear(date.getFullYear() + y);
          if (m > 0) date.setMonth(date.getMonth() + m);
          if (d > 0) date.setDate(date.getDate() + d);
          setFdMaturityDate(date.toISOString().split('T')[0]);
        }
      }
    }
  }, [type, buyDate, fdTenureYears, fdTenureMonths, fdTenureDays]);

  const handleMfFieldChange = (field: 'amount' | 'nav' | 'units', val: string) => {
    // 1. Update the field's own state immediately
    if (field === 'amount') {
      setMfInvestmentAmount(val);
    } else if (field === 'nav') {
      setMfNav(val);
      setBuyPrice(val);
    } else if (field === 'units') {
      setMfUnits(val);
      setQuantity(val);
    }

    // 2. Update edit history
    const nextHistory = [field, ...mfEditHistory.filter(f => f !== field)];
    setMfEditHistory(nextHistory);

    // 3. Determine values for calculation
    const currentValues = {
      amount: field === 'amount' ? val : mfInvestmentAmount,
      nav: field === 'nav' ? val : mfNav,
      units: field === 'units' ? val : mfUnits
    };

    const activeField = nextHistory[0];     // The one currently being edited (user input)
    const secondaryField = nextHistory[1];  // The other user-defined input
    const dependentField = nextHistory[2];  // The field to be calculated

    const vActive = parseFloat(currentValues[activeField]);
    const vSecondary = parseFloat(currentValues[secondaryField]);

    if (isNaN(vActive) || isNaN(vSecondary) || vActive <= 0 || vSecondary <= 0) {
      // If either input is invalid or <= 0, we don't calculate dependent fields aggressively.
      // E.g., if typing "0." or intermediate empty states, do not trigger NaN/Infinity updates.
      return;
    }

    // 4. Calculate dependent field
    if (dependentField === 'amount') {
      // amount = nav * units
      const computedVal = vActive * vSecondary;
      setMfInvestmentAmount(computedVal.toFixed(2));
    } else if (dependentField === 'units') {
      // units = amount / nav
      const amtVal = activeField === 'amount' ? vActive : vSecondary;
      const navVal = activeField === 'nav' ? vActive : vSecondary;
      if (navVal > 0) {
        const computedVal = amtVal / navVal;
        const unitsStr = computedVal.toFixed(4);
        setMfUnits(unitsStr);
        setQuantity(unitsStr);
      }
    } else if (dependentField === 'nav') {
      // nav = amount / units
      const amtVal = activeField === 'amount' ? vActive : vSecondary;
      const unitsVal = activeField === 'units' ? vActive : vSecondary;
      if (unitsVal > 0) {
        const computedVal = amtVal / unitsVal;
        const navStr = computedVal.toFixed(4);
        setMfNav(navStr);
        setBuyPrice(navStr);
      }
    }
  };

  const handleMfAmountChange = (val: string) => {
    handleMfFieldChange('amount', val);
  };

  const handleMfNavChange = (val: string) => {
    handleMfFieldChange('nav', val);
  };

  const handleMfUnitsChange = (val: string) => {
    handleMfFieldChange('units', val);
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
    setMfEditHistory(['amount', 'nav', 'units']);

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
          const mfUnitsVal = investmentToEdit.units !== undefined ? investmentToEdit.units : qtyVal;
          const mfNavVal = investmentToEdit.nav !== undefined ? investmentToEdit.nav : priceVal;
          const mfAmtVal = investmentToEdit.investedAmount !== undefined ? investmentToEdit.investedAmount : (mfUnitsVal * mfNavVal);

          setMfUnits(mfUnitsVal ? mfUnitsVal.toString() : '');
          setMfNav(mfNavVal ? mfNavVal.toString() : '');
          setMfInvestmentAmount(mfAmtVal ? Number(mfAmtVal).toFixed(2) : '');
          setCurrentPricePerGram('');
          setManuallyEnteredInvestedAmount('');
          setManuallyEnteredCurrentValue('');
        } else if (resolvedType === 'Digital Gold' || resolvedType === 'Digital Silver' || resolvedType === 'Digital Platinum') {
          setMfUnits('');
          setMfNav('');
          setMfInvestmentAmount('');
          setCurrentPricePerGram(investmentToEdit.currentPricePerGram ? investmentToEdit.currentPricePerGram.toString() : (investmentToEdit.currentPrice ? investmentToEdit.currentPrice.toString() : ''));
          setManuallyEnteredInvestedAmount(investmentToEdit.investedAmount ? investmentToEdit.investedAmount.toString() : '');
          setManuallyEnteredCurrentValue(investmentToEdit.currentValue ? investmentToEdit.currentValue.toString() : '');
          setWeightUnit((investmentToEdit as any).weightUnit || 'g');
          
          setFdPrincipalAmount('');
          setFdInterestRate('');
          setFdTenureYears('0');
          setFdTenureMonths('0');
          setFdTenureDays('0');
          setFdMaturityAmount('');
          setFdMaturityDate('');
          setFdCompoundingFrequency('Quarterly');
        } else if (resolvedType === 'Fixed Deposit') {
          setMfUnits('');
          setMfNav('');
          setMfInvestmentAmount('');
          setCurrentPricePerGram('');
          setManuallyEnteredInvestedAmount('');
          setManuallyEnteredCurrentValue('');
          setWeightUnit('g');
          
          setFdPrincipalAmount(investmentToEdit.investedAmount ? investmentToEdit.investedAmount.toString() : (investmentToEdit.buyPrice ? investmentToEdit.buyPrice.toString() : ''));
          setFdInterestRate(investmentToEdit.interestRate ? investmentToEdit.interestRate.toString() : '');
          setFdTenureYears(investmentToEdit.tenureYears !== undefined ? investmentToEdit.tenureYears.toString() : '0');
          setFdTenureMonths(investmentToEdit.tenureMonths !== undefined ? investmentToEdit.tenureMonths.toString() : '0');
          setFdTenureDays(investmentToEdit.tenureDays !== undefined ? investmentToEdit.tenureDays.toString() : '0');
          setFdMaturityAmount(investmentToEdit.maturityAmount ? investmentToEdit.maturityAmount.toString() : '');
          setFdMaturityDate(investmentToEdit.maturityDate || '');
          setFdCompoundingFrequency(investmentToEdit.compoundingFrequency || 'Quarterly');
        } else {
          setMfUnits('');
          setMfNav('');
          setMfInvestmentAmount('');
          setCurrentPricePerGram('');
          setManuallyEnteredInvestedAmount('');
          setManuallyEnteredCurrentValue('');
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
      setWeightUnit('g');
      setFdPrincipalAmount('');
      setFdInterestRate('');
      setFdTenureYears('0');
      setFdTenureMonths('0');
      setFdTenureDays('0');
      setFdMaturityAmount('');
      setFdMaturityDate('');
      setFdCompoundingFrequency('Quarterly');
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
      setCurrentPricePerGram('');
      setManuallyEnteredInvestedAmount('');
      setManuallyEnteredCurrentValue('');
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
      const isCommodityType = type === 'Digital Gold' || type === 'Digital Silver' || type === 'Digital Platinum';
      const isFDType = type === 'Fixed Deposit';
      if (isCommodityType) {
        if (!quantity || isNaN(qtyNum) || qtyNum <= 0)
          errs.quantity = 'Weight (grams) must be greater than 0.';
        if (!buyPrice || isNaN(priceNum) || priceNum <= 0)
          errs.buyPrice = 'Buy Price per Gram must be greater than 0.';
        
        const curPricePGNum = parseFloat(currentPricePerGram);
        if (currentPricePerGram && (isNaN(curPricePGNum) || curPricePGNum <= 0)) {
          errs.currentPricePerGram = 'Current Price per Gram must be greater than 0.';
        }
      } else if (isFDType) {
        const principalNum = parseFloat(fdPrincipalAmount);
        if (!fdPrincipalAmount || isNaN(principalNum) || principalNum <= 0) {
          errs.fdPrincipalAmount = 'Principal Amount must be greater than 0.';
        }
        const rateNum = parseFloat(fdInterestRate);
        if (fdInterestRate && (isNaN(rateNum) || rateNum < 0)) {
          errs.fdInterestRate = 'Interest Rate cannot be negative.';
        }
        const yearsNum = parseInt(fdTenureYears || '0', 10);
        const monthsNum = parseInt(fdTenureMonths || '0', 10);
        const daysNum = parseInt(fdTenureDays || '0', 10);
        if (yearsNum <= 0 && monthsNum <= 0 && daysNum <= 0) {
          errs.fdTenure = 'At least one tenure value must be greater than 0.';
        }
        if (fdMaturityDate && buyDate) {
          if (new Date(fdMaturityDate) < new Date(buyDate)) {
            errs.fdMaturityDate = 'Maturity Date cannot be before the Start/Deposit Date.';
          }
        }
        
        const manualInvestedNum = parseFloat(manuallyEnteredInvestedAmount);
        if (manuallyEnteredInvestedAmount && (isNaN(manualInvestedNum) || manualInvestedNum <= 0)) {
          errs.manuallyEnteredInvestedAmount = 'Total Invested Amount must be greater than 0.';
        }

        const manualCurrentValNum = parseFloat(manuallyEnteredCurrentValue);
        if (manuallyEnteredCurrentValue && (isNaN(manualCurrentValNum) || manualCurrentValNum <= 0)) {
          errs.manuallyEnteredCurrentValue = 'Current Value must be greater than 0.';
        }
      } else {
        if (!quantity || isNaN(qtyNum) || qtyNum <= 0)
          errs.quantity = 'Quantity / Units must be greater than 0.';
        if (!buyPrice || isNaN(priceNum) || priceNum <= 0)
          errs.buyPrice = 'Buy Price / Price per Unit must be greater than 0.';
      }
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
      const isCommodity = type === 'Digital Gold' || type === 'Digital Silver' || type === 'Digital Platinum';
      const isFD = type === 'Fixed Deposit';
      
      const principalAmountNum = parseFloat(fdPrincipalAmount);
      const interestRateNum = parseFloat(fdInterestRate);
      const tenureYearsNum = parseInt(fdTenureYears || '0', 10);
      const tenureMonthsNum = parseInt(fdTenureMonths || '0', 10);
      const tenureDaysNum = parseInt(fdTenureDays || '0', 10);
      const maturityAmountNum = fdMaturityAmount ? parseFloat(fdMaturityAmount) : undefined;

      payload = {
        assetName: name.trim(),
        category,
        assetType: category,
        broker,
        quantity: isFD ? 1 : qtyNum,
        buyPrice: isFD ? principalAmountNum : priceNum,
        buyDate,
        purchaseDate: buyDate,
        notes: notes.trim() || undefined,
        owner: 'Me',
        charges: 0,
        isDemo: false,
        customAssetType: type === 'Other' ? customType.trim() : undefined,
        customBroker: broker === 'Other' ? customBroker.trim() : undefined,
        ...(isMF ? { units: qtyNum, nav: priceNum, investedAmount: parseFloat(mfInvestmentAmount) || standardInvestedAmount } : {}),
        ...(isCommodity ? {
          weightGrams: qtyNum,
          weightUnit: weightUnit,
          buyPricePerGram: priceNum,
          currentPricePerGram: currentPricePerGram ? parseFloat(currentPricePerGram) : undefined,
          currentPrice: currentPricePerGram ? parseFloat(currentPricePerGram) : undefined,
          investedAmount: manuallyEnteredInvestedAmount ? parseFloat(manuallyEnteredInvestedAmount) : undefined,
          currentValue: manuallyEnteredCurrentValue ? parseFloat(manuallyEnteredCurrentValue) : undefined,
        } : {}),
        ...(isFD ? {
          investedAmount: principalAmountNum,
          interestRate: isNaN(interestRateNum) ? undefined : interestRateNum,
          tenureYears: tenureYearsNum,
          tenureMonths: tenureMonthsNum,
          tenureDays: tenureDaysNum,
          maturityAmount: maturityAmountNum,
          maturityDate: fdMaturityDate || undefined,
          compoundingFrequency: fdCompoundingFrequency,
        } : {})
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
            <label className="block text-xs font-bold text-slate-405 dark:text-slate-555 mb-2 uppercase tracking-wider">
              {isIPO ? '📋 IPO / Company Name *' : type === 'Fixed Deposit' ? 'Investment / FD Name *' : type === 'Other' ? 'Asset Description / Details *' : 'Investment Name *'}
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
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-550 mb-2 uppercase tracking-wider">
                {type === 'Fixed Deposit' ? 'Platform / Bank *' : 'Platform / Broker *'}
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
              ) : type === 'Digital Gold' || type === 'Digital Silver' || type === 'Digital Platinum' ? (
                // Commodity fields
                <div className="space-y-5">
                  {/* Row 1: Weight & Buy Price */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-405 dark:text-slate-500 mb-2 uppercase tracking-wider">
                        Weight *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="any"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          placeholder={weightUnit === 'mg' ? "e.g. 500" : "e.g. 1.25"}
                          className={`flex-1 ${inputClass(errors.quantity)}`}
                        />
                        <select
                          value={weightUnit}
                          onChange={(e) => setWeightUnit(e.target.value as 'g' | 'mg')}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 text-slate-900 dark:text-white dark:bg-[#0d0f17] font-semibold"
                        >
                          <option value="g" className="dark:bg-[#0d0f17]">g</option>
                          <option value="mg" className="dark:bg-[#0d0f17]">mg</option>
                        </select>
                      </div>
                      {errors.quantity && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.quantity}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-405 dark:text-slate-550 mb-2 uppercase tracking-wider">
                        Buy Price per {weightUnit === 'mg' ? 'Milligram' : 'Gram'} (₹) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={buyPrice}
                        onChange={(e) => setBuyPrice(e.target.value)}
                        placeholder={weightUnit === 'mg' ? "e.g. 7" : "e.g. 7000"}
                        className={inputClass(errors.buyPrice)}
                      />
                      {errors.buyPrice && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.buyPrice}</p>}
                    </div>
                  </div>

                  {/* Row 2: Current Price */}
                  <div>
                    <label className="block text-xs font-bold text-slate-405 dark:text-slate-555 mb-2 uppercase tracking-wider">
                      Current Price per {weightUnit === 'mg' ? 'Milligram' : 'Gram'} (₹) (Optional)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={currentPricePerGram}
                      onChange={(e) => setCurrentPricePerGram(e.target.value)}
                      placeholder={weightUnit === 'mg' ? "e.g. 7.5" : "e.g. 7500"}
                      className={inputClass(errors.currentPricePerGram)}
                    />
                    {errors.currentPricePerGram && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.currentPricePerGram}</p>}
                  </div>

                  {/* Row 3: Total Invested & Current Value */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-405 dark:text-slate-550 mb-2 uppercase tracking-wider">
                        Total Invested Amount (₹) (Optional)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={manuallyEnteredInvestedAmount}
                        onChange={(e) => setManuallyEnteredInvestedAmount(e.target.value)}
                        placeholder="e.g. 70000"
                        className={inputClass(errors.manuallyEnteredInvestedAmount)}
                      />
                      {errors.manuallyEnteredInvestedAmount && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.manuallyEnteredInvestedAmount}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-405 dark:text-slate-555 mb-2 uppercase tracking-wider">
                        Current Value (₹) (Optional)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={manuallyEnteredCurrentValue}
                        onChange={(e) => setManuallyEnteredCurrentValue(e.target.value)}
                        placeholder="e.g. 75000"
                        className={inputClass(errors.manuallyEnteredCurrentValue)}
                      />
                      {errors.manuallyEnteredCurrentValue && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.manuallyEnteredCurrentValue}</p>}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-500/5 border border-slate-500/10 px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    ℹ️ For weight-based commodities, values are not automatically computed. Enter the exact values you wish to store.
                  </div>
                </div>
              ) : type === 'Fixed Deposit' ? (
                // Fixed Deposit specific inputs
                <div className="space-y-5">
                  {/* Row 1: Principal Amount & Interest Rate */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-405 dark:text-slate-550 mb-2 uppercase tracking-wider">
                        Principal Amount (₹) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={fdPrincipalAmount}
                        onChange={(e) => setFdPrincipalAmount(e.target.value)}
                        placeholder="e.g. 50000"
                        className={inputClass(errors.fdPrincipalAmount)}
                      />
                      {errors.fdPrincipalAmount && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.fdPrincipalAmount}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-405 dark:text-slate-550 mb-2 uppercase tracking-wider">
                        Interest Rate (% p.a.)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={fdInterestRate}
                        onChange={(e) => setFdInterestRate(e.target.value)}
                        placeholder="e.g. 7.10"
                        className={inputClass(errors.fdInterestRate)}
                      />
                      {errors.fdInterestRate && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.fdInterestRate}</p>}
                    </div>
                  </div>

                  {/* Row 2: Tenure (Years, Months, Days) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-405 dark:text-slate-550 mb-2 uppercase tracking-wider">
                      Tenure *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <input
                          type="number"
                          min="0"
                          value={fdTenureYears}
                          onChange={(e) => setFdTenureYears(e.target.value)}
                          placeholder="Years"
                          className={inputClass(errors.fdTenure)}
                        />
                        <span className="block text-[9px] font-bold text-slate-400 mt-1 uppercase text-center">Years</span>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          value={fdTenureMonths}
                          onChange={(e) => setFdTenureMonths(e.target.value)}
                          placeholder="Months"
                          className={inputClass(errors.fdTenure)}
                        />
                        <span className="block text-[9px] font-bold text-slate-400 mt-1 uppercase text-center">Months</span>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          value={fdTenureDays}
                          onChange={(e) => setFdTenureDays(e.target.value)}
                          placeholder="Days"
                          className={inputClass(errors.fdTenure)}
                        />
                        <span className="block text-[9px] font-bold text-slate-400 mt-1 uppercase text-center">Days</span>
                      </div>
                    </div>
                    {errors.fdTenure && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.fdTenure}</p>}
                  </div>

                  {/* Row 3: Maturity Amount & Maturity Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-405 dark:text-slate-550 mb-2 uppercase tracking-wider">
                        Maturity Amount (₹) (Optional)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={fdMaturityAmount}
                        onChange={(e) => setFdMaturityAmount(e.target.value)}
                        placeholder="e.g. 55500"
                        className={inputClass()}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-405 dark:text-slate-550 mb-2 uppercase tracking-wider">
                        Maturity Date
                      </label>
                      <input
                        type="date"
                        value={fdMaturityDate}
                        onChange={(e) => setFdMaturityDate(e.target.value)}
                        className={inputClass(errors.fdMaturityDate)}
                      />
                      {errors.fdMaturityDate && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.fdMaturityDate}</p>}
                    </div>
                  </div>

                  {/* Compounding Frequency dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-405 dark:text-slate-550 mb-2 uppercase tracking-wider">
                      Compounding Frequency
                    </label>
                    <select
                      value={fdCompoundingFrequency}
                      onChange={(e) => setFdCompoundingFrequency(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-2.5 px-3.5 text-sm outline-none focus:border-indigo-500 text-slate-900 dark:text-white dark:bg-[#0d0f17] font-semibold"
                    >
                      <option value="Monthly" className="dark:bg-[#0d0f17]">Monthly</option>
                      <option value="Quarterly" className="dark:bg-[#0d0f17]">Quarterly</option>
                      <option value="Half-Yearly" className="dark:bg-[#0d0f17]">Half-Yearly</option>
                      <option value="Yearly" className="dark:bg-[#0d0f17]">Yearly</option>
                    </select>
                  </div>
                </div>
              ) : (
                // Standard fields
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-405 dark:text-slate-555 mb-2 uppercase tracking-wider">
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
                      <label className="block text-xs font-bold text-slate-405 dark:text-slate-555 mb-2 uppercase tracking-wider">
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

                  {/* Invested Amount Card */}
                  <div className="bg-indigo-500/[0.02] dark:bg-indigo-500/[0.04] border border-indigo-500/10 rounded-2xl p-4 flex justify-between items-center text-xs font-bold shadow-sm">
                    <div>
                      <span className="text-slate-400 dark:text-slate-555 block text-[9px] uppercase tracking-wider mb-0.5">Calculated Principal</span>
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
            </>
          )}

          {/* ── Date fields ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-550 mb-2 uppercase tracking-wider">
                {isIPO ? '📅 Application Date *' : type === 'Fixed Deposit' ? 'Start / Deposit Date *' : 'Buy Date *'}
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
