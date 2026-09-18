import type { EngineerCall } from '@/types/call';

/**
 * The unit's identity fields, and whether the office owns each one.
 *
 * Mirrors backend/src/utils/identityLock.ts exactly. The server is the
 * enforcement point — it refuses a locked write with a 400 — and this only
 * stops the app offering an edit that would be refused.
 */
export const IDENTITY_FIELDS = ['modelNumber', 'serialNumber', 'iduser', 'oduser'] as const;

export type IdentityField = (typeof IDENTITY_FIELDS)[number];

export const IDENTITY_LABELS: Record<IdentityField, string> = {
  modelNumber: 'Model number',
  serialNumber: 'Device serial number',
  iduser: 'IDU serial no (indoor)',
  oduser: 'ODU serial no (outdoor)',
};

export const IDENTITY_PLACEHOLDERS: Record<IdentityField, string> = {
  modelNumber: 'e.g. GLWMT70GLGAM',
  serialNumber: 'From the nameplate',
  iduser: 'e.g. IDU-998877',
  oduser: 'e.g. ODU-112233',
};

/**
 * `officeSetIdentity` is absent on every ticket created before the field
 * existed. Those values came from the office, so the safe reading for legacy
 * data is: anything already filled in belongs to the office.
 */
export const isOfficeSet = (call: EngineerCall, field: IdentityField): boolean => {
  const value = String((call as unknown as Record<string, unknown>)[field] ?? '').trim();
  if (!value) return false;

  if (!call.officeSetIdentity) return true;
  return call.officeSetIdentity.includes(field);
};
