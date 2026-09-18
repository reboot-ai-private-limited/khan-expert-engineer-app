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

/**
 * Whether this engineer may complete their application — add KYC
 * documents and pick skills — even though they are not active yet.
 *
 * Without this, a self-registered engineer has no way to ever submit KYC:
 * those screens live under `(tabs)/profile`, which used to be gated
 * behind `isAccountActive`, and the pending-approval status screen had no
 * route to them. `rejected`/`suspended`/`inactive` stay excluded — those
 * are terminal or locked states, not "still onboarding".
 */
export const canCompleteApplication = (engineer: EngineerProfile | null): boolean => {
  if (!engineer) return false;
  if (isAccountActive(engineer)) return true;
  return engineer.accountStatus === 'pending_approval' || engineer.accountStatus === 'changes_requested';
};
