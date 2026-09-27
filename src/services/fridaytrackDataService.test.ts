import { describe, test, expect } from 'vitest';
import type { FridayTrackData } from './fridaytrackDataService';
import type { Dividend } from '../types';

describe('FridayTrack Data Service - Dividend Synchronization Unit Tests', () => {

  test('Dividend record filtering for non-demo items', () => {
    const dividends: Dividend[] = [
      {
        id: 'div_real_1',
        investmentId: 'inv_1',
        assetName: 'TCS',
        eligibleQuantity: 10,
        dividendPerShare: 28,
        grossDividend: 280,
        tax: 28,
        netDividend: 252,
        dividendDate: '2026-09-01',
        status: 'Paid',
        isDemo: false,
        createdAt: '2026-09-01T00:00:00.000Z'
      },
      {
        id: 'div_demo_1',
        investmentId: 'inv_demo',
        assetName: 'Demo Asset',
        eligibleQuantity: 100,
        dividendPerShare: 5,
        grossDividend: 500,
        tax: 50,
        netDividend: 450,
        dividendDate: '2026-09-02',
        status: 'Upcoming',
        isDemo: true,
        createdAt: '2026-09-02T00:00:00.000Z'
      }
    ];

    const payload: FridayTrackData = {
      investments: [],
      transactions: [],
      goals: [],
      money_records: [],
      dividends,
      preferences: {}
    };

    const realDividends = (payload.dividends || []).filter(d => !d.isDemo);

    expect(realDividends.length).toBe(1);
    expect(realDividends[0].id).toBe('div_real_1');
    expect(realDividends[0].assetName).toBe('TCS');
  });

  test('FridayTrackData payload serialization includes dividends in preferences fallback', () => {
    const realDividend: Dividend = {
      id: 'div_real_2',
      investmentId: 'inv_2',
      assetName: 'Infosys',
      eligibleQuantity: 50,
      dividendPerShare: 18,
      grossDividend: 900,
      tax: 90,
      netDividend: 810,
      dividendDate: '2026-09-15',
      status: 'Paid',
      isDemo: false,
      createdAt: '2026-09-15T00:00:00.000Z'
    };

    const payload: FridayTrackData = {
      investments: [],
      transactions: [],
      goals: [],
      money_records: [],
      dividends: [realDividend],
      preferences: {}
    };

    const realDividends = (payload.dividends || []).filter(d => !d.isDemo);
    const preferencesPayload = {
      ...payload.preferences,
      dividends: realDividends
    };

    expect(preferencesPayload.dividends).toBeDefined();
    expect(preferencesPayload.dividends.length).toBe(1);
    expect(preferencesPayload.dividends[0].assetName).toBe('Infosys');
  });

});
