import { api } from '@/api/client';
import type { ServiceStep } from '@/types/call';

interface ServiceTypeDropdownItem {
  _id: string;
  name: string;
  steps?: ServiceStep[];
}

export const serviceTypesApi = {
  /**
   * GET /api/service-types/dropdown?search=<exact name>
   *
   * Open to any authenticated user. Used to look up the job-execution step
   * checklist for the call's service type by name (calls don't carry a
   * service type id, only the display name). Returns undefined/empty steps
   * for a service type with no checklist configured — callers fall back to
   * the free-text remarks field in that case.
   */
  async getStepsForServiceType(serviceTypeName: string): Promise<ServiceStep[]> {
    if (!serviceTypeName.trim()) return [];
    const { data } = await api.get<{ success: boolean; serviceTypes: ServiceTypeDropdownItem[] }>(
      '/service-types/dropdown',
      { params: { search: serviceTypeName } }
    );
    const match = (data?.serviceTypes ?? []).find(
      (s) => s.name.trim().toLowerCase() === serviceTypeName.trim().toLowerCase()
    );
    return match?.steps?.length ? [...match.steps].sort((a, b) => a.order - b.order) : [];
  },
};
