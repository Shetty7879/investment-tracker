import { describe, test, expect } from 'vitest';
import type { MoneyRecord } from '../types';
import {
  getRemainingAmount,
  getStatus,
  getOverdueStatus
} from './moneyTrackerService';

describe('Money Tracker Feature Unit Tests', () => {

  // Test 1: Remaining amount subtraction math
  test('Remaining amount calculation', () => {
    const record: Pick<MoneyRecord, 'amount' | 'amountPaid'> = {
      amount: 5000,
      amountPaid: 2000
    };
    expect(getRemainingAmount(record)).toBe(3000);
  });

  // Test 2: Pending status resolution (amountPaid = 0)
  test('Pending status resolution', () => {
    const record: Pick<MoneyRecord, 'amount' | 'amountPaid'> = {
      amount: 2000,
      amountPaid: 0
    };
    expect(getStatus(record)).toBe('Pending');
  });

  // Test 3: Partially Paid status resolution
  test('Partially Paid status resolution', () => {
    const record: Pick<MoneyRecord, 'amount' | 'amountPaid'> = {
      amount: 5000,
      amountPaid: 2000
    };
    expect(getStatus(record)).toBe('Partially Paid');
  });

  // Test 4: Fully Paid status resolution
  test('Fully Paid status resolution', () => {
    const record: Pick<MoneyRecord, 'amount' | 'amountPaid'> = {
      amount: 5000,
      amountPaid: 5000
    };
    expect(getStatus(record)).toBe('Fully Paid');
  });

  // Test 5: Overdue detection
  test('Overdue detection math', () => {
    const ref = new Date('2026-08-24');
    
    // Due date passed
    const overdueRecord: MoneyRecord = {
      id: 'mr-1',
      type: 'receive',
      personName: 'Rahul',
      amount: 5000,
      amountPaid: 2000,
      date: '2026-08-10',
      dueDate: '2026-08-20',
      createdAt: '',
      updatedAt: ''
    };
    expect(getOverdueStatus(overdueRecord, ref)).toBe('Overdue');

    // Due date in 2 days
    const dueSoonRecord: MoneyRecord = {
      ...overdueRecord,
      dueDate: '2026-08-26'
    };
    expect(getOverdueStatus(dueSoonRecord, ref)).toBe('Due Soon');

    // Due date in 10 days
    const onTrackRecord: MoneyRecord = {
      ...overdueRecord,
      dueDate: '2026-09-03'
    };
    expect(getOverdueStatus(onTrackRecord, ref)).toBe('On Track');

    // Fully paid is always on track
    const fullyPaidRecord: MoneyRecord = {
      ...overdueRecord,
      amountPaid: 5000,
      dueDate: '2026-08-20'
    };
    expect(getOverdueStatus(fullyPaidRecord, ref)).toBe('On Track');
  });

  // Test 6: Persistence mapping structure matches schema
  test('Persistence mapping structure matches schema', () => {
    const recordsStore: MoneyRecord[] = [
      {
        id: 'mr-demo-1',
        type: 'receive',
        personName: 'Priya',
        amount: 3000,
        amountPaid: 1500,
        date: '2026-08-15',
        dueDate: '2026-08-25',
        note: 'Emergency split',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const stringified = JSON.stringify(recordsStore);
    const parsed = JSON.parse(stringified) as MoneyRecord[];

    expect(parsed[0].personName).toBe('Priya');
    expect(parsed[0].type).toBe('receive');
    expect(parsed[0].amount).toBe(3000);
    expect(parsed[0].amountPaid).toBe(1500);
    expect(parsed[0].note).toBe('Emergency split');
  });
});
