import { describe, test, expect } from 'vitest';
import { getPortfolioValuation } from './portfolioValuationService';
import type { Investment } from '../types';

describe('Portfolio Valuation Service Tests', () => {
  test('Correctly calculates portfolio valuation breakdown with purchase price fallbacks when live API is unpriced', () => {
    const investments: Investment[] = [
      {
        id: 'inv-stock-1',
        assetName: 'Cupid',
        symbol: 'CUPID',
        category: 'Stocks',
        assetType: 'Stocks',
        quantity: 2,
        buyPrice: 281,
        investedAmount: 562,
        buyDate: '2026-01-01',
        purchaseDate: '2026-01-01',
        charges: 0,
        owner: 'Me',
        isDemo: false,
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'inv-stock-2',
        assetName: 'Reliance Industries',
        symbol: 'RELIANCE',
        category: 'Stocks',
        assetType: 'Stocks',
        quantity: 10,
        buyPrice: 1000,
        investedAmount: 10000,
        buyDate: '2026-01-01',
        purchaseDate: '2026-01-01',
        charges: 0,
        owner: 'Me',
        isDemo: false,
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'inv-mf-1',
        assetName: 'Jio BlackRock MF',
        symbol: '',
        category: 'Mutual Funds',
        assetType: 'Mutual Funds',
        quantity: 7.494,
        buyPrice: 1067.5,
        investedAmount: 8000,
        currentPrice: 8000, // Manual total value typo
        buyDate: '2026-01-01',
        purchaseDate: '2026-01-01',
        charges: 0,
        owner: 'Me',
        isDemo: false,
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'inv-etf-1',
        assetName: 'Nippon Gold ETF',
        symbol: 'GOLDBEES',
        category: 'ETFs',
        assetType: 'ETFs',
        quantity: 50,
        buyPrice: 60,
        investedAmount: 3000,
        buyDate: '2026-01-01',
        purchaseDate: '2026-01-01',
        charges: 0,
        owner: 'Me',
        isDemo: false,
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'inv-gold-1',
        assetName: 'FamPay Gold',
        category: 'Digital Gold',
        assetType: 'Digital Gold',
        weightGrams: 57.8,
        weightUnit: 'mg',
        quantity: 57.8,
        buyPrice: 508.25,
        currentPrice: 508.25, // Stored total value for 57.8mg
        investedAmount: 508.25,
        buyDate: '2026-01-01',
        purchaseDate: '2026-01-01',
        charges: 0,
        owner: 'Me',
        isDemo: false,
        createdAt: '',
        updatedAt: ''
      }
    ];

    const summary = getPortfolioValuation(investments, [], {});

    // Verify non-zero valuations: Stocks, MFs, ETFs are NOT ₹0!
    expect(summary.assetClassTotals['Stocks']).toBe(10562);
    expect(summary.assetClassTotals['Mutual Funds']).toBeCloseTo(8000, 0); // 7.494 * 1067.5 ≈ 8000
    expect(summary.assetClassTotals['ETFs']).toBe(3000);
    expect(summary.assetClassTotals['Gold']).toBe(508.25);

    expect(summary.totalMarketValue).toBeCloseTo(22070.09, 0);

    // Verify percentages are non-zero for Stocks, MFs, ETFs, Gold
    const stockAlloc = summary.allocations.find(a => a.name === 'Stocks');
    const mfAlloc = summary.allocations.find(a => a.name === 'Mutual Funds');
    const etfAlloc = summary.allocations.find(a => a.name === 'ETFs');
    const goldAlloc = summary.allocations.find(a => a.name === 'Gold');

    expect(stockAlloc?.percentage).toBeGreaterThan(40);
    expect(mfAlloc?.percentage).toBeGreaterThan(30);
    expect(etfAlloc?.percentage).toBeGreaterThan(10);
    expect(goldAlloc?.percentage).toBeLessThan(5);
  });
});
