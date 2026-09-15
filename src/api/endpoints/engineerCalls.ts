import { api } from '@/api/client';
import type {
  EngineerCall,
  EngineerCallListResponse,
  ServiceImage,
  StepResult,
  UpdateEngineerCallPayload,
  UpdateEngineerCallResponse,
  UploadServiceImagesResponse,
} from '@/types/call';

interface CallResponse {
  success: boolean;
  message: string;
  call: EngineerCall;
}

/**
 * A page large enough to cover a single engineer's realistic open workload
 * in one request. Chosen deliberately over real pagination:
 *
 * The endpoint's `search` query param has a known bug — it overwrites the
 * closed-ticket exclusion instead of combining with it (blocker B2 in
 * docs/plan.html), so typing in a search box would bring closed tickets
 * back into view. Fetching the full list once and filtering on-device
 * sidesteps that entirely until the server side is fixed.
 */
const PAGE_LIMIT = 200;

export const engineerCallsApi = {
  /**
   * GET /api/engineer-calls
   *
   * Scoped server-side to the signed-in engineer by name (not yet by a
   * stable engineerId — blocker B1), and already excludes closed/cancelled
   * tickets. `summary` reflects the engineer's *entire* open workload, not
   * just this page, so it stays correct even though the list itself is
   * fetched in one page.
   */
  async getAssignedCalls(): Promise<EngineerCallListResponse> {
    const { data } = await api.get<EngineerCallListResponse>('/engineer-calls', {
      params: { page: 1, limit: PAGE_LIMIT },
    });

    if (!data?.success) {
      throw new Error('The server returned an unexpected response.');
    }

    return data;
  },

  /**
   * PUT /api/engineer-calls/:id
   *
   * The server enforces the rules that matter — an engineer cannot close or
   * cancel a job this way (blocked server-side if subStatus implies it
   * without a jobStatus change), and a completed ticket rejects the write
   * entirely. This call only shapes the payload; it does not re-validate.
   */
  async updateCall(id: string, payload: UpdateEngineerCallPayload): Promise<UpdateEngineerCallResponse> {
    const { data } = await api.put<UpdateEngineerCallResponse>(`/engineer-calls/${id}`, payload);

    if (!data?.success || !data.call) {
      throw new Error(data?.message || 'The server returned an unexpected response.');
    }

    return data;
  },

  /**
   * POST /api/engineer-calls/:id/upload-image
   *
   * Sent as JSON with base64 data URIs rather than multipart form-data —
   * the controller accepts either, and base64 is the far simpler path from
   * React Native (no FormData/Blob shimming for a file:// URI). Returns the
   * ticket's full, merged photo array, not just what was just added.
   */
  async uploadServiceImages(id: string, imagesBase64: string[]): Promise<ServiceImage[]> {
    const { data } = await api.post<UploadServiceImagesResponse>(
      `/engineer-calls/${id}/upload-image`,
      { imageBase64: imagesBase64 },
      { timeout: 60000 } // base64 photo uploads are far larger than a normal request
    );

    if (!data?.success) {
      throw new Error(data?.message || 'The photo upload did not complete.');
    }

    return data.service_images;
  },

  /**
   * POST /api/engineer-calls/:id/check-in
   *
   * Job-start gate: selfie (base64 data URI, same shape as photo uploads)
   * plus a GPS fix. Required before the step checklist unlocks.
   */
  async checkIn(
    id: string,
    payload: { selfieBase64: string; latitude: number; longitude: number; accuracy?: number }
  ): Promise<EngineerCall> {
    const { data } = await api.post<CallResponse>(`/engineer-calls/${id}/check-in`, payload, { timeout: 60000 });
    if (!data?.success || !data.call) {
      throw new Error(data?.message || 'Check-in did not complete.');
    }
    return data.call;
  },

  /**
   * POST /api/engineer-calls/:id/check-out
   *
   * Job-completion gate: GPS only, no photo. Required before the job can be
   * marked complete.
   */
  async checkOut(id: string, payload: { latitude: number; longitude: number; accuracy?: number }): Promise<EngineerCall> {
    const { data } = await api.post<CallResponse>(`/engineer-calls/${id}/check-out`, payload);
    if (!data?.success || !data.call) {
      throw new Error(data?.message || 'Check-out did not complete.');
    }
    return data.call;
  },

  /** PUT /api/engineer-calls/:id/steps */
  async updateSteps(id: string, steps: StepResult[]): Promise<EngineerCall> {
    const { data } = await api.put<CallResponse>(`/engineer-calls/${id}/steps`, { steps });
    if (!data?.success || !data.call) {
      throw new Error(data?.message || 'Could not save the checklist.');
    }
    return data.call;
  },

  /** POST /api/engineer-calls/:id/amount-revision */
  async requestAmountRevision(id: string, requestedAmount: number, reason: string): Promise<EngineerCall> {
    const { data } = await api.post<CallResponse>(`/engineer-calls/${id}/amount-revision`, {
      requestedAmount,
      reason,
    });
    if (!data?.success || !data.call) {
      throw new Error(data?.message || 'Could not submit the amount revision.');
    }
    return data.call;
  },
};
