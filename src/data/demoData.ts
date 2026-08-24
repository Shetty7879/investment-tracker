import type { Goal, RecentActivity } from '../types';

export const DEFAULT_INVESTMENTS: any[] = [
  {
    id: '1',
    assetName: 'Reliance Industries',
    assetType: 'Stocks',
    symbol: 'RELIANCE',
    quantity: 4,
    buyPrice: 2000,
    currentPrice: 2450,
    investedAmount: 8000,
    currentValue: 9800,
    purchaseDate: '2026-01-15',
    owner: 'Me',
    isDemo: true,
    notes: 'Long term blue chip hold',
    transactions: [
      { id: 't1-1', type: 'BUY', quantity: 4, price: 2000, date: '2026-01-15', notes: 'Initial buy' }
    ]
  },
  {
    id: '2',
    assetName: 'TCS',
    assetType: 'Stocks',
    symbol: 'TCS',
    quantity: 2,
    buyPrice: 3500,
    currentPrice: 4350,
    investedAmount: 7000,
    currentValue: 8700,
    purchaseDate: '2026-02-10',
    owner: 'Other',
    isDemo: true,
    notes: 'Holding on behalf of father',
    transactions: [
      { id: 't2-1', type: 'BUY', quantity: 2, price: 3500, date: '2026-02-10', notes: 'Initial purchase' }
    ]
  },
  {
    id: '3',
    assetName: 'Nifty 50 ETF (NIFTYBEES)',
    assetType: 'ETFs',
    symbol: 'NIFTYBEES',
    quantity: 50,
    buyPrice: 200,
    currentPrice: 224,
    investedAmount: 10000,
    currentValue: 11200,
    purchaseDate: '2026-03-01',
    owner: 'Me',
    isDemo: true,
    transactions: [
      { id: 't3-1', type: 'BUY', quantity: 50, price: 200, date: '2026-03-01', notes: 'SIP Buy' }
    ]
  },
  {
    id: '4',
    assetName: 'HDFC Balanced Advantage Fund',
    assetType: 'Mutual Funds',
    investedAmount: 12000,
    currentValue: 13800,
    purchaseDate: '2026-01-20',
    owner: 'Me',
    isDemo: true,
    units: 300,
    nav: 46, // current NAV
    transactions: [
      { id: 't4-1', type: 'BUY', quantity: 300, price: 40, date: '2026-01-20', notes: 'Initial Lumpsum' }
    ]
  },
  {
    id: '5',
    assetName: 'SBI Tax Saver FD',
    assetType: 'Fixed Deposits',
    investedAmount: 8000,
    currentValue: 8400,
    purchaseDate: '2025-12-05',
    owner: 'Other',
    isDemo: true,
    interestRate: 7.1,
    maturityDate: '2027-12-05',
    compoundingFrequency: 'Quarterly',
    transactions: [
      { id: 't5-1', type: 'BUY', quantity: 1, price: 8000, date: '2025-12-05', notes: '5-year Tax saving FD' }
    ]
  },
  {
    id: '6',
    assetName: 'Sovereign Gold Bond (SGB)',
    assetType: 'Gold',
    investedAmount: 7000,
    currentValue: 7900,
    purchaseDate: '2026-02-22',
    owner: 'Me',
    isDemo: true,
    weightGrams: 10,
    buyPricePerGram: 700,
    currentPricePerGram: 790,
    transactions: [
      { id: 't6-1', type: 'BUY', quantity: 10, price: 700, date: '2026-02-22', notes: 'RBI allotment' }
    ]
  },
  {
    id: '7',
    assetName: 'Physical Silver',
    assetType: 'Silver',
    investedAmount: 4000,
    currentValue: 4200,
    purchaseDate: '2026-03-12',
    owner: 'Me',
    isDemo: true,
    weightGrams: 50,
    buyPricePerGram: 80,
    currentPricePerGram: 84,
    transactions: [
      { id: 't7-1', type: 'BUY', quantity: 50, price: 80, date: '2026-03-12' }
    ]
  },
  {
    id: '8',
    assetName: 'Emergency Cash Reserve',
    assetType: 'Savings/Cash',
    investedAmount: 5000,
    currentValue: 5000,
    purchaseDate: '2026-04-01',
    owner: 'Me',
    isDemo: true,
    interestRateSavings: 3.5,
    transactions: [
      { id: 't8-1', type: 'BUY', quantity: 5000, price: 1, date: '2026-04-01', notes: 'Opening deposit' }
    ]
  }
];

export const DEFAULT_RECENT_ACTIVITY: RecentActivity[] = [
  {
    id: 'act1',
    assetName: 'NIFTYBEES',
    type: 'ETF',
    amount: 835.50,
    date: 'Today'
  },
  {
    id: 'act2',
    assetName: 'BSE',
    type: 'Stock',
    amount: 327.15,
    date: 'Yesterday'
  },
  {
    id: 'act3',
    assetName: 'Mutual Fund',
    type: 'Investment',
    amount: 1000.00,
    date: '10 Aug'
  }
];

export const DEFAULT_GOALS: Goal[] = [
  {
    id: 'g1',
    name: 'Emergency Fund',
    currentAmount: 8000,
    targetAmount: 20000,
    category: 'Emergency Fund',
    isDemo: true,
    owner: 'Me',
    progressMode: 'Manual',
    notes: 'Aiming for 6 months expenses'
  },
  {
    id: 'g2',
    name: 'Investment Goal',
    currentAmount: 20744,
    targetAmount: 100000,
    category: 'Investment',
    isDemo: true,
    owner: 'Me',
    progressMode: 'Manual',
    notes: 'Equity allocation milestone'
  },
  {
    id: 'g3',
    name: 'IPO Fund',
    currentAmount: 3177,
    targetAmount: 15000,
    category: 'IPO',
    isDemo: true,
    owner: 'Me',
    progressMode: 'Manual'
  }
];
