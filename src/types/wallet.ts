export type WalletEntryType =
  | 'cash_collected'
  | 'commission_earned'
  | 'online_collected'
  | 'settlement_paid_by_engineer'
  | 'settlement_paid_to_engineer'
  | 'advance_given'
  | 'part_reimbursed'
  | 'penalty'
  | 'bonus'
  | 'reversal'
  | 'adjustment';

export type WalletEntryStatus = 'pending' | 'confirmed' | 'reversed';

/**
 * What the money was for — set by the office when posting the entry.
 * Optional: entries posted before this existed, and job-driven entries,
 * carry none. Mirrors WalletRemark in backend/src/models/walletLedgerModel.ts.
 */
export type WalletRemark =
  | 'transportation'
  | 'lunch_dinner'
  | 'salary'
  | 'call_incentive'
  | 'advance_payment_request';

export const WALLET_REMARKS: WalletRemark[] = [
  'transportation',
  'lunch_dinner',
  'salary',
  'call_incentive',
  'advance_payment_request',
];

export const WALLET_REMARK_LABEL: Record<WalletRemark, string> = {
  transportation: 'Transportation',
  lunch_dinner: 'Lunch / Dinner',
  salary: 'Salary',
  call_incentive: 'Call Incentive',
  advance_payment_request: 'Advance Payment Request',
};

export interface WalletEntry {
  _id: string;
  engineerId: string;
  type: WalletEntryType;
  amount: number;
  balanceAfter: number;
  jobId?: string;
  callNumber?: string;
  paymentMode?: 'cash' | 'upi' | 'card' | 'bank_transfer';
  reference?: string;
  commissionAmount?: number;
  status: WalletEntryStatus;
  note?: string;
  remark?: WalletRemark;
  createdBy: string;
  createdAt: string;
}

/**
 * What an engineer is asking the office for, before any money has moved.
 * Mirrors WalletRequestCategory in backend/src/models/walletRequestModel.ts.
 */
export type WalletRequestCategory = 'advance' | 'lunch' | 'transportation' | 'salary' | 'call_incentive';

export const WALLET_REQUEST_CATEGORIES: WalletRequestCategory[] = [
  'advance',
  'lunch',
  'transportation',
  'salary',
  'call_incentive',
];

export const WALLET_REQUEST_CATEGORY_LABEL: Record<WalletRequestCategory, string> = {
  advance: 'Advance',
  lunch: 'Lunch',
  transportation: 'Transportation',
  salary: 'Salary',
  call_incentive: 'Call Incentive',
};

export type WalletRequestStatus = 'pending' | 'approved' | 'declined';

export interface WalletRequest {
  _id: string;
  engineerId: string;
  category: WalletRequestCategory;
  amount: number;
  reason: string;
  status: WalletRequestStatus;
  requestedBy: string;
  requestedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  decisionNote?: string;
}

export const WALLET_ENTRY_LABEL: Record<WalletEntryType, string> = {
  cash_collected: 'Cash collected from customer',
  commission_earned: 'Commission earned',
  online_collected: 'Online payment (to company)',
  settlement_paid_by_engineer: 'Settlement paid to office',
  settlement_paid_to_engineer: 'Payout from office',
  advance_given: 'Advance from office',
  part_reimbursed: 'Spare part reimbursed',
  penalty: 'Penalty',
  bonus: 'Bonus',
  reversal: 'Correction',
  adjustment: 'Manual adjustment',
};
