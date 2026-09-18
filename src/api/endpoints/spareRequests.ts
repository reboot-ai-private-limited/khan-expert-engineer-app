import { api } from '@/api/client';
import type { EngineerCall } from '@/types/call';
import type { SpareRequest, SpareRequestUrgency } from '@/types/spareRequest';

export interface ServiceItemOption {
  _id: string;
  name: string;
  currentStock?: number;
}

export const spareRequestsApi = {
  /** GET /api/service-items/dropdown?search= — same picker the admin billing form uses. */
  async searchItems(query: string): Promise<ServiceItemOption[]> {
    if (!query.trim()) return [];
    const { data } = await api.get<{ success: boolean; serviceItems: ServiceItemOption[] }>('/service-items/dropdown', {
      params: { search: query },
    });
    return data?.serviceItems ?? [];
  },

  /** POST /api/engineer-calls/:id/spare-requests */
  async raise(
    callId: string,
    payload: {
      itemId?: string;
      itemName: string;
      isFreeText?: boolean;
      quantity: number;
      urgency: SpareRequestUrgency;
      reason: string;
      partNumber?: string;
      customerWaiting?: boolean;
    }
  ): Promise<{ request: SpareRequest; call: EngineerCall }> {
    const { data } = await api.post<{ success: boolean; message?: string; request: SpareRequest; call: EngineerCall }>(
      `/engineer-calls/${callId}/spare-requests`,
      payload
    );
    if (!data?.success || !data.request) {
      throw new Error(data?.message || 'Could not raise the spare request.');
    }
    return { request: data.request, call: data.call };
  },

  /** GET /api/engineer-calls/spare-requests — every open/closed request across this engineer's jobs. */
  async getMine(): Promise<SpareRequest[]> {
    const { data } = await api.get<{ success: boolean; requests: SpareRequest[] }>('/engineer-calls/spare-requests');
    return data?.requests ?? [];
  },

  /** POST /api/engineer-calls/spare-requests/:requestId/confirm-receipt */
  async confirmReceipt(requestId: string, receivedQty?: number): Promise<{ request: SpareRequest; call: EngineerCall }> {
    const { data } = await api.post<{ success: boolean; message?: string; request: SpareRequest; call: EngineerCall }>(
      `/engineer-calls/spare-requests/${requestId}/confirm-receipt`,
      receivedQty !== undefined ? { receivedQty } : {}
    );
    if (!data?.success || !data.request) {
      throw new Error(data?.message || 'Could not confirm receipt.');
    }
    return { request: data.request, call: data.call };
  },
};
