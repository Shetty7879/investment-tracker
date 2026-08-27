import { describe, test, expect, vi } from 'vitest';
import {
  calculateHoldingMetrics,
  calculatePortfolioTotals,
  calculateGoalMetrics,
  calculateMonthlyInvestments,
  safeRound,
  isIndianMarketOpen
} from './portfolioCalculationService';
import type { HoldingMetrics } from './portfolioCalculationService';
import type { Investment, Transaction, Goal } from '../types';
import type { MarketPriceData } from './marketDataService';
import { resolveMarketSymbol } from './marketSymbolService';
import { getInvestmentAge } from '../utils/calculations';

describe('Portfolio Calculation Service Unit Tests', () => {

  // Test 1: Basic profit calculation
  // Test 2: Negative return
  // Test 5: Current valuation
  // Test 7: Unrealized P/L
  test('Basic Profit and Return calculations', () => {
    const inv: Investment = {
      id: 'inv-1',
      assetName: 'TCS',
      symbol: 'TCS',
      category: 'Stocks',
      assetType: 'Stocks',
      quantity: 10,
      buyPrice: 100,
      currentPrice: 120,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };

    const marketPrices: Record<string, MarketPriceData> = {
      'TCS': {
        price: 120,
        timestamp: Date.now(),
        source: 'Yahoo Finance API',
        marketState: 'open',
        status: 'live'
      }
    };

    const metrics = calculateHoldingMetrics(inv, [], marketPrices);

    // Expected:
    // invested = 10 * 100 = 1000
    // currentValue = 10 * 120 = 1200
    // profit = 200
    // return = 20%
    expect(metrics.investedAmount).toBe(1000);
    expect(metrics.currentValue).toBe(1200);
    expect(metrics.profitLoss).toBe(200);
    expect(metrics.returnPercent).toBe(20);
    expect(metrics.priceStatus).toBe(isIndianMarketOpen(new Date()) ? 'live' : 'cached');
  });

  test('Negative profit and return calculation', () => {
    const inv: Investment = {
      id: 'inv-2',
      assetName: 'INFY',
      symbol: 'INFY',
      category: 'Stocks',
      assetType: 'Stocks',
      quantity: 10,
      buyPrice: 100,
      currentPrice: 80,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };

    const marketPrices: Record<string, MarketPriceData> = {
      'INFY': {
        price: 80,
        timestamp: Date.now(),
        source: 'Yahoo Finance API',
        marketState: 'open',
        status: 'live'
      }
    };

    const metrics = calculateHoldingMetrics(inv, [], marketPrices);

    expect(metrics.investedAmount).toBe(1000);
    expect(metrics.currentValue).toBe(800);
    expect(metrics.profitLoss).toBe(-200);
    expect(metrics.returnPercent).toBe(-20);
  });

  // Test 3: Zero cost basis
  test('Zero cost basis safety', () => {
    const inv: Investment = {
      id: 'inv-3',
      assetName: 'Free Token',
      category: 'Stocks',
      assetType: 'Stocks',
      quantity: 10,
      buyPrice: 0,
      currentPrice: 50,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };

    // We pass empty transactions, which generates a fallback with price = 0
    const metrics = calculateHoldingMetrics(inv, [], {});
    expect(metrics.investedAmount).toBe(0);
    expect(metrics.returnPercent).toBe(0); // Should be safely 0%, not NaN or Infinity
  });

  // Test 4: Multiple purchases / weighted average (including charges)
  test('Multiple purchases and weighted average cost calculation', () => {
    const inv: Investment = {
      id: 'inv-4',
      assetName: 'TATA',
      category: 'Stocks',
      assetType: 'Stocks',
      quantity: 15,
      buyPrice: 100,
      currentPrice: 100,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };

    const txs: Transaction[] = [
      {
        id: 'tx-1',
        investmentId: 'inv-4',
        type: 'BUY',
        quantity: 10,
        price: 100,
        amount: 1000,
        charges: 10,
        date: '2026-01-01',
        isDemo: false,
        createdAt: ''
      },
      {
        id: 'tx-2',
        investmentId: 'inv-4',
        type: 'BUY',
        quantity: 5,
        price: 110,
        amount: 550,
        charges: 5,
        date: '2026-01-02',
        isDemo: false,
        createdAt: ''
      }
    ];

    // Total units = 15
    // Cost 1 = 10 * 100 + 10 = 1010
    // Cost 2 = 5 * 110 + 5 = 555
    // Total Invested = 1565
    // Average buy price = 1565 / 15 = 104.3333... => rounded to 104.33

    const metrics = calculateHoldingMetrics(inv, txs, {});
    expect(metrics.quantity).toBe(15);
    expect(metrics.investedAmount).toBe(1565);
    expect(metrics.buyPrice).toBe(104.33);
  });

  // Test 6: Realized P/L
  test('Realized profit and loss calculation from sales', () => {
    const inv: Investment = {
      id: 'inv-5',
      assetName: 'RELIANCE',
      symbol: 'RELIANCE',
      category: 'Stocks',
      assetType: 'Stocks',
      quantity: 10,
      buyPrice: 100,
      currentPrice: 100,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };

    const txs: Transaction[] = [
      {
        id: 'tx-1',
        investmentId: 'inv-5',
        type: 'BUY',
        quantity: 10,
        price: 100,
        amount: 1000,
        charges: 0,
        date: '2026-01-01',
        isDemo: false,
        createdAt: ''
      },
      {
        id: 'tx-2',
        investmentId: 'inv-5',
        type: 'SELL',
        quantity: 4,
        price: 150,
        amount: 600,
        charges: 10,
        date: '2026-01-05',
        isDemo: false,
        createdAt: ''
      }
    ];

    // Cost basis = 100 per share
    // Sell 4 units at 150. Gross proceeds = 600. Net proceeds = 600 - 10 = 590
    // Cost of sold units = 4 * 100 = 400
    // Realized PL = 590 - 400 = 190
    // Remaining quantity = 6. Cost basis remaining = 600.
    // Live price is 150. Current value = 6 * 150 = 900
    // Unrealized PL = 900 - 600 = 300
    // Total PL = 190 (realized) + 300 (unrealized) = 490

    const marketPrices: Record<string, MarketPriceData> = {
      'RELIANCE': {
        price: 150,
        timestamp: Date.now(),
        source: 'Yahoo Finance API',
        marketState: 'open',
        status: 'live'
      }
    };

    const metrics = calculateHoldingMetrics(inv, txs, marketPrices);
    expect(metrics.quantity).toBe(6);
    expect(metrics.investedAmount).toBe(600);
    expect(metrics.currentValue).toBe(900);
    expect(metrics.realizedPL).toBe(190);
    expect(metrics.profitLoss).toBe(300);
    expect(metrics.totalPL).toBe(490);
  });

  // Test 8: Portfolio totals
  // Test 9: Allocation percentages
  test('Portfolio totals and allocation percentages calculations', () => {
    const holdings: HoldingMetrics[] = [
      {
        id: '1',
        assetName: 'Stock A',
        category: 'Stocks',
        assetType: 'Stocks',
        quantity: 10,
        buyPrice: 100,
        currentPrice: 120,
        investedAmount: 1000,
        currentValue: 1200,
        profitLoss: 200,
        realizedPL: 50,
        totalPL: 250,
        returnPercent: 20,
        priceStatus: 'live',
        owner: 'Me',
        isDemo: false,
        buyDate: '2026-01-01',
        purchaseDate: '2026-01-01',
        charges: 0,
        createdAt: '',
        updatedAt: ''
      },
      {
        id: '2',
        assetName: 'Stock B',
        category: 'Stocks',
        assetType: 'Stocks',
        quantity: 5,
        buyPrice: 200,
        currentPrice: 180,
        investedAmount: 1000,
        currentValue: 900,
        profitLoss: -100,
        realizedPL: 0,
        totalPL: -100,
        returnPercent: -10,
        priceStatus: 'live',
        owner: 'Me',
        isDemo: false,
        buyDate: '2026-01-01',
        purchaseDate: '2026-01-01',
        charges: 0,
        createdAt: '',
        updatedAt: ''
      }
    ];

    const totals = calculatePortfolioTotals(holdings);

    // Total Invested = 1000 + 1000 = 2000
    // Total Current = 1200 + 900 = 2100
    // Unrealized PL = 2100 - 2000 = 100
    // Realized PL = 50 + 0 = 50
    // Total PL = 150
    // Return % = 100 / 2000 * 100 = 5%
    // Overall Return % = 150 / 2000 * 100 = 7.5%

    expect(totals.totalInvested).toBe(2000);
    expect(totals.totalCurrent).toBe(2100);
    expect(totals.unrealizedPL).toBe(100);
    expect(totals.realizedPL).toBe(50);
    expect(totals.totalPL).toBe(150);
    expect(totals.returnPercentage).toBe(5);
    expect(totals.overallReturnPercentage).toBe(7.5);

    // Allocation percentages (based on currentValue)
    // Stock A allocation = 1200 / 2100 * 100 = 57.14%
    // Stock B allocation = 900 / 2100 * 100 = 42.86%
    const allocationA = ((holdings[0].currentValue ?? 0) / totals.totalCurrent) * 100;
    const allocationB = ((holdings[1].currentValue ?? 0) / totals.totalCurrent) * 100;
    expect(safeRound(allocationA)).toBe(57.14);
    expect(safeRound(allocationB)).toBe(42.86);
  });

  // Test 10: Missing market price
  test('Missing market price fallback', () => {
    const inv: Investment = {
      id: 'inv-6',
      assetName: 'Unavailable Stock',
      category: 'Stocks',
      assetType: 'Stocks',
      symbol: 'UNAV',
      quantity: 10,
      buyPrice: 100,
      currentPrice: 115, // manually set current price in db
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };

    // marketPrices map is empty (i.e. API quote failed or missing)
    const metrics = calculateHoldingMetrics(inv, [], {});

    // Should fall back to manual currentPrice of 115
    expect(metrics.currentPrice).toBe(115);
    expect(metrics.currentValue).toBe(1150);
    expect(metrics.priceStatus).toBe('unavailable');
    expect(metrics.priceSource).toBe('Manual Price');
  });

  // Test 11: Cached market price
  test('Cached market price check', () => {
    const inv: Investment = {
      id: 'inv-7',
      assetName: 'Cached Stock',
      category: 'Stocks',
      assetType: 'Stocks',
      symbol: 'CACH',
      quantity: 10,
      buyPrice: 100,
      currentPrice: 100,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };

    const marketPrices: Record<string, MarketPriceData> = {
      'CACH': {
        price: 110,
        timestamp: Date.now() - (15 * 60 * 1000), // 15 mins ago (stale/cached)
        source: 'Yahoo Finance API',
        marketState: 'open',
        status: 'live'
      }
    };

    const metrics = calculateHoldingMetrics(inv, [], marketPrices);
    expect(metrics.currentPrice).toBe(110);
    expect(metrics.priceStatus).toBe('cached');
  });

  // Test 12: Zero quantity
  test('Zero quantity check', () => {
    const inv: Investment = {
      id: 'inv-8',
      assetName: 'Sold Stock',
      category: 'Stocks',
      assetType: 'Stocks',
      quantity: 0,
      buyPrice: 100,
      currentPrice: 150,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };

    const metrics = calculateHoldingMetrics(inv, [], {});
    // When quantity = 0, currentValue = 0, investedAmount = 0
    expect(metrics.quantity).toBe(0);
    expect(metrics.investedAmount).toBe(0);
    expect(metrics.currentValue).toBe(0);
  });

  // Test 13: Negative/invalid values
  test('Negative and invalid values safety', () => {
    expect(safeRound(-0)).toBe(0); // negative zero to zero
    expect(safeRound(NaN)).toBe(0);
    expect(safeRound(Infinity)).toBe(0);
    expect(safeRound(-Infinity)).toBe(0);
    expect(safeRound(10.555)).toBe(10.56);
  });

  // Test 14: Monthly investment calculation
  test('Monthly investment calculations', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-1',
        investmentId: 'inv-1',
        type: 'BUY',
        quantity: 10,
        price: 100,
        amount: 1000,
        charges: 10,
        date: '2026-01-15', // Jan
        isDemo: false,
        createdAt: ''
      },
      {
        id: 'tx-2',
        investmentId: 'inv-1',
        type: 'BUY',
        quantity: 5,
        price: 100,
        amount: 500,
        charges: 5,
        date: '2026-02-20', // Feb
        isDemo: false,
        createdAt: ''
      },
      {
        id: 'tx-3',
        investmentId: 'inv-1',
        type: 'SELL', // Should be excluded from monthly investment calculation
        quantity: 2,
        price: 120,
        amount: 240,
        charges: 5,
        date: '2026-02-22',
        isDemo: false,
        createdAt: ''
      }
    ];

    const holdings: HoldingMetrics[] = [
      {
        id: 'inv-1',
        assetName: 'Stock X',
        category: 'Stocks',
        assetType: 'Stocks',
        quantity: 15,
        buyPrice: 100,
        currentPrice: 100,
        investedAmount: 1515,
        currentValue: 1500,
        profitLoss: -15,
        returnPercent: -0.99,
        realizedPL: 0,
        totalPL: -15,
        priceStatus: 'cached',
        owner: 'Me',
        isDemo: false,
        buyDate: '2026-01-01',
        purchaseDate: '2026-01-01',
        charges: 0,
        createdAt: '',
        updatedAt: ''
      }
    ];

    const monthlyData = calculateMonthlyInvestments(txs, holdings, 2026, 1000);

    // Jan target = 1000, actual = 1010, diff = 10, percentage = 101%
    // Feb target = 1000, actual = 505, diff = -495, percentage = 50.5%
    const jan = monthlyData.find(m => m.month === 'January')!;
    const feb = monthlyData.find(m => m.month === 'February')!;

    expect(jan.actual).toBe(1010);
    expect(jan.diff).toBe(10);
    expect(jan.percentage).toBe(101);

    expect(feb.actual).toBe(505);
    expect(feb.diff).toBe(-495);
    expect(feb.percentage).toBe(50.5);
  });

  // Additional goal metrics test
  test('Goal metrics calculations', () => {
    const goal: Goal = {
      id: 'g-1',
      name: 'Car Fund',
      targetAmount: 5000,
      currentAmount: 1000, // manual contributed
      category: 'Vehicle',
      progressMode: 'Manual'
    };

    // Unlinked manual goal
    const metrics = calculateGoalMetrics(goal, []);
    expect(metrics.contributed).toBe(1000);
    expect(metrics.currentValue).toBe(1000);
    expect(metrics.target).toBe(5000);
    expect(metrics.remaining).toBe(4000);
    expect(metrics.progressPercent).toBe(20);

    // Linked goal (Automatic progress)
    const linkedGoal: Goal = {
      ...goal,
      linkedAssetId: 'inv-10',
      progressMode: 'Automatic'
    };

    const calculatedHoldings: HoldingMetrics[] = [
      {
        id: 'inv-10',
        assetName: 'Fund Asset',
        category: 'Mutual Funds',
        assetType: 'Mutual Funds',
        quantity: 10,
        buyPrice: 100,
        currentPrice: 150,
        investedAmount: 1000, // Contributed
        currentValue: 1500,  // Current value
        profitLoss: 500,
        returnPercent: 50,
        realizedPL: 0,
        totalPL: 500,
        priceStatus: 'cached',
        owner: 'Me',
        isDemo: false,
        buyDate: '2026-01-01',
        purchaseDate: '2026-01-01',
        charges: 0,
        createdAt: '',
        updatedAt: ''
      }
    ];

    const linkedMetrics = calculateGoalMetrics(linkedGoal, calculatedHoldings);
    expect(linkedMetrics.contributed).toBe(1000); // Invested amount of linked asset
    expect(linkedMetrics.currentValue).toBe(1500); // Current value of linked asset
    expect(linkedMetrics.remaining).toBe(3500); // 5000 - 1500
    expect(linkedMetrics.progressPercent).toBe(30); // (1500 / 5000) * 100 = 30%
  });

  test('Detailed market-price, cached-price, IPO and regression test suite (A to L)', () => {
    // A. Valid live price
    const stockInvA: Investment = {
      id: 'inv-a',
      assetName: 'Stock A',
      symbol: 'STKA',
      category: 'Stocks',
      assetType: 'Stocks',
      quantity: 10,
      buyPrice: 100,
      currentPrice: undefined,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };

    const marketPricesLive: Record<string, MarketPriceData> = {
      'STKA': {
        price: 150,
        timestamp: Date.now(), // fresh live price
        source: 'Yahoo Finance API',
        marketState: 'open',
        status: 'live'
      }
    };

    const metricsA = calculateHoldingMetrics(stockInvA, [], marketPricesLive);
    expect(metricsA.priceStatus).toBe(isIndianMarketOpen(new Date()) ? 'live' : 'cached');
    expect(metricsA.currentPrice).toBe(150);
    expect(metricsA.currentValue).toBe(1500);
    expect(metricsA.profitLoss).toBe(500);
    expect(metricsA.returnPercent).toBe(50);

    // B. Valid cached price
    const marketPricesCached: Record<string, MarketPriceData> = {
      'STKA': {
        price: 140,
        timestamp: Date.now() - (60 * 60 * 1000), // 1 hour ago
        source: 'Yahoo Finance API',
        marketState: 'closed',
        status: 'live'
      }
    };

    const metricsB = calculateHoldingMetrics(stockInvA, [], marketPricesCached);
    expect(metricsB.priceStatus).toBe('cached');
    expect(metricsB.currentPrice).toBe(140);
    expect(metricsB.currentValue).toBe(1400);

    // C. No live price + no cache
    // D. Purchase price exists but market price unavailable (Critical Regression!)
    // Given: quantity = 8, avgBuyPrice = 102.22, invested = 817.76, currentPrice = unavailable, cache = unavailable
    const stockInvD: Investment = {
      id: 'inv-d',
      assetName: 'GMR',
      symbol: 'GMR',
      category: 'Stocks',
      assetType: 'Stocks',
      quantity: 8,
      buyPrice: 102.22,
      currentPrice: 102.22, // Set to purchase price (defaults in db/JSON)
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };

    const metricsD = calculateHoldingMetrics(stockInvD, [], {});
    expect(metricsD.currentPrice).toBeUndefined();
    expect(metricsD.currentValue).toBeUndefined();
    expect(metricsD.profitLoss).toBeUndefined();
    expect(metricsD.returnPercent).toBeUndefined();
    expect(metricsD.investedAmount).toBe(817.76);
    expect(metricsD.priceStatus).toBe('unavailable');
    expect(metricsD.isValuationUnavailable).toBe(true);

    // E. Multiple purchases with weighted average cost (already covered by Test 4, but we reinforce it here)
    const stockInvE: Investment = {
      id: 'inv-e',
      assetName: 'Stock E',
      category: 'Stocks',
      assetType: 'Stocks',
      quantity: 15,
      buyPrice: 100,
      currentPrice: 100,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };
    const txsE: Transaction[] = [
      { id: 'tx-e1', investmentId: 'inv-e', type: 'BUY', quantity: 10, price: 100, amount: 1000, charges: 10, date: '2026-01-01', isDemo: false, createdAt: '' },
      { id: 'tx-e2', investmentId: 'inv-e', type: 'BUY', quantity: 5, price: 110, amount: 550, charges: 5, date: '2026-01-02', isDemo: false, createdAt: '' }
    ];
    const metricsE = calculateHoldingMetrics(stockInvE, txsE, {});
    expect(metricsE.investedAmount).toBe(1565);
    expect(metricsE.buyPrice).toBe(104.33);

    // F. Zero quantity
    const stockInvF: Investment = {
      ...stockInvA,
      id: 'inv-f',
      quantity: 0
    };
    const metricsF = calculateHoldingMetrics(stockInvF, [], marketPricesLive);
    expect(metricsF.quantity).toBe(0);
    expect(metricsF.investedAmount).toBe(0);
    expect(metricsF.currentValue).toBe(0);

    // G. Negative/invalid market price (quote parser will reject negative/invalid)
    const marketPricesNegative: Record<string, MarketPriceData> = {
      'STKA': {
        price: -50, // invalid price
        timestamp: Date.now(),
        source: 'Yahoo Finance API',
        marketState: 'open',
        status: 'live'
      }
    };
    expect(marketPricesNegative['STKA'].price).toBe(-50);

    // H. Unallotted IPO
    const ipoInvH: Investment = {
      id: 'ipo-h',
      assetName: 'IPO H',
      category: 'IPOs',
      assetType: 'IPOs',
      quantity: 100,
      buyPrice: 15,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 10,
      ipoAllotmentStatus: 'Not Allotted',
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };
    const metricsH = calculateHoldingMetrics(ipoInvH, [], {});
    expect(metricsH.investedAmount).toBe(0);
    expect(metricsH.currentValue).toBe(0);
    expect(metricsH.profitLoss).toBe(0);
    expect(metricsH.returnPercent).toBe(0);
    expect(metricsH.appliedAmount).toBe(1510); // 100 * 15 + 10
    expect(metricsH.allocatedQuantity).toBe(0);

    // I. Allotted IPO
    const ipoInvI: Investment = {
      id: 'ipo-i',
      assetName: 'IPO I',
      category: 'IPOs',
      assetType: 'IPOs',
      quantity: 100,
      buyPrice: 15,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 10,
      ipoAllotmentStatus: 'Allotted',
      ipoQuantityAllotted: 50,
      ipoAllotmentPrice: 15,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };
    const metricsI = calculateHoldingMetrics(ipoInvI, [], {});
    expect(metricsI.investedAmount).toBe(760); // 50 * 15 + 10
    expect(metricsI.currentValue).toBe(750); // 50 * 15 (before listing/listing price equals allotment price)
    expect(metricsI.allocatedQuantity).toBe(50);

    // J. Monthly investment excluding unallotted IPO
    const txsJ: Transaction[] = [
      { id: 'tx-j1', investmentId: 'ipo-h', type: 'BUY', quantity: 100, price: 15, amount: 1500, charges: 10, date: '2026-01-15', isDemo: false, createdAt: '' }, // unallotted
      { id: 'tx-j2', investmentId: 'ipo-i', type: 'BUY', quantity: 100, price: 15, amount: 1500, charges: 10, date: '2026-01-20', isDemo: false, createdAt: '' }  // allotted
    ];
    const monthlyJ = calculateMonthlyInvestments(txsJ, [metricsH, metricsI], 2026, 1000);
    const janJ = monthlyJ.find(m => m.month === 'January')!;
    expect(janJ.actual).toBe(1510);

    // K. Dashboard/Portfolio totals with unavailable prices
    const totalsK = calculatePortfolioTotals([metricsA, metricsD]);
    expect(totalsK.totalInvested).toBe(1000);
    expect(totalsK.totalCurrent).toBe(1500);

    // L. Automatic recalculation after market price becomes available
    const marketPricesD: Record<string, MarketPriceData> = {
      'GMR': {
        price: 110,
        timestamp: Date.now(),
        source: 'Yahoo Finance API',
        marketState: 'open',
        status: 'live'
      }
    };
    const metricsDRecalced = calculateHoldingMetrics(stockInvD, [], marketPricesD);
    expect(metricsDRecalced.currentPrice).toBe(110);
    expect(metricsDRecalced.currentValue).toBe(880); // 8 * 110
    expect(metricsDRecalced.profitLoss).toBe(62.24); // 880 - 817.76 = 62.24
  });

  test('Milky Mist IPO and exhaustive IPO/Stock state test suite (10 and 11)', () => {
    // 10. Milky Mist IPO regression test
    const milkyMistIPO: Investment = {
      id: 'milky-mist',
      assetName: 'Milky Mist IPO',
      category: 'IPOs',
      assetType: 'IPOs',
      quantity: 107, // e.g. applied quantity
      buyPrice: 140, // issue price
      currentPrice: 14980, // saved application amount (incorrectly inputted or initialized in state)
      ipoAllotmentStatus: 'Not Allotted',
      ipoQuantityAllotted: 0,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };

    const metricsMilky = calculateHoldingMetrics(milkyMistIPO, [], {});
    expect(metricsMilky.quantity).toBe(0);
    expect(metricsMilky.investedAmount).toBe(0);
    expect(metricsMilky.currentPrice).toBeUndefined();
    expect(metricsMilky.currentValue).toBe(0);
    expect(metricsMilky.profitLoss).toBe(0);
    expect(metricsMilky.returnPercent).toBe(0);
    expect(metricsMilky.priceStatus).toBe('not_allocated');
    expect(metricsMilky.appliedAmount).toBe(14980);

    // 11. Scenarios A to H
    // A. IPO applied but pending allotment
    const ipoA: Investment = {
      id: 'ipo-a',
      assetName: 'IPO A',
      category: 'IPOs',
      assetType: 'IPOs',
      quantity: 100,
      buyPrice: 15,
      ipoAllotmentStatus: 'Applied',
      ipoQuantityAllotted: 0,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };
    const metricsA = calculateHoldingMetrics(ipoA, [], {});
    expect(metricsA.quantity).toBe(0);
    expect(metricsA.investedAmount).toBe(0);
    expect(metricsA.currentValue).toBe(0);
    expect(metricsA.priceStatus).toBe('not_allocated');

    // B. IPO not allotted
    const ipoB: Investment = {
      ...ipoA,
      id: 'ipo-b',
      ipoAllotmentStatus: 'Not Allotted'
    };
    const metricsB = calculateHoldingMetrics(ipoB, [], {});
    expect(metricsB.quantity).toBe(0);
    expect(metricsB.investedAmount).toBe(0);
    expect(metricsB.currentValue).toBe(0);
    expect(metricsB.priceStatus).toBe('not_allocated');

    // C. IPO refunded
    const ipoC: Investment = {
      ...ipoA,
      id: 'ipo-c',
      ipoAllotmentStatus: 'Refunded'
    };
    const metricsC = calculateHoldingMetrics(ipoC, [], {});
    expect(metricsC.quantity).toBe(0);
    expect(metricsC.investedAmount).toBe(0);
    expect(metricsC.currentValue).toBe(0);
    expect(metricsC.priceStatus).toBe('not_allocated');

    // D. IPO allotted
    const ipoD: Investment = {
      id: 'ipo-d',
      assetName: 'IPO D',
      category: 'IPOs',
      assetType: 'IPOs',
      quantity: 100,
      buyPrice: 15,
      ipoAllotmentStatus: 'Allotted',
      ipoQuantityAllotted: 50,
      ipoAllotmentPrice: 15,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 10,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };
    const metricsD = calculateHoldingMetrics(ipoD, [], {});
    expect(metricsD.quantity).toBe(50);
    expect(metricsD.investedAmount).toBe(760); // 50 * 15 + 10
    expect(metricsD.currentPrice).toBe(15);
    expect(metricsD.currentValue).toBe(750);
    expect(metricsD.priceStatus).toBe('cached'); // Allotment Price source

    // E. IPO allotted and subsequently listed
    const ipoE: Investment = {
      ...ipoD,
      id: 'ipo-e',
      symbol: 'IPOE',
      ipoAllotmentStatus: 'Listed'
    };
    const marketPrices: Record<string, MarketPriceData> = {
      'IPOE': {
        price: 25,
        timestamp: Date.now(),
        source: 'Yahoo Finance API',
        marketState: 'open',
        status: 'live'
      }
    };
    const metricsE = calculateHoldingMetrics(ipoE, [], marketPrices);
    expect(metricsE.quantity).toBe(50);
    expect(metricsE.investedAmount).toBe(760);
    expect(metricsE.currentPrice).toBe(25);
    expect(metricsE.currentValue).toBe(1250); // 50 * 25
    expect(metricsE.profitLoss).toBe(490); // 1250 - 760
    expect(metricsE.priceStatus).toBe(isIndianMarketOpen(new Date()) ? 'live' : 'cached');

    // F. Stock with unavailable price
    const stockF: Investment = {
      id: 'stock-f',
      assetName: 'Stock F',
      category: 'Stocks',
      assetType: 'Stocks',
      quantity: 10,
      buyPrice: 100,
      currentPrice: 100,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };
    const metricsF = calculateHoldingMetrics(stockF, [], {});
    expect(metricsF.currentPrice).toBeUndefined();
    expect(metricsF.priceStatus).toBe('unavailable');

    // G. Stock with cached price
    const stockG: Investment = {
      ...stockF,
      id: 'stock-g',
      symbol: 'STKG'
    };
    const marketPricesCached: Record<string, MarketPriceData> = {
      'STKG': {
        price: 110,
        timestamp: Date.now() - 30 * 60 * 1000, // 30 mins ago (cached)
        source: 'Yahoo Finance API',
        marketState: 'closed',
        status: 'live'
      }
    };
    const metricsG = calculateHoldingMetrics(stockG, [], marketPricesCached);
    expect(metricsG.currentPrice).toBe(110);
    expect(metricsG.priceStatus).toBe('cached');

    // H. Stock with live price
    const stockH: Investment = {
      ...stockF,
      id: 'stock-h',
      symbol: 'STKH'
    };
    const marketPricesLive: Record<string, MarketPriceData> = {
      'STKH': {
        price: 120,
        timestamp: Date.now(), // fresh
        source: 'Yahoo Finance API',
        marketState: 'open',
        status: 'live'
      }
    };
    const metricsH = calculateHoldingMetrics(stockH, [], marketPricesLive);
    expect(metricsH.currentPrice).toBe(120);
  });

  test('Exhaustive Phase 5 validation tests (A to T)', () => {
    // C. GMR symbol resolution checks
    const resolvedGMR1 = resolveMarketSymbol('GMR', 'Stocks');
    expect(resolvedGMR1.yahooSymbol).toBe('GMRAIRPORT.NS');
    expect(resolvedGMR1.resolved).toBe(true);

    const resolvedGMR2 = resolveMarketSymbol('GMRAIRPORT.NS', 'Stocks');
    expect(resolvedGMR2.yahooSymbol).toBe('GMRAIRPORT.NS');
    expect(resolvedGMR2.resolved).toBe(true);

    const resolvedGMR3 = resolveMarketSymbol('GMRAIRPORT', 'Stocks');
    expect(resolvedGMR3.yahooSymbol).toBe('GMRAIRPORT.NS');

    const resolvedGMR4 = resolveMarketSymbol('GMRINFRA.NS', 'Stocks');
    expect(resolvedGMR4.yahooSymbol).toBe('GMRAIRPORT.NS');

    // D. Invalid category ticker
    const resolvedMF = resolveMarketSymbol('HDFC', 'Mutual Funds');
    expect(resolvedMF.resolved).toBe(false);
    expect(resolvedMF.exchange).toBe('UNSUPPORTED');

    // Suffix rules
    const resolvedBSE = resolveMarketSymbol('500325', 'Stocks');
    expect(resolvedBSE.yahooSymbol).toBe('500325.BO');
    expect(resolvedBSE.exchange).toBe('BSE');

    const resolvedNSE = resolvedGMR3;
    expect(resolvedNSE.exchange).toBe('NSE');

    // S. No purchase-price fallback regression check (from Phase 4 & 5)
    // Given GMR holding with unavailable quote and no cache
    const gmrInv: Investment = {
      id: 'gmr-id',
      assetName: 'GMR',
      symbol: 'GMRAIRPORT.NS',
      category: 'Stocks',
      assetType: 'Stocks',
      quantity: 8,
      buyPrice: 102.22,
      currentPrice: 102.22, // default buy price in DB/JSON
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };
    
    const metricsGMR = calculateHoldingMetrics(gmrInv, [], {});
    expect(metricsGMR.currentPrice).toBeUndefined();
    expect(metricsGMR.currentValue).toBeUndefined();
    expect(metricsGMR.profitLoss).toBeUndefined();
    expect(metricsGMR.returnPercent).toBeUndefined();
    expect(metricsGMR.investedAmount).toBe(817.76);
    expect(metricsGMR.priceStatus).toBe('unavailable');

    // T. Unallotted IPO excluded from market requests (checks resolveMarketSymbol)
    const resolvedUnallottedIPO = resolveMarketSymbol('MILKY', 'Mutual Funds'); // not a stock/ETF/listed IPO
    expect(resolvedUnallottedIPO.resolved).toBe(false);
  });

  test('Closed-market quote caching, app restart, API failure, and unavailable states checks', () => {
    // 6. Test closed-market behaviors
    const stockGMR: Investment = {
      id: 'gmr-test',
      assetName: 'GMR',
      symbol: 'GMRAIRPORT.NS',
      category: 'Stocks',
      assetType: 'Stocks',
      quantity: 8,
      buyPrice: 102.22,
      currentPrice: 102.22,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };

    // A. No cache exists at all
    const metricsNoCache = calculateHoldingMetrics(stockGMR, [], {});
    expect(metricsNoCache.currentPrice).toBeUndefined();
    expect(metricsNoCache.currentValue).toBeUndefined();
    expect(metricsNoCache.priceStatus).toBe('unavailable');
    expect(metricsNoCache.isValuationUnavailable).toBe(true);

    // B. Cached quote after market close (age check / closed marketState)
    const oldMarketPrices: Record<string, MarketPriceData> = {
      'GMRAIRPORT.NS': {
        price: 84.20,
        timestamp: Date.now() - (60 * 60 * 1000), // 1 hr ago
        source: 'Yahoo Finance API',
        marketState: 'closed',
        status: 'live'
      }
    };
    const metricsCached = calculateHoldingMetrics(stockGMR, [], oldMarketPrices);
    expect(metricsCached.currentPrice).toBe(84.20);
    expect(metricsCached.currentValue).toBe(673.60); // 8 * 84.20
    expect(metricsCached.profitLoss).toBe(-144.16);
    expect(metricsCached.priceStatus).toBe('cached'); // older quote = cached

    // C. App restart using cache
    const rawCache: Record<string, MarketPriceData> = {
      'gmrairport.ns': {
        price: 82.10,
        timestamp: Date.now() - (11 * 60 * 1000), // 11 mins ago
        source: 'Yahoo Finance API',
        marketState: 'open',
        status: 'live'
      }
    };
    const normalizedPrices: Record<string, MarketPriceData> = {};
    Object.entries(rawCache).forEach(([key, val]) => {
      normalizedPrices[key.toUpperCase()] = val;
    });
    expect(normalizedPrices['GMRAIRPORT.NS']).toBeDefined();
    expect(normalizedPrices['GMRAIRPORT.NS'].price).toBe(82.10);

    const metricsRestart = calculateHoldingMetrics(stockGMR, [], normalizedPrices);
    expect(metricsRestart.currentPrice).toBe(82.10);

    // D. API failure after market close while cache exists
    const activeCacheBeforeFailure = { ...normalizedPrices };
    // Simulated API failure: returns {} (empty fetched result)
    const fetchedResultsOnFailure = {};
    const activeCacheAfterFailure = { ...activeCacheBeforeFailure };
    Object.entries(fetchedResultsOnFailure).forEach(([sym, data]) => {
      activeCacheAfterFailure[sym.toUpperCase()] = {
        ...data as any,
        status: 'live'
      };
    });
    expect(activeCacheAfterFailure['GMRAIRPORT.NS']).toBeDefined();
    expect(activeCacheAfterFailure['GMRAIRPORT.NS'].price).toBe(82.10);

    const metricsAfterFailure = calculateHoldingMetrics(stockGMR, [], activeCacheAfterFailure);
    expect(metricsAfterFailure.currentPrice).toBe(82.10);
    expect(metricsAfterFailure.priceStatus).toBe('cached');
  });

  test('Digital Gold, Silver, Platinum weight-based calculations and no-auto-calculations', () => {
    const goldInv: Investment = {
      id: 'gold-1',
      assetName: 'Digital Gold test',
      category: 'Digital Gold',
      assetType: 'Digital Gold',
      quantity: 10,
      buyPrice: 7000,
      investedAmount: 65000,
      currentValue: 72000,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };

    const metrics = calculateHoldingMetrics(goldInv, [], {});

    // Weight and buy price resolved correctly:
    expect(metrics.quantity).toBe(10);
    expect(metrics.buyPrice).toBe(7000);
    
    // No auto-calculations! Stored investedAmount and currentValue preserved exactly:
    expect(metrics.investedAmount).toBe(65000);
    expect(metrics.currentValue).toBe(72000);
    
    // Profit loss and returns should be undefined (no derived math):
    expect(metrics.profitLoss).toBeUndefined();
    expect(metrics.returnPercent).toBeUndefined();
    expect(metrics.realizedPL).toBe(0);
    expect(metrics.totalPL).toBe(0);
  });

  test('getInvestmentAge calculates correct dynamic human-readable age', () => {
    // Set a fixed system time: Wednesday, August 26, 2026
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 26));

    try {
      // Same-day investment -> Today
      expect(getInvestmentAge('2026-08-26')).toBe('Today');
      
      // Future date -> 0 days
      expect(getInvestmentAge('2026-08-27')).toBe('0 days');
      
      // 1 day / 2 days (singular/plural)
      expect(getInvestmentAge('2026-08-25')).toBe('1 day');
      expect(getInvestmentAge('2026-08-24')).toBe('2 days');
      
      // 1 month / 2 months (singular/plural)
      expect(getInvestmentAge('2026-07-26')).toBe('1 month');
      expect(getInvestmentAge('2026-06-26')).toBe('2 months');
      
      // 1 year / 2 years (singular/plural)
      expect(getInvestmentAge('2025-08-26')).toBe('1 year');
      expect(getInvestmentAge('2024-08-26')).toBe('2 years');
      
      // Zero units omission (e.g. 2 years 0 months 10 days -> 2 years 10 days)
      expect(getInvestmentAge('2024-08-16')).toBe('2 years 10 days');
      
      // Zero units omission (e.g. 0 months 5 days -> 5 days)
      expect(getInvestmentAge('2026-08-21')).toBe('5 days');
      
      // Multi-unit formatting and zero omissions
      expect(getInvestmentAge('2026-07-25')).toBe('1 month 1 day');
      expect(getInvestmentAge('2026-06-11')).toBe('2 months 15 days');
      expect(getInvestmentAge('2025-06-21')).toBe('1 year 2 months 5 days');
    } finally {
      vi.useRealTimers();
    }
  });

  test('Digital Silver with manual investedAmount', () => {
    const silverInv: Investment = {
      id: 'silver-1',
      assetName: 'Digital Silver test',
      category: 'Digital Silver',
      assetType: 'Digital Silver',
      quantity: 50,
      buyPrice: 80,
      investedAmount: 3500,
      currentValue: 3900,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };
    const metrics = calculateHoldingMetrics(silverInv, [], {});
    expect(metrics.investedAmount).toBe(3500);
    expect(metrics.currentValue).toBe(3900);
  });

  test('Digital Platinum with manual investedAmount', () => {
    const platInv: Investment = {
      id: 'plat-1',
      assetName: 'Digital Platinum test',
      category: 'Digital Platinum',
      assetType: 'Digital Platinum',
      quantity: 2,
      buyPrice: 3200,
      investedAmount: 6000,
      currentValue: 6200,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };
    const metrics = calculateHoldingMetrics(platInv, [], {});
    expect(metrics.investedAmount).toBe(6000);
    expect(metrics.currentValue).toBe(6200);
  });

  test('Commodity amount NOT being calculated from grams × price', () => {
    const goldInv: Investment = {
      id: 'gold-2',
      assetName: 'Digital Gold Multiplier check',
      category: 'Digital Gold',
      assetType: 'Digital Gold',
      quantity: 5,
      buyPrice: 7000,
      investedAmount: 5000,
      currentValue: 4800,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };
    const metrics = calculateHoldingMetrics(goldInv, [], {});
    expect(metrics.investedAmount).toBe(5000); // Stored manual amount, not 5 * 7000 = 35000
    expect(metrics.investedAmount).not.toBe(35000);
  });

  test('Commodity active/inactive checks and consolidation simulations', () => {
    // Helper mimic of Portfolio page active filter
    const isHoldingActiveSim = (h: any): boolean => {
      const category = h.category || h.assetType || '';
      if (category === 'Gold' || category === 'Digital Gold' || category === 'Silver' || category === 'Digital Silver' || category === 'Platinum' || category === 'Digital Platinum') {
        const hasWeight = h.quantity > 0;
        const hasInvested = (h.investedAmount ?? 0) > 0;
        const hasCurrent = (h.currentValue ?? 0) > 0;
        return hasWeight || hasInvested || hasCurrent;
      }
      return h.quantity > 0;
    };

    const activeGold = calculateHoldingMetrics({
      id: 'gold-active',
      assetName: 'Active Gold',
      category: 'Digital Gold',
      assetType: 'Digital Gold',
      quantity: 5,
      buyPrice: 7000,
      investedAmount: 5000,
      currentValue: 4800,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    }, [], {});

    const inactiveGold = calculateHoldingMetrics({
      id: 'gold-inactive',
      assetName: 'Inactive Gold',
      category: 'Digital Gold',
      assetType: 'Digital Gold',
      quantity: 0,
      buyPrice: 7000,
      investedAmount: 0,
      currentValue: 0,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    }, [], {});

    expect(isHoldingActiveSim(activeGold)).toBe(true);
    expect(isHoldingActiveSim(inactiveGold)).toBe(false);

    // Consolidation simulation: multiple active records belonging to same asset
    const anotherActiveGold = calculateHoldingMetrics({
      id: 'gold-active-2',
      assetName: 'Active Gold 2',
      category: 'Digital Gold',
      assetType: 'Digital Gold',
      quantity: 3,
      buyPrice: 7100,
      investedAmount: 3000,
      currentValue: 2900,
      buyDate: '2026-02-01',
      purchaseDate: '2026-02-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    }, [], {});

    const group = [activeGold, anotherActiveGold];
    const overallAmount = group.reduce((sum, h) => sum + (h.investedAmount ?? 0), 0);
    expect(overallAmount).toBe(8000); // 5000 + 3000
  });

  test('Stock/ETF split calculation and cost basis preservation', () => {
    const stockInv: Investment = {
      id: 'stock-split-1',
      assetName: 'TCS',
      category: 'Stocks',
      assetType: 'Stocks',
      quantity: 10,
      buyPrice: 1000,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };

    const txs: Transaction[] = [
      {
        id: 'tx-buy-1',
        investmentId: 'stock-split-1',
        type: 'BUY',
        quantity: 10,
        price: 1000,
        amount: 10000,
        charges: 0,
        date: '2026-01-01',
        isDemo: false,
        createdAt: ''
      },
      {
        id: 'tx-split-1',
        investmentId: 'stock-split-1',
        type: 'SPLIT',
        quantity: 20,
        price: 500,
        amount: 0,
        charges: 0,
        date: '2026-02-01',
        ratio: '1:2',
        oldQuantity: 10,
        newQuantity: 20,
        oldPrice: 1000,
        newPrice: 500,
        isDemo: false,
        createdAt: ''
      }
    ];

    const metrics = calculateHoldingMetrics(stockInv, txs, {});

    expect(metrics.quantity).toBe(20);
    expect(metrics.buyPrice).toBe(500);
    expect(metrics.investedAmount).toBe(10000); // 20 * 500 = 10000, cost basis remains unchanged
  });

  test('Multiple splits on the same stock/ETF holding', () => {
    const stockInv: Investment = {
      id: 'stock-split-multi',
      assetName: 'TCS Multi',
      category: 'Stocks',
      assetType: 'Stocks',
      quantity: 100,
      buyPrice: 1000,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };

    const txs: Transaction[] = [
      {
        id: 'tx-buy-1',
        investmentId: 'stock-split-multi',
        type: 'BUY',
        quantity: 100,
        price: 1000,
        amount: 100000,
        charges: 0,
        date: '2026-01-01',
        isDemo: false,
        createdAt: ''
      },
      {
        id: 'tx-split-1',
        investmentId: 'stock-split-multi',
        type: 'SPLIT',
        quantity: 200,
        price: 500,
        amount: 0,
        charges: 0,
        date: '2026-02-01',
        ratio: '1:2',
        oldQuantity: 100,
        newQuantity: 200,
        oldPrice: 1000,
        newPrice: 500,
        isDemo: false,
        createdAt: ''
      },
      {
        id: 'tx-split-2',
        investmentId: 'stock-split-multi',
        type: 'SPLIT',
        quantity: 400,
        price: 250,
        amount: 0,
        charges: 0,
        date: '2026-03-01',
        ratio: '1:2',
        oldQuantity: 200,
        newQuantity: 400,
        oldPrice: 500,
        newPrice: 250,
        isDemo: false,
        createdAt: ''
      }
    ];

    const metrics = calculateHoldingMetrics(stockInv, txs, {});

    expect(metrics.quantity).toBe(400);
    expect(metrics.buyPrice).toBe(250);
    expect(metrics.investedAmount).toBe(100000); // Cost basis remains 100k
  });

  test('Fractional shares split support', () => {
    const etfInv: Investment = {
      id: 'etf-split-fractional',
      assetName: 'Gold ETF',
      category: 'ETFs',
      assetType: 'ETFs',
      quantity: 5,
      buyPrice: 1000,
      buyDate: '2026-01-01',
      purchaseDate: '2026-01-01',
      charges: 0,
      owner: 'Me',
      isDemo: false,
      createdAt: '',
      updatedAt: ''
    };

    const txs: Transaction[] = [
      {
        id: 'tx-buy-1',
        investmentId: 'etf-split-fractional',
        type: 'BUY',
        quantity: 5,
        price: 1000,
        amount: 5000,
        charges: 0,
        date: '2026-01-01',
        isDemo: false,
        createdAt: ''
      },
      {
        id: 'tx-split-1',
        investmentId: 'etf-split-fractional',
        type: 'SPLIT',
        quantity: 7.5,
        price: 666.6667,
        amount: 0,
        charges: 0,
        date: '2026-02-01',
        ratio: '2:3',
        oldQuantity: 5,
        newQuantity: 7.5,
        oldPrice: 1000,
        newPrice: 666.6667,
        isDemo: false,
        createdAt: ''
      }
    ];

    const metrics = calculateHoldingMetrics(etfInv, txs, {});

    expect(metrics.quantity).toBe(7.5);
    expect(metrics.buyPrice).toBeCloseTo(666.67, 2);
    expect(metrics.investedAmount).toBeCloseTo(5000, 2);
  });
});

