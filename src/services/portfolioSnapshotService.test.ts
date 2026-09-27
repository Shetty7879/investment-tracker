import { describe, it, expect } from 'vitest';
import { generatePortfolioSnapshots, formatSnapshotDate } from './portfolioSnapshotService';
import type { Investment, Transaction } from '../types';

const mockInv = (partial: Partial<Investment>): Investment => ({
  id: 'inv-1',
  assetName: 'Test Asset',
  assetType: 'Stocks',
  category: 'Stocks',
  symbol: 'TEST',
  quantity: 10,
  buyPrice: 100,
  investedAmount: 1000,
  purchaseDate: '2026-01-01',
  buyDate: '2026-01-01',
  owner: 'Me',
  charges: 0,
  isDemo: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...partial
});

const mockTx = (partial: Partial<Transaction>): Transaction => ({
  id: 'tx-1',
  investmentId: 'inv-1',
  type: 'BUY',
  quantity: 10,
  price: 100,
  amount: 1000,
  charges: 0,
  date: '2026-01-01',
  isDemo: false,
  createdAt: '2026-01-01T00:00:00Z',
  ...partial
});

describe('Portfolio Snapshot Engine & Growth Curve Logic', () => {
  it('formats snapshot dates cleanly', () => {
    expect(formatSnapshotDate('2026-09-25')).toBe('25 Sep 2026');
    expect(formatSnapshotDate('2026-01-01')).toBe('1 Jan 2026');
  });

  it('correctly processes BUY transaction increasing invested capital & quantity', () => {
    const investments: Investment[] = [
      mockInv({
        id: 'inv-1',
        assetName: 'Coal India',
        assetType: 'Stocks',
        category: 'Stocks',
        symbol: 'COALINDIA',
        quantity: 10,
        buyPrice: 100,
        investedAmount: 1000,
        purchaseDate: '2026-01-01'
      })
    ];

    const transactions: Transaction[] = [
      mockTx({
        id: 'tx-1',
        investmentId: 'inv-1',
        type: 'BUY',
        quantity: 10,
        price: 100,
        amount: 1000,
        date: '2026-01-01'
      })
    ];

    const snapshots = generatePortfolioSnapshots({ investments, transactions });
    expect(snapshots.length).toBeGreaterThan(0);

    const firstSnap = snapshots[0];
    expect(firstSnap.date).toBe('2026-01-01');
    expect(firstSnap.investedCapital).toBe(1000);
    expect(firstSnap.holdingsBreakdown).toHaveLength(1);
    expect(firstSnap.holdingsBreakdown[0].quantity).toBe(10);
  });

  it('correctly handles SELL transaction reducing quantity and cost basis', () => {
    const investments: Investment[] = [
      mockInv({
        id: 'inv-1',
        assetName: 'NBCC India',
        assetType: 'Stocks',
        category: 'Stocks',
        symbol: 'NBCC',
        quantity: 6,
        buyPrice: 100,
        investedAmount: 600,
        purchaseDate: '2026-01-01'
      })
    ];

    const transactions: Transaction[] = [
      mockTx({
        id: 'tx-1',
        investmentId: 'inv-1',
        type: 'BUY',
        quantity: 10,
        price: 100,
        amount: 1000,
        date: '2026-01-01'
      }),
      mockTx({
        id: 'tx-2',
        investmentId: 'inv-1',
        type: 'SELL',
        quantity: 4,
        price: 120,
        amount: 480,
        date: '2026-01-10'
      })
    ];

    const snapshots = generatePortfolioSnapshots({ investments, transactions });

    // Snap on Jan 1: quantity = 10, invested = 1000
    const jan1Snap = snapshots.find(s => s.date === '2026-01-01');
    expect(jan1Snap?.investedCapital).toBe(1000);
    expect(jan1Snap?.holdingsBreakdown[0].quantity).toBe(10);

    // Snap on Jan 10: quantity = 6, invested = 600
    const jan10Snap = snapshots.find(s => s.date === '2026-01-10');
    expect(jan10Snap?.investedCapital).toBe(600);
    expect(jan10Snap?.holdingsBreakdown[0].quantity).toBe(6);
  });

  it('correctly handles Stock Split without treating corporate action as fresh cash investment', () => {
    const investments: Investment[] = [
      mockInv({
        id: 'inv-1',
        assetName: 'Tata Steel',
        assetType: 'Stocks',
        category: 'Stocks',
        symbol: 'TATASTEEL',
        quantity: 20,
        buyPrice: 50,
        investedAmount: 1000,
        purchaseDate: '2026-01-01'
      })
    ];

    const transactions: Transaction[] = [
      mockTx({
        id: 'tx-1',
        investmentId: 'inv-1',
        type: 'BUY',
        quantity: 10,
        price: 100,
        amount: 1000,
        date: '2026-01-01'
      }),
      mockTx({
        id: 'tx-2',
        investmentId: 'inv-1',
        type: 'SPLIT',
        quantity: 10,
        price: 50,
        oldQuantity: 10,
        newQuantity: 20,
        ratio: '1:2',
        amount: 0,
        date: '2026-01-15'
      })
    ];

    const snapshots = generatePortfolioSnapshots({ investments, transactions });

    // Jan 1: pre-split (qty = 10, invested = 1000)
    const jan1Snap = snapshots.find(s => s.date === '2026-01-01');
    expect(jan1Snap?.holdingsBreakdown[0].quantity).toBe(10);
    expect(jan1Snap?.investedCapital).toBe(1000);

    // Jan 15: post-split (qty = 20, invested capital remains 1000!)
    const jan15Snap = snapshots.find(s => s.date === '2026-01-15');
    expect(jan15Snap?.holdingsBreakdown[0].quantity).toBe(20);
    expect(jan15Snap?.investedCapital).toBe(1000);
  });

  it('MUST NOT include Applied or Unallotted IPOs as active holdings or invested capital', () => {
    const investments: Investment[] = [
      mockInv({
        id: 'ipo-1',
        assetName: 'Swastika Infra',
        assetType: 'IPOs',
        category: 'IPOs',
        quantity: 0,
        buyPrice: 0,
        investedAmount: 0,
        ipoAllotmentStatus: 'Applied',
        ipoQuantityApplied: 100,
        purchaseDate: '2026-02-01'
      }),
      mockInv({
        id: 'ipo-2',
        assetName: 'Veegaland Developers',
        assetType: 'IPOs',
        category: 'IPOs',
        quantity: 0,
        buyPrice: 0,
        investedAmount: 0,
        ipoAllotmentStatus: 'Not Allotted',
        ipoQuantityApplied: 50,
        purchaseDate: '2026-02-02'
      })
    ];

    const transactions: Transaction[] = [];

    const snapshots = generatePortfolioSnapshots({ investments, transactions });
    // Since all IPOs are unallotted/applied, portfolio snapshot invested capital & holdings should be 0!
    snapshots.forEach(s => {
      expect(s.investedCapital).toBe(0);
      expect(s.holdingsBreakdown).toHaveLength(0);
    });
  });

  it('zero-quantity assets must have market value = 0 and be excluded from valuation', () => {
    const investments: Investment[] = [
      mockInv({
        id: 'inv-sold',
        assetName: 'Sold Stock',
        assetType: 'Stocks',
        category: 'Stocks',
        symbol: 'SOLD',
        quantity: 0,
        buyPrice: 100,
        investedAmount: 0,
        purchaseDate: '2026-01-01'
      })
    ];

    const transactions: Transaction[] = [
      mockTx({
        id: 'tx-1',
        investmentId: 'inv-sold',
        type: 'BUY',
        quantity: 5,
        price: 100,
        amount: 500,
        date: '2026-01-01'
      }),
      mockTx({
        id: 'tx-2',
        investmentId: 'inv-sold',
        type: 'SELL',
        quantity: 5,
        price: 150,
        amount: 750,
        date: '2026-01-05'
      })
    ];

    const snapshots = generatePortfolioSnapshots({ investments, transactions });

    // Jan 6 (after full sell): investedCapital = 0, marketValue = 0, breakdown length = 0
    const jan6Snap = snapshots.find(s => s.date === '2026-01-06');
    expect(jan6Snap?.investedCapital).toBe(0);
    expect(jan6Snap?.marketValue).toBe(0);
    expect(jan6Snap?.holdingsBreakdown).toHaveLength(0);
  });
});
