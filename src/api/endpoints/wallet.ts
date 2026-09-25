import { api } from '@/api/client';
import type {
  AdvanceDetail,
  AdvanceExpense,
  AdvanceExpenseInput,
  AdvanceSummary,
  WalletEntry,
  WalletRemark,
  WalletRequest,
  WalletRequestCategory,
} from '@/types/wallet';

export const walletApi = {
  /** GET /api/wallet/balance — the server derives this from the ledger; the app never computes it. */
  async getBalance(): Promise<{ balance: number; display: string }> {
    const { data } = await api.get<{ success: boolean; balance: number; display: string }>('/wallet/balance');
    if (!data?.success) throw new Error('Could not load your wallet balance.');
    return { balance: data.balance, display: data.display };
  },

  /** GET /api/wallet/transactions */
  async getTransactions(): Promise<WalletEntry[]> {
    const { data } = await api.get<{ success: boolean; entries: WalletEntry[] }>('/wallet/transactions');
    return data?.entries ?? [];
  },

  /**
   * GET /api/wallet/payment-qr — the static company UPI QR, cached-friendly
   * per spec 08. Returns a `upi://pay` URI the caller renders as a QR code
   * on-device; nothing routes through the engineer's own account.
   */
  async getPaymentQr(amount?: number, note?: string): Promise<{ upiId: string; upiUri: string }> {
    const { data } = await api.get<{ success: boolean; message?: string; upiId: string; upiUri: string }>('/wallet/payment-qr', {
      params: { amount, note },
    });
    if (!data?.success) throw new Error(data?.message || 'Could not load the company payment QR.');
    return { upiId: data.upiId, upiUri: data.upiUri };
  },

  /** POST /api/wallet/settle — balance moves only once the office confirms this. */
  async settle(
    amount: number,
    paymentMode: 'cash' | 'upi',
    reference?: string,
    remark?: WalletRemark,
    note?: string
  ): Promise<WalletEntry> {
    const { data } = await api.post<{ success: boolean; message?: string; entry: WalletEntry }>('/wallet/settle', {
      direction: 'engineer_to_company',
      amount,
      paymentMode,
      reference,
      remark,
      note,
    });
    if (!data?.success || !data.entry) throw new Error(data?.message || 'Could not submit the settlement.');
    return data.entry;
  },

  /** POST /api/wallet/payouts/:entryId/confirm-receipt — closes the loop on a company-initiated payout. */
  async confirmPayoutReceipt(entryId: string): Promise<WalletEntry> {
    const { data } = await api.post<{ success: boolean; message?: string; entry: WalletEntry }>(
      `/wallet/payouts/${entryId}/confirm-receipt`
    );
    if (!data?.success || !data.entry) throw new Error(data?.message || 'Could not confirm receipt.');
    return data.entry;
  },

  /**
   * POST /api/wallet/requests
   *
   * Ask the office to put money in the wallet — an advance, or a same-day
   * reimbursement for lunch or transportation. Nothing moves until the
   * office decides; see /wallet/requests for tracking the answer.
   */
  async requestPayment(category: WalletRequestCategory, amount: number, reason: string): Promise<WalletRequest> {
    const { data } = await api.post<{ success: boolean; message?: string; request: WalletRequest }>(
      '/wallet/requests',
      { category, amount, reason }
    );
    if (!data?.success || !data.request) throw new Error(data?.message || 'Could not submit the request.');
    return data.request;
  },

  /** GET /api/wallet/requests — this engineer's own requests, newest first. */
  async getMyRequests(): Promise<WalletRequest[]> {
    const { data } = await api.get<{ success: boolean; requests: WalletRequest[] }>('/wallet/requests');
    return data?.requests ?? [];
  },

  // ─── Expense advances ─────────────────────────────────────────────────
  // An advance the engineer accounts for with expenses; the office reviews
  // them and settles the rest. See backend/src/utils/advanceExpenseService.ts.

  /** GET /api/wallet/advances — newest first. */
  async getAdvances(): Promise<AdvanceSummary[]> {
    const { data } = await api.get<{ success: boolean; advances: AdvanceSummary[] }>('/wallet/advances');
    return data?.advances ?? [];
  },

  /** GET /api/wallet/advances/:id — the advance, its expenses and running totals. */
  async getAdvance(requestId: string): Promise<AdvanceDetail> {
    const { data } = await api.get<{ success: boolean; message?: string } & AdvanceDetail>(
      `/wallet/advances/${requestId}`
    );
    if (!data?.success) throw new Error(data?.message || 'Could not load this advance.');
    return { request: data.request, expenses: data.expenses, totals: data.totals };
  },

  /** POST /api/wallet/advances/:id/expenses — only while the advance is open. */
  async addExpense(requestId: string, input: AdvanceExpenseInput): Promise<AdvanceExpense> {
    const { data } = await api.post<{ success: boolean; message?: string; expense: AdvanceExpense }>(
      `/wallet/advances/${requestId}/expenses`,
      input
    );
    if (!data?.success || !data.expense) throw new Error(data?.message || 'Could not add the expense.');
    return data.expense;
  },

  /** PUT /api/wallet/advances/:id/expenses/:expenseId — resets the office's verdict on it. */
  async updateExpense(requestId: string, expenseId: string, input: AdvanceExpenseInput): Promise<AdvanceExpense> {
    const { data } = await api.put<{ success: boolean; message?: string; expense: AdvanceExpense }>(
      `/wallet/advances/${requestId}/expenses/${expenseId}`,
      input
    );
    if (!data?.success || !data.expense) throw new Error(data?.message || 'Could not update the expense.');
    return data.expense;
  },

  /** DELETE /api/wallet/advances/:id/expenses/:expenseId */
  async deleteExpense(requestId: string, expenseId: string): Promise<void> {
    await api.delete(`/wallet/advances/${requestId}/expenses/${expenseId}`);
  },

  /** POST /api/wallet/advances/:id/submit — locks the expenses and sends them for review. */
  async submitAdvance(requestId: string): Promise<AdvanceDetail> {
    const { data } = await api.post<{ success: boolean; message?: string } & AdvanceDetail>(
      `/wallet/advances/${requestId}/submit`
    );
    if (!data?.success) throw new Error(data?.message || 'Could not submit the advance.');
    return { request: data.request, expenses: data.expenses, totals: data.totals };
  },
};
