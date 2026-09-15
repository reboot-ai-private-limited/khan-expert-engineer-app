import { api } from '@/api/client';
import type { IdCard } from '@/types/idCard';

export const idCardApi = {
  /** GET /api/engineer-auth/id-card/:callId — issues or reuses the card for this job. */
  async getForCall(callId: string): Promise<IdCard> {
    const { data } = await api.get<{ success: boolean; message?: string; card: IdCard }>(
      `/engineer-auth/id-card/${callId}`
    );
    if (!data?.success) throw new Error(data?.message || 'No ID card available for this job.');
    return data.card;
  },

  /** GET /api/engineer-auth/id-cards — every currently valid card, for the profile tab's cards list. */
  async listMine(): Promise<IdCard[]> {
    const { data } = await api.get<{ success: boolean; cards: IdCard[] }>('/engineer-auth/id-cards');
    if (!data?.success) throw new Error('Could not load your ID cards.');
    return data.cards;
  },

  /** POST /api/engineer-auth/id-photo */
  async uploadIdPhoto(imageBase64: string): Promise<string> {
    const { data } = await api.post<{ success: boolean; message?: string; url: string }>(
      '/engineer-auth/id-photo',
      { imageBase64 },
      { timeout: 60000 }
    );
    if (!data?.success) throw new Error(data?.message || 'Could not upload your ID photo.');
    return data.url;
  },

  /** GET /api/engineer-auth/id-photo */
  async getMyIdPhoto(): Promise<string | null> {
    try {
      const { data } = await api.get<{ success: boolean; url: string }>('/engineer-auth/id-photo');
      return data?.success ? data.url : null;
    } catch {
      return null;
    }
  },
};
