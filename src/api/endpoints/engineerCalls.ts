import { api } from '@/api/client';
import type {
  EngineerCall,
  EngineerCallListResponse,
  ServiceImage,
  RideMode,
  RideVehicleType,
  ServiceImageCategory,
  StepResult,
  UpdateEngineerCallPayload,
  UpdateEngineerCallResponse,
  UploadServiceImagesResponse,
  WarrantyStatus,
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
   * Scoped server-side to the signed-in engineer by stable engineerId,
   * and returns live work only — closed and cancelled jobs never reach
   * the engineer at all. `summary` reflects the engineer's *entire* open workload, not
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
   * GET /api/engineer-calls?scope=closed
   *
   * The engineer's jobs the office has closed — shown as finished history,
   * next to the ones marked "job done". Read-only on the device.
   */
  async getClosedCalls(): Promise<EngineerCall[]> {
    const { data } = await api.get<EngineerCallListResponse>('/engineer-calls', {
      params: { page: 1, limit: PAGE_LIMIT, scope: 'closed' },
    });

    if (!data?.success) {
      throw new Error('The server returned an unexpected response.');
    }

    return data.calls;
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
   * POST /api/engineer-calls/:id/upload-image, with a category — nameplate,
   * product, bill, etc. `bill`/`warranty_card` route to private storage
   * server-side; nothing about that is decided on-device.
   */
  async uploadCategorizedImage(id: string, imageBase64: string, category: ServiceImageCategory): Promise<ServiceImage[]> {
    const { data } = await api.post<UploadServiceImagesResponse>(
      `/engineer-calls/${id}/upload-image`,
      { imageBase64: [imageBase64], category },
      { timeout: 60000 }
    );
    if (!data?.success) {
      throw new Error(data?.message || 'The photo upload did not complete.');
    }
    return data.service_images;
  },

  /**
   * PUT /api/engineer-calls/:id/product-details
   *
   * Corrects a product field read off the nameplate (or bill). The server
   * logs previous + new value — this call only sends what changed.
   */
  async updateProductDetails(
    id: string,
    fields: Record<string, string>,
    source: 'nameplate' | 'bill' | 'warranty_card' | 'customer_stated'
  ): Promise<EngineerCall> {
    const { data } = await api.put<CallResponse>(`/engineer-calls/${id}/product-details`, { fields, source });
    if (!data?.success || !data.call) {
      throw new Error(data?.message || 'Could not save the product details.');
    }
    return data.call;
  },

  /**
   * POST /api/engineer-calls/:id/warranty-check
   *
   * A bill is mandatory for an in-warranty claim, no exception — the
   * server computes the status from `hasBill` + the purchase date; without
   * a bill it is always `out_of_warranty`.
   */
  async submitWarrantyCheck(
    id: string,
    payload: {
      hasBill: boolean;
      dateOfPurchase?: string;
      billNumber?: string;
      billAmount?: number;
      dealerName?: string;
      disputed?: boolean;
      disputeReason?: string;
    }
  ): Promise<{ call: EngineerCall; warrantyStatus: WarrantyStatus }> {
    const { data } = await api.post<{ success: boolean; message?: string; call: EngineerCall; warrantyStatus: WarrantyStatus }>(
      `/engineer-calls/${id}/warranty-check`,
      payload
    );
    if (!data?.success || !data.call) {
      throw new Error(data?.message || 'Could not record the warranty check.');
    }
    return { call: data.call, warrantyStatus: data.warrantyStatus };
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
      throw new Error(data?.message || 'Starting work did not complete.');
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
      throw new Error(data?.message || 'Checkout did not complete.');
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

  /**
   * POST /api/engineer-calls/:id/ride
   *
   * The travel log for this job. Sends the proof photo as a base64 data
   * URI, the same shape check-in uses for its selfie. Re-posting replaces a
   * pending or declined log; the server freezes an approved one.
   */
  async recordRide(
    id: string,
    vehicleType: RideVehicleType,
    mode: RideMode,
    carNumber: string,
    photoBase64: string
  ): Promise<EngineerCall> {
    const { data } = await api.post<CallResponse>(`/engineer-calls/${id}/ride`, {
      vehicleType,
      mode,
      carNumber,
      photoBase64,
    });
    if (!data?.success || !data.call) {
      throw new Error(data?.message || 'Could not record the ride.');
    }
    return data.call;
  },

  /**
   * GET /api/engineer-calls/:id/job-sheet
   *
   * Renders the sheet to a PDF server-side and returns its URL. Regenerated
   * on each call so the document always matches the ticket.
   */
  async getJobSheet(id: string): Promise<string> {
    const { data } = await api.get<{ success: boolean; url: string; message?: string }>(
      `/engineer-calls/${id}/job-sheet`,
      { timeout: 120000 } // puppeteer render plus upload, on mobile data
    );
    if (!data?.success || !data.url) {
      throw new Error(data?.message || 'Could not build the job sheet.');
    }
    return data.url;
  },

  /**
   * POST /api/engineer-calls/:id/video
   *
   * Multipart, NOT base64. A clip is tens of megabytes: base64 would build a
   * ~1.33x string in the JS heap — the exact allocation that was getting the
   * app killed on photos — and blow past the server's 15MB JSON limit.
   * React Native streams a FormData file straight from its uri instead, so
   * the clip never enters the heap.
   */
  async uploadVideo(id: string, uri: string, caption?: string): Promise<EngineerCall> {
    const form = new FormData();
    form.append('video', {
      uri,
      name: `job-video-${Date.now()}.mp4`,
      type: 'video/mp4',
    } as unknown as Blob);
    if (caption) form.append('caption', caption);

    const { data } = await api.post<CallResponse>(`/engineer-calls/${id}/video`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // Video over mobile data is slow — well beyond the default timeout.
      timeout: 180000,
    });
    if (!data?.success || !data.call) {
      throw new Error(data?.message || 'Could not upload the video.');
    }
    return data.call;
  },

  /** DELETE /api/engineer-calls/:id/video/:publicId */
  async deleteVideo(id: string, publicId: string): Promise<EngineerCall> {
    const { data } = await api.delete<CallResponse>(
      `/engineer-calls/${id}/video/${encodeURIComponent(publicId)}`
    );
    if (!data?.success || !data.call) {
      throw new Error(data?.message || 'Could not remove the video.');
    }
    return data.call;
  },

  /**
   * POST /api/engineer-calls/:id/self-purchase
   *
   * A part the engineer bought themselves. The shop bill photo is required —
   * it is the only evidence behind the reimbursement.
   */
  async recordSelfPurchase(
    id: string,
    payload: {
      partName: string;
      quantity: number;
      amountPaid: number;
      customerPrice?: number;
      shopName?: string;
      spareRequestId?: string;
      billPhotoBase64: string;
    }
  ): Promise<EngineerCall> {
    const { data } = await api.post<CallResponse>(`/engineer-calls/${id}/self-purchase`, payload);
    if (!data?.success || !data.call) {
      throw new Error(data?.message || 'Could not record the purchase.');
    }
    return data.call;
  },

  /** POST /api/engineer-calls/:id/cancellation-request */
  async requestCancellation(id: string, reason: string): Promise<EngineerCall> {
    const { data } = await api.post<CallResponse>(`/engineer-calls/${id}/cancellation-request`, { reason });
    if (!data?.success || !data.call) {
      throw new Error(data?.message || 'Could not send the cancellation request.');
    }
    return data.call;
  },

  /** POST /api/engineer-calls/:id/customer-signature */
  async submitCustomerSignature(id: string, pathData: string, width: number, height: number): Promise<EngineerCall> {
    const { data } = await api.post<CallResponse>(`/engineer-calls/${id}/customer-signature`, { pathData, width, height });
    if (!data?.success || !data.call) {
      throw new Error(data?.message || 'Could not save the signature.');
    }
    return data.call;
  },

  /** POST /api/engineer-calls/:id/payment-collection */
  async submitPaymentCollection(
    id: string,
    payload: { cashAmount: number; onlineAmount: number; onlineReference?: string; screenshotBase64?: string }
  ): Promise<EngineerCall> {
    const { data } = await api.post<CallResponse>(`/engineer-calls/${id}/payment-collection`, payload, { timeout: 60000 });
    if (!data?.success || !data.call) {
      throw new Error(data?.message || 'Could not record the payment.');
    }
    return data.call;
  },
};
