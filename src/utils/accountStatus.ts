import type { EngineerProfile } from '@/types/auth';

/**
 * Whether this engineer is fully onboarded and belongs in the working app
 * (job list, profile, etc.) rather than the application-status screen.
 *
 * A profile with no `accountStatus` at all — cached by an app build from
 * before this field existed — is treated as active, mirroring the
 * backend's own default for every engineer that predates self-registration.
 */
export const isAccountActive = (engineer: EngineerProfile | null): boolean => {
  if (!engineer) return false;
  return !engineer.accountStatus || engineer.accountStatus === 'active';
};
