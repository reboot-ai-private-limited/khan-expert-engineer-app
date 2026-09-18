import { api } from '@/api/client';
import type { WalletEntry, WalletRemark } from '@/types/wallet';

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
};
