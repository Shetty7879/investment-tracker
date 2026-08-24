export type AssetType =
  | 'Stocks'
  | 'ETFs'
  | 'Mutual Funds'
  | 'Fixed Deposits'
  | 'Gold'
  | 'Silver'
  | 'Platinum'
  | 'Savings/Cash'
  | 'IPOs'
  | 'Stock'
  | 'ETF'
  | 'Mutual Fund'
  | 'IPO'
  | 'Digital Gold'
  | 'Digital Silver'
  | 'Digital Platinum'
  | 'Crypto'
  | 'Fixed Deposit'
  | 'Bond'
  | 'Other';

export type BrokerType =
  | 'Dhan'
  | 'Lemon'
  | 'Univest'
  | 'PhonePe'
  | 'FamPay'
  | 'Groww'
  | 'Bank'
  | 'Other';

export interface Transaction {
  id: string;
  investmentId: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND' | 'INTEREST' | 'CHARGE';
  quantity: number;
  price: number;
  amount: number;
  charges: number;
  date: string;
  notes?: string;
  isDemo: boolean;
  createdAt: string;
}

export interface Investment {
  id: string;
  assetName: string;
  symbol?: string;
  category: AssetType; // Preferred category key
  assetType: AssetType;  // Backward compatibility alias
  owner: 'Me' | 'Other';
  quantity: number;      // Remaining quantity held
  buyPrice: number;      // Average purchase price
  buyDate: string;       // Original purchase date
  purchaseDate: string;  // Backward compatibility alias
  currentPrice?: number | null;
  charges: number;       // Initial charges
  notes?: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  broker?: BrokerType;
  customAssetType?: string;
  customBroker?: string;

  // Specific additional properties
  investedAmount?: number;
  currentValue?: number | null;
  transactions?: Partial<Transaction>[]; // Demoted to Partial for mock data loaders
  
  // Mapped calculations
  profitLoss?: number | null;
  returnPercent?: number | null;
  realizedPL?: number;
  totalPL?: number;
  
  // Market price metadata
  priceStatus?: 'live' | 'cached' | 'unavailable' | 'not_allocated';
  priceTimestamp?: number;
  priceSource?: string;
  priceMarketState?: 'open' | 'closed';
  priceChange?: number;
  priceChangePercent?: number;

  // Mutual Funds
  units?: number;
  nav?: number;

  // Fixed Deposits
  interestRate?: number;
  maturityDate?: string;
  compoundingFrequency?: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';

  // Commodities
  weightGrams?: number;
  buyPricePerGram?: number;
  currentPricePerGram?: number;

  // Savings / Cash
  interestRateSavings?: number;

  // IPOs
  ipoLotsApplied?: number;
  ipoQuantityApplied?: number;
  ipoAllotmentStatus?: 'Applied' | 'Payment Pending' | 'Allocation Pending' | 'Allotted' | 'Partially Allotted' | 'Not Allotted' | 'Refund Pending' | 'Refunded' | 'Listed' | 'Sold';
  ipoQuantityAllotted?: number;
  ipoAllotmentPrice?: number;
  ipoListingPrice?: number;
  ipoSellingPrice?: number;
  ipoSellingDate?: string;
  appliedAmount?: number;
  allocatedQuantity?: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category: string;
  targetDate?: string;
  notes?: string;
  isCompleted?: boolean;
  isDemo?: boolean;
  owner?: 'Me' | 'Other';
  linkedAssetId?: string;
  progressMode?: 'Manual' | 'Automatic';
}

export interface RecentActivity {
  id: string;
  assetName: string;
  type: string;
  amount: number;
  date: string;
}

export * from './money';
