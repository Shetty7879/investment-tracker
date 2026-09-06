import type { BrokerType } from './index';

export type DividendStatus = 'Upcoming' | 'Declared' | 'Paid' | 'Reinvested';

export interface Dividend {
  id: string;
  investmentId: string;
  symbol?: string;
  assetName: string;
  broker?: BrokerType | string;
  eligibleQuantity: number;
  dividendPerShare: number;
  grossDividend: number;
  tax: number; // TDS / Tax
  netDividend: number;
  dividendDate: string;
  paymentDate?: string;
  status: DividendStatus;
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt?: string;
  reinvested?: boolean;
  reinvestedInvestmentId?: string;
}

export interface ReinvestOptions {
  reinvest: boolean;
  price?: number;
  buyDate?: string;
}
