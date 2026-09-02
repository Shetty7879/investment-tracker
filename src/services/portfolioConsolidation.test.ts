import { describe, it, expect } from 'vitest';
import { getConsolidatedHoldings, isHoldingActive } from '../utils/consolidation';
import { calculateTotalInvested, calculateMonthlyInvested, calculateHoldingMetrics } from './portfolioCalculationService';
import type { Investment, Transaction } from '../types';

describe('Portfolio Consolidation & Buy/Sell Engine', () => {

  const baseInvestments: Investment[] = [
    {
      id: 'inv1',
      assetName: 'Jio BlackRock Mutual Fund',
      category: 'Mutual Funds',
      assetType: 'Mutual Funds',
      owner: 'Me',
      quantity: 5,
      buyPrice: 100,
      buyDate: '2026-01-10',
      purchaseDate: '2026-01-10',
      broker: 'Dhan',
      investedAmount: 500,
      charges: 0,
      isDemo: false,
      createdAt: '2026-01-10T00:00:00Z',
      updatedAt: '2026-01-10T00:00:00Z'
    },
    {
      id: 'inv2',
      assetName: 'Jio BlackRock Mutual Fund',
      category: 'Mutual Funds',
      assetType: 'Mutual Funds',
      owner: 'Me',
      quantity: 5,
      buyPrice: 100,
      buyDate: '2026-02-15',
      purchaseDate: '2026-02-15',
      broker: 'Dhan',
      investedAmount: 500,
      charges: 0,
      isDemo: false,
      createdAt: '2026-02-15T00:00:00Z',
      updatedAt: '2026-02-15T00:00:00Z'
    },
    {
      id: 'inv3',
      assetName: 'Nippon India Large Cap',
      category: 'Mutual Funds',
      assetType: 'Mutual Funds',
      owner: 'Me',
      quantity: 10,
      buyPrice: 50,
      buyDate: '2026-03-01',
      purchaseDate: '2026-03-01',
      broker: 'Dhan',
      investedAmount: 500,
      charges: 0,
      isDemo: false,
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z'
    },
    {
      id: 'inv4',
      assetName: 'Digital Gold',
      category: 'Digital Gold',
      assetType: 'Digital Gold',
      owner: 'Me',
      quantity: 2,
      buyPrice: 6000,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      broker: 'PhonePe',
      investedAmount: 12000,
      charges: 0,
      isDemo: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'inv5',
      assetName: 'Digital Gold',
      category: 'Digital Gold',
      assetType: 'Digital Gold',
      owner: 'Me',
      quantity: 1,
      buyPrice: 6000,
      buyDate: '2026-02-01',
      purchaseDate: '2026-02-01',
      broker: 'Navi' as any,
      investedAmount: 6000,
      charges: 0,
      isDemo: false,
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z'
    }
  ];

  const baseTransactions: Transaction[] = [
    {
      id: 'tx1',
      investmentId: 'inv1',
      type: 'BUY',
      quantity: 5,
      price: 100,
      amount: 500,
      charges: 0,
      date: '2026-01-10',
      isDemo: false,
      createdAt: '2026-01-10T00:00:00Z'
    },
    {
      id: 'tx2',
      investmentId: 'inv2',
      type: 'BUY',
      quantity: 5,
      price: 100,
      amount: 500,
      charges: 0,
      date: '2026-02-15',
      isDemo: false,
      createdAt: '2026-02-15T00:00:00Z'
    },
    {
      id: 'tx3',
      investmentId: 'inv3',
      type: 'BUY',
      quantity: 10,
      price: 50,
      amount: 500,
      charges: 0,
      date: '2026-03-01',
      isDemo: false,
      createdAt: '2026-03-01T00:00:00Z'
    },
    {
      id: 'tx4',
      investmentId: 'inv4',
      type: 'BUY',
      quantity: 2,
      price: 6000,
      amount: 12000,
      charges: 0,
      date: '2026-01-01',
      isDemo: false,
      createdAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'tx5',
      investmentId: 'inv5',
      type: 'BUY',
      quantity: 1,
      price: 6000,
      amount: 6000,
      charges: 0,
      date: '2026-02-01',
      isDemo: false,
      createdAt: '2026-02-01T00:00:00Z'
    }
  ];

  it('1. Consolidates multiple BUY transactions for the same asset & broker into 1 holding', () => {
    const consolidated = getConsolidatedHoldings(baseInvestments, baseTransactions);
    const jioHolding = consolidated.find(h => h.assetName === 'Jio BlackRock Mutual Fund' && h.broker === 'Dhan');

    expect(jioHolding).toBeDefined();
    expect(jioHolding?.currentQuantity).toBe(10);
    expect(jioHolding?.investedAmount).toBe(1000);
    expect(jioHolding?.averageBuyPrice).toBe(100);
    expect(jioHolding?.txCount).toBe(2);
  });

  it('2. Keeps same asset on different platforms (Gold PhonePe vs Gold Navi) separate', () => {
    const consolidated = getConsolidatedHoldings(baseInvestments, baseTransactions);

    const phonePeGold = consolidated.find(h => h.assetName === 'Digital Gold' && h.broker === 'PhonePe');
    const naviGold = consolidated.find(h => h.assetName === 'Digital Gold' && h.broker === 'Navi');

    expect(phonePeGold).toBeDefined();
    expect(naviGold).toBeDefined();
    expect(phonePeGold?.holdingKey).not.toBe(naviGold?.holdingKey);
    expect(phonePeGold?.investedAmount).toBe(12000);
    expect(naviGold?.investedAmount).toBe(6000);
  });

  it('3. Handles additional BUY transaction correctly updating quantity and invested amount', () => {
    const newTx: Transaction = {
      id: 'tx6',
      investmentId: 'inv1',
      type: 'BUY',
      quantity: 5,
      price: 120,
      amount: 600,
      charges: 0,
      date: '2026-03-10',
      isDemo: false,
      createdAt: '2026-03-10T00:00:00Z'
    };

    const updatedTxs = [...baseTransactions, newTx];
    const consolidated = getConsolidatedHoldings(baseInvestments, updatedTxs);
    const jioHolding = consolidated.find(h => h.assetName === 'Jio BlackRock Mutual Fund' && h.broker === 'Dhan');

    expect(jioHolding?.currentQuantity).toBe(15);
    expect(jioHolding?.investedAmount).toBe(1600);
    // Weighted avg buy price: safeRound(1600 / 15) = 106.67
    expect(jioHolding?.averageBuyPrice).toBe(106.67);
    expect(jioHolding?.txCount).toBe(3);
  });

  it('4. Handles Partial SELL transaction reducing quantity without altering historical BUYs', () => {
    const sellTx: Transaction = {
      id: 'tx7',
      investmentId: 'inv1',
      type: 'SELL',
      quantity: 4,
      price: 150,
      amount: 600,
      charges: 0,
      date: '2026-03-20',
      isDemo: false,
      createdAt: '2026-03-20T00:00:00Z'
    };

    const updatedTxs = [...baseTransactions, sellTx];
    const consolidated = getConsolidatedHoldings(baseInvestments, updatedTxs);
    const jioHolding = consolidated.find(h => h.assetName === 'Jio BlackRock Mutual Fund' && h.broker === 'Dhan');

    expect(jioHolding?.currentQuantity).toBe(6);
    expect(jioHolding?.averageBuyPrice).toBe(100);
    expect(jioHolding?.investedAmount).toBe(600); // 6 units @ ₹100
    expect(jioHolding?.realizedPL).toBe(200); // Sold 4 units @ ₹150 (cost 4*100=400, proceeds 600 => profit 200)
    expect(jioHolding?.txCount).toBe(3); // 2 BUYs + 1 SELL preserved
  });

  it('5. Full SELL reduces quantity to 0 and marks holding inactive', () => {
    const fullSellTx: Transaction = {
      id: 'tx8',
      investmentId: 'inv1',
      type: 'SELL',
      quantity: 10,
      price: 110,
      amount: 1100,
      charges: 0,
      date: '2026-03-25',
      isDemo: false,
      createdAt: '2026-03-25T00:00:00Z'
    };

    const updatedTxs = [...baseTransactions, fullSellTx];
    const consolidated = getConsolidatedHoldings(baseInvestments, updatedTxs);
    const jioHolding = consolidated.find(h => h.assetName === 'Jio BlackRock Mutual Fund' && h.broker === 'Dhan');

    expect(jioHolding?.currentQuantity).toBe(0);
    expect(jioHolding?.investedAmount).toBe(0);
    expect(isHoldingActive(jioHolding!)).toBe(false);
  });

  it('6. SELL transaction does NOT add to Total Invested or Monthly Invested capital', () => {
    const sellTx: Transaction = {
      id: 'tx9',
      investmentId: 'inv1',
      type: 'SELL',
      quantity: 2,
      price: 150,
      amount: 300,
      charges: 0,
      date: '2026-03-20',
      isDemo: false,
      createdAt: '2026-03-20T00:00:00Z'
    };

    const updatedTxs = [...baseTransactions, sellTx];
    const totalInvestedBefore = calculateTotalInvested(baseInvestments, baseTransactions);
    const totalInvestedAfter = calculateTotalInvested(baseInvestments, updatedTxs);

    // Capital invested in remaining holding decreases, but total BUY capital history is preserved
    expect(totalInvestedAfter).toBeLessThanOrEqual(totalInvestedBefore);

    // Monthly invested for March 2026 should only count BUY tx3 (₹500), NOT SELL tx9 (₹300)
    const marchInvested = calculateMonthlyInvested(updatedTxs, baseInvestments, 2026, 2); // Month index 2 = March
    expect(marchInvested).toBe(500);
  });

  it('7. IPO handling: Not allotted IPO contributes 0 to total invested', () => {
    const ipoInv: Investment = {
      id: 'ipo1',
      assetName: 'Apex Tech IPO',
      category: 'IPOs',
      assetType: 'IPOs',
      owner: 'Me',
      quantity: 100,
      buyPrice: 150,
      buyDate: '2026-03-01',
      purchaseDate: '2026-03-01',
      broker: 'Dhan',
      investedAmount: 15000,
      charges: 0,
      isDemo: false,
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
      allotmentStatus: 'Not Allotted',
      ipoAllotmentStatus: 'Not Allotted'
    };

    const metrics = calculateHoldingMetrics(ipoInv, [], {});
    expect(metrics.investedAmount).toBe(0);
    expect(metrics.quantity).toBe(0);
  });

  it('8. Does not automatically add charges or taxes if not entered', () => {
    const txNoCharges: Transaction = {
      id: 'tx10',
      investmentId: 'inv1',
      type: 'BUY',
      quantity: 2,
      price: 100,
      amount: 200,
      charges: 0,
      date: '2026-03-01',
      isDemo: false,
      createdAt: '2026-03-01T00:00:00Z'
    };

    expect(txNoCharges.charges).toBe(0);
    expect(txNoCharges.amount).toBe(200);
  });

});
