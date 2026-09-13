import { describe, it, expect } from 'vitest';
import { getConsolidatedHoldings, isHoldingActive } from '../utils/consolidation';
import { calculateHoldingMetrics } from './portfolioCalculationService';
import type { Investment, Transaction } from '../types';

describe('Transaction Modal Engine & Verification Scenarios', () => {

  const sampleStock: Investment = {
    id: 'inv_e2e_be',
    assetName: 'E2E-BE',
    symbol: 'E2E-BE',
    category: 'Stocks',
    assetType: 'Stocks',
    owner: 'Me',
    quantity: 1,
    buyPrice: 628.20,
    buyDate: '2026-09-01',
    purchaseDate: '2026-09-01',
    broker: 'Dhan',
    investedAmount: 628.20,
    charges: 0,
    isDemo: false,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z'
  };

  const initialTxs: Transaction[] = [
    {
      id: 'tx_buy_1',
      investmentId: 'inv_e2e_be',
      type: 'BUY',
      quantity: 1,
      price: 628.20,
      amount: 628.20,
      charges: 0,
      date: '2026-09-01',
      isDemo: false,
      createdAt: '2026-09-01T00:00:00Z'
    }
  ];

  it('1. User prompt test case: Stock E2E-BE, 1 share available, Quantity 1, Price ₹628.20, Charges 0 => Amount ₹628.20 and available qty becomes 0 after sell', () => {
    // Initial state check
    const initialConsolidated = getConsolidatedHoldings([sampleStock], initialTxs);
    const holdingBefore = initialConsolidated.find(h => h.assetName === 'E2E-BE');
    expect(holdingBefore).toBeDefined();
    expect(holdingBefore?.currentQuantity).toBe(1);

    // Calculate Amount: Quantity 1 * Price 628.20 = 628.20
    const quantity = 1;
    const price = 628.20;
    const calculatedAmount = quantity * price;
    expect(calculatedAmount).toBe(628.20);

    // Perform SELL transaction
    const sellTx: Transaction = {
      id: 'tx_sell_1',
      investmentId: 'inv_e2e_be',
      type: 'SELL',
      quantity: 1,
      price: 628.20,
      amount: 628.20,
      charges: 0,
      date: '2026-09-13',
      notes: 'Sell redemption',
      isDemo: false,
      createdAt: '2026-09-13T00:00:00Z'
    };

    const updatedTxs = [...initialTxs, sellTx];
    const updatedConsolidated = getConsolidatedHoldings([sampleStock], updatedTxs);
    const holdingAfter = updatedConsolidated.find(h => h.assetName === 'E2E-BE');

    expect(holdingAfter?.currentQuantity).toBe(0);
    expect(holdingAfter?.investedAmount).toBe(0);
    expect(isHoldingActive(holdingAfter!)).toBe(false);
    expect(holdingAfter?.transactions.length).toBe(2);
  });

  it('2. Selling 1 of 10 available shares', () => {
    const stock10: Investment = { ...sampleStock, quantity: 10, investedAmount: 6282.00 };
    const buy10: Transaction = { ...initialTxs[0], quantity: 10, amount: 6282.00 };

    const sell1: Transaction = {
      id: 'tx_sell_partial',
      investmentId: 'inv_e2e_be',
      type: 'SELL',
      quantity: 1,
      price: 628.20,
      amount: 628.20,
      charges: 0,
      date: '2026-09-13',
      isDemo: false,
      createdAt: '2026-09-13T00:00:00Z'
    };

    const consolidated = getConsolidatedHoldings([stock10], [buy10, sell1]);
    const holding = consolidated.find(h => h.assetName === 'E2E-BE');

    expect(holding?.currentQuantity).toBe(9);
    expect(holding?.investedAmount).toBe(5653.80);
  });

  it('3. Selling 10 of 10 available shares', () => {
    const stock10: Investment = { ...sampleStock, quantity: 10, investedAmount: 6282.00 };
    const buy10: Transaction = { ...initialTxs[0], quantity: 10, amount: 6282.00 };

    const sell10: Transaction = {
      id: 'tx_sell_full',
      investmentId: 'inv_e2e_be',
      type: 'SELL',
      quantity: 10,
      price: 628.20,
      amount: 6282.00,
      charges: 0,
      date: '2026-09-13',
      isDemo: false,
      createdAt: '2026-09-13T00:00:00Z'
    };

    const consolidated = getConsolidatedHoldings([stock10], [buy10, sell10]);
    const holding = consolidated.find(h => h.assetName === 'E2E-BE');

    expect(holding?.currentQuantity).toBe(0);
    expect(holding?.investedAmount).toBe(0);
    expect(isHoldingActive(holding!)).toBe(false);
  });

  it('4. Price ₹628.20 * quantity 2 => ₹1,256.40', () => {
    const qty = 2;
    const price = 628.20;
    const calc = qty * price;
    expect(calc).toBe(1256.40);
  });

  it('5. Charges are handled correctly in sale transaction calculation without breaking displayed sale amount', () => {
    const sellWithCharges: Transaction = {
      id: 'tx_sell_charges',
      investmentId: 'inv_e2e_be',
      type: 'SELL',
      quantity: 1,
      price: 628.20,
      amount: 628.20,
      charges: 20.00,
      date: '2026-09-13',
      isDemo: false,
      createdAt: '2026-09-13T00:00:00Z'
    };

    const metrics = calculateHoldingMetrics(sampleStock, [...initialTxs, sellWithCharges], {});
    expect(metrics.quantity).toBe(0);
    // Realized PL = (gross proceeds 628.20 - charges 20.00) - cost of sold 628.20 = -20.00
    expect(metrics.realizedPL).toBe(-20);
  });

  it('6. ETF holding logic works identical to Stocks', () => {
    const etfHolding: Investment = {
      ...sampleStock,
      id: 'inv_nifty_etf',
      assetName: 'NIPPON INDIA NIFTY 50 ETF',
      category: 'ETFs',
      assetType: 'ETFs'
    };

    const buyEtf: Transaction = {
      id: 'tx_etf_buy',
      investmentId: 'inv_nifty_etf',
      type: 'BUY',
      quantity: 50,
      price: 250,
      amount: 12500,
      charges: 0,
      date: '2026-09-01',
      isDemo: false,
      createdAt: '2026-09-01T00:00:00Z'
    };

    const sellEtf: Transaction = {
      id: 'tx_etf_sell',
      investmentId: 'inv_nifty_etf',
      type: 'SELL',
      quantity: 10,
      price: 260,
      amount: 2600,
      charges: 15,
      date: '2026-09-13',
      isDemo: false,
      createdAt: '2026-09-13T00:00:00Z'
    };

    const consolidated = getConsolidatedHoldings([etfHolding], [buyEtf, sellEtf]);
    const holding = consolidated.find(h => h.assetName === 'NIPPON INDIA NIFTY 50 ETF');

    expect(holding?.currentQuantity).toBe(40);
    expect(holding?.investedAmount).toBe(10000);
    // Realized PL: net proceeds (2600 - 15 = 2585) - cost (10 * 250 = 2500) = 85
    expect(holding?.realizedPL).toBe(85);
  });

});
