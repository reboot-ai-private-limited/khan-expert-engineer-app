import { api } from '@/api/client';
import type { KycImageField, KycSummary } from '@/types/kyc';

export const kycApi = {
  /** GET /api/engineer-auth/kyc */
  async getMine(): Promise<KycSummary> {
    const { data } = await api.get<{ success: boolean; kyc: KycSummary }>('/engineer-auth/kyc');
    if (!data?.success) throw new Error('Could not load your documents.');
    return data.kyc;
  },

  /**
   * POST /api/engineer-auth/kyc/aadhaar
   *
   * Sent as base64 JSON, same reasoning as service photo upload — simpler
   * from React Native than multipart, and this is private storage from the
   * first byte (the controller uploads under Cloudinary's `authenticated`
   * delivery type), never the public services folder.
   */
  async uploadAadhaar(payload: {
    number: string;
    nameOnDocument?: string;
    frontImageBase64: string;
    backImageBase64: string;
  }): Promise<KycSummary> {
    const { data } = await api.post<{ success: boolean; message: string; kyc: KycSummary }>(
      '/engineer-auth/kyc/aadhaar',
      payload,
      { timeout: 60000 }
    );
    if (!data?.success) throw new Error(data?.message || 'Could not upload your Aadhaar.');
    return data.kyc;
  },

  /** POST /api/engineer-auth/kyc/pan */
  async uploadPan(payload: { number: string; nameOnDocument?: string; imageBase64: string }): Promise<KycSummary> {
    const { data } = await api.post<{ success: boolean; message: string; kyc: KycSummary }>(
      '/engineer-auth/kyc/pan',
      payload,
      { timeout: 60000 }
    );
    if (!data?.success) throw new Error(data?.message || 'Could not upload your PAN.');
    return data.kyc;
  },

  /** GET /api/engineer-auth/kyc/image/:field — a short-lived signed URL for one of your own documents. */
  async getImageUrl(field: KycImageField): Promise<string> {
    const { data } = await api.get<{ success: boolean; url: string }>(`/engineer-auth/kyc/image/${field}`);
    if (!data?.success) throw new Error('Could not load that image.');
    return data.url;
  },
};
