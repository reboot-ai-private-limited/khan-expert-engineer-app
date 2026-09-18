import { api } from '@/api/client';
import type { EngineerSkillEntry, SkillGroup } from '@/types/skill';

export const skillsApi = {
  /** GET /api/skills/dropdown — the master list, grouped by category. */
  async getCatalog(): Promise<SkillGroup[]> {
    const { data } = await api.get<{ success: boolean; grouped: SkillGroup[] }>('/skills/dropdown');
    if (!data?.success) throw new Error('Could not load the skill list.');
    return data.grouped;
  },

  /** GET /api/engineer-auth/skills — the engineer's own skill entries. */
  async getMine(): Promise<EngineerSkillEntry[]> {
    const { data } = await api.get<{ success: boolean; skills: EngineerSkillEntry[] }>('/engineer-auth/skills');
    if (!data?.success) throw new Error('Could not load your skills.');
    return data.skills;
  },

  /**
   * POST /api/engineer-auth/skills
   *
   * Never applies immediately — lands as `pending` until an administrator
   * decides. `certificateUrl` is required only when the skill itself
   * demands certification; the caller is expected to have checked that
   * against the catalog before calling.
   */
  async request(skillId: string, certificateUrl?: string): Promise<EngineerSkillEntry[]> {
    const { data } = await api.post<{ success: boolean; message: string; skills: EngineerSkillEntry[] }>(
      '/engineer-auth/skills',
      { skillId, certificateUrl }
    );
    if (!data?.success) throw new Error(data?.message || 'Could not request that skill.');
    return data.skills;
  },

  /**
   * POST /api/engineer-auth/skill-certificate
   *
   * Uploads the certificate photo and hands back its URL — call this
   * first, then pass the result into `request()` as `certificateUrl`.
   */
  async uploadCertificate(imageBase64: string): Promise<string> {
    const { data } = await api.post<{ success: boolean; message?: string; url: string }>(
      '/engineer-auth/skill-certificate',
      { imageBase64 },
      { timeout: 60000 }
    );
    if (!data?.success || !data.url) throw new Error(data?.message || 'Could not upload the certificate.');
    return data.url;
  },

  /**
   * DELETE /api/engineer-auth/skills/:skillId
   *
   * A pending request is withdrawn outright. An approved skill is instead
   * flagged for admin review — removal is a request too, so the entry
   * stays in the list marked "removal pending" until decided.
   */
  async withdraw(skillId: string): Promise<EngineerSkillEntry[]> {
    const { data } = await api.delete<{ success: boolean; message: string; skills: EngineerSkillEntry[] }>(
      `/engineer-auth/skills/${skillId}`
    );
    if (!data?.success) throw new Error(data?.message || 'Could not withdraw that request.');
    return data.skills;
  },
};
