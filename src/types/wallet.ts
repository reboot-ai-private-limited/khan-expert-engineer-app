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

/** `rejected`: the office turned down a settlement you sent — it never moved your balance. */
export type WalletEntryStatus = 'pending' | 'confirmed' | 'reversed' | 'rejected';

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
  /** Why the office rejected this settlement. */
  rejectionNote?: string;
  createdBy: string;
  createdAt: string;
}

/**
 * What an engineer is asking the office for, before any money has moved.
 * Mirrors WalletRequestCategory in backend/src/models/walletRequestModel.ts.
 */
export type WalletRequestCategory =
  | 'advance'
  | 'lunch'
  | 'transportation'
  | 'salary'
  | 'call_incentive'
  | 'expense_advance'
  | 'expense_claim';

export const WALLET_REQUEST_CATEGORIES: WalletRequestCategory[] = [
  'expense_advance',
  'expense_claim',
  'advance',
  'lunch',
  'transportation',
  'salary',
  'call_incentive',
];

/**
 * What Request money offers. Lunch and Transportation are gone: an expense
 * claim covers money already spent, with receipts and a per-expense review.
 * They stay in the type and labels above so old requests still display.
 */
export const REQUESTABLE_CATEGORIES: WalletRequestCategory[] = [
  'expense_advance',
  'expense_claim',
  'advance',
  'salary',
  'call_incentive',
];

/** Settled through expenses rather than a single approval. */
export const isExpenseSettled = (category: WalletRequestCategory): boolean =>
  category === 'expense_advance' || category === 'expense_claim';

export const WALLET_REQUEST_CATEGORY_LABEL: Record<WalletRequestCategory, string> = {
  advance: 'Advance',
  lunch: 'Lunch',
  transportation: 'Transportation',
  salary: 'Salary',
  call_incentive: 'Call Incentive',
  expense_advance: 'Expense Advance',
  expense_claim: 'Expense Claim',
};

export type WalletRequestStatus = 'pending' | 'approved' | 'declined';

/**
 * Where an approved expense advance is. Unset on every other request.
 * Mirrors AdvanceSettlementStatus in backend/src/models/walletRequestModel.ts.
 */
export type AdvanceSettlementStatus = 'open' | 'submitted' | 'settled';

export const ADVANCE_STATUS_LABEL: Record<AdvanceSettlementStatus, string> = {
  open: 'Add expenses',
  submitted: 'With the office',
  settled: 'Settled',
};

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
  // Expense advance only — see AdvanceSettlementStatus.
  settlementStatus?: AdvanceSettlementStatus;
  submittedAt?: string;
  sentBackNote?: string;
  approvedExpenseTotal?: number;
  /** approved − advance: positive, the office owes you; negative, you owe the office. */
  settlementDifference?: number;
  recoveryMode?: 'return' | 'deduct';
  settlementNote?: string;
  settledAt?: string;
}

/** Mirrors AdvanceExpenseType in backend/src/models/advanceExpenseModel.ts. */
export type AdvanceExpenseType = 'fuel' | 'bus_train' | 'auto_cab' | 'toll_parking' | 'food' | 'other';

export const ADVANCE_EXPENSE_TYPES: AdvanceExpenseType[] = [
  'fuel',
  'bus_train',
  'auto_cab',
  'toll_parking',
  'food',
  'other',
];

export const ADVANCE_EXPENSE_TYPE_LABEL: Record<AdvanceExpenseType, string> = {
  fuel: 'Fuel',
  bus_train: 'Bus / Train',
  auto_cab: 'Auto / Cab',
  toll_parking: 'Toll / Parking',
  food: 'Food / Lunch / Dinner',
  other: 'Other',
};

export type AdvanceExpenseStatus = 'pending' | 'approved' | 'rejected';

export interface AdvanceExpense {
  _id: string;
  requestId: string;
  type: AdvanceExpenseType;
  amount: number;
  spentOn: string;
  description: string;
  jobId?: string;
  callNumber?: string;
  /** A short-lived signed link, or null when no receipt was added. */
  receiptUrl: string | null;
  status: AdvanceExpenseStatus;
  approvedAmount?: number;
  reviewNote?: string;
  createdAt: string;
}

export interface AdvanceTotals {
  advance: number;
  claimed: number;
  approved: number;
  /** advance − claimed: what is not yet accounted for. Negative means overspent. */
  unaccounted: number;
  pendingReview: number;
  rejectedCount: number;
}

/** GET /wallet/advances — one row per expense advance; totals are null until approved. */
export interface AdvanceSummary {
  request: WalletRequest;
  totals: AdvanceTotals | null;
}

/** GET /wallet/advances/:id */
export interface AdvanceDetail {
  request: WalletRequest;
  expenses: AdvanceExpense[];
  totals: AdvanceTotals;
}

export interface AdvanceExpenseInput {
  type?: AdvanceExpenseType;
  amount?: number;
  spentOn?: string;
  description?: string;
  /** Empty string clears the job link. */
  jobId?: string;
  /** data: URI of a new receipt photo. */
  receiptBase64?: string;
  removeReceipt?: boolean;
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
