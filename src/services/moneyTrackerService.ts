import type { MoneyRecord, MoneyRecordStatus, MoneyRecordOverdueStatus } from '../types';

export const getRemainingAmount = (record: Pick<MoneyRecord, 'amount' | 'amountPaid'>): number => {
  return Math.max(0, record.amount - record.amountPaid);
};

export const getStatus = (record: Pick<MoneyRecord, 'amount' | 'amountPaid'>): MoneyRecordStatus => {
  const remaining = record.amount - record.amountPaid;
  if (remaining <= 0) return 'Fully Paid';
  if (record.amountPaid > 0 && record.amountPaid < record.amount) return 'Partially Paid';
  return 'Pending';
};

export const getOverdueStatus = (record: MoneyRecord, referenceDate: Date = new Date()): MoneyRecordOverdueStatus => {
  const remaining = record.amount - record.amountPaid;
  if (remaining <= 0) return 'On Track';
  if (!record.dueDate) return 'On Track';

  const due = new Date(record.dueDate);
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - ref.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'Overdue';
  } else if (diffDays <= 3) {
    return 'Due Soon';
  }
  return 'On Track';
};
