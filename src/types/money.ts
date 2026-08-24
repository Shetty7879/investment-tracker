export type MoneyRecordType = 'receive' | 'give';
export type MoneyRecordStatus = 'Pending' | 'Partially Paid' | 'Fully Paid';
export type MoneyRecordOverdueStatus = 'Overdue' | 'Due Soon' | 'On Track';

export interface MoneyRecord {
  id: string;
  type: MoneyRecordType;
  personName: string;
  amount: number;             // Total principal amount to receive or give
  amountPaid: number;         // Amount received (for receive) or paid (for give)
  date: string;               // Date Given (for receive) or Date Owed/Given (for give)
  dueDate?: string;           // Expected Return Date (for receive) or Due Date (for give)
  note?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}
