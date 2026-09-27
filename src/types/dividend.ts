import type { BrokerType } from './index';

export type DividendStatus =
  | 'DECLARED'
  | 'UPCOMING'
  | 'ELIGIBLE'
  | 'PENDING'
  | 'RECEIVED'
  | 'PAID'
  | 'NOT_ELIGIBLE'
  | 'CANCELLED'
  // Backward compatibility alias strings
  | 'Received'
  | 'Paid'
  | 'Upcoming'
  | 'Declared'
  | 'Pending'
  | 'Reinvested';

export type DividendSourceType = 'Official' | 'NSE/BSE' | 'Market Data' | 'Manual' | 'auto_discovered';

export interface CorporateDividendEvent {
  eventId: string; // e.g. INE002A01018_2026-06-05_6.00
  symbol: string;
  isin?: string;
  exchange?: string;
  assetName: string;
  dividendPerShare: number;
  declarationDate?: string;
  announcementDate?: string;
  exDate: string;
  recordDate: string;
  paymentDate: string;
  status: 'DECLARED' | 'UPCOMING' | 'HISTORICAL' | 'PAID' | 'CANCELLED';
  dividendType?: 'Final' | 'Interim' | 'Special';
  source: DividendSourceType;
  sourceUrl?: string;
  verified: boolean;
  notes?: string;
}

export interface Dividend {
  id: string;
  user_id?: string;
  investmentId: string;
  asset_id?: string;
  symbol?: string;
  isin?: string;
  exchange?: string;
  assetName: string;
  asset_name?: string;
  broker?: BrokerType | string;
  platform?: BrokerType | string;
  eligibleQuantity: number;
  quantity?: number;
  dividendPerShare: number;
  dividend_per_share?: number;
  grossDividend: number;
  gross_amount?: number;
  tax: number; // TDS / Tax
  tds_amount?: number;
  netDividend: number;
  net_amount?: number;
  dividendDate: string; // Ex-date or dividend date
  ex_date?: string;
  recordDate?: string;
  record_date?: string;
  declarationDate?: string;
  declaration_date?: string;
  paymentDate?: string;
  payment_date?: string;
  status: DividendStatus;
  source?: DividendSourceType;
  source_url?: string;
  verified?: boolean;
  eventKey?: string;
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
  reinvested?: boolean;
  reinvestedInvestmentId?: string;
}

export interface ReinvestOptions {
  reinvest: boolean;
  price?: number;
  buyDate?: string;
}

