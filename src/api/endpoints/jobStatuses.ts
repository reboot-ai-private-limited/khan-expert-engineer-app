import { api } from '@/api/client';

export interface JobStatusOption {
  _id: string;
  name: string;
  color?: string;
}

/** Statuses that only an administrator may put a ticket into. */
const isAdminOnly = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('closed') || n.includes('cancel');
};

export const jobStatusesApi = {
  /**
   * GET /api/job-statuses/dropdown?category=sub
   *
   * Open to any authenticated user. Filters out admin-only outcomes
   * (closed / cancelled) — the engineer's equivalent is a refusal reason,
   * not picking a status that implies the ticket closed.
   */
  async getSubStatusOptions(): Promise<JobStatusOption[]> {
    const { data } = await api.get<{ success: boolean; jobStatuses: JobStatusOption[] }>(
      '/job-statuses/dropdown',
      { params: { category: 'sub' } }
    );

    const list = data?.jobStatuses ?? [];
    return list.filter((s) => !isAdminOnly(s.name));
  },
};
