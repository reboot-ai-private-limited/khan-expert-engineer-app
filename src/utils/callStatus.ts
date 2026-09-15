import { colors } from '@/theme';

export type StatusBucket = 'pending' | 'in_progress' | 'completed' | 'other';

/**
 * Mirrors the bucketing in backend/src/controllers/engineerCallController.ts
 * (getAssignedEngineerCalls) exactly, so the filter chips agree with the
 * summary counts the server sends. `jobStatus` itself is admin-defined free
 * text from a master collection, not a fixed enum — anything that doesn't
 * match a known phrase falls into `other` rather than being hidden.
 */
export const classifyStatus = (jobStatus: string | undefined): StatusBucket => {
  const s = (jobStatus ?? '').trim().toLowerCase();

  if (s === 'pending' || s === 'call registered') return 'pending';
  if (s === 'in progress' || s === 'attended') return 'in_progress';
  if (s === 'completed' || s === 'job done' || s === 'work completed') return 'completed';
  return 'other';
};

export const statusBucketLabel: Record<StatusBucket, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  other: 'Other',
};

export const statusPillPalette: Record<
  StatusBucket,
  { bg: string; text: string }
> = {
  pending: { bg: colors.warningWash, text: colors.warning },
  in_progress: { bg: colors.infoWash, text: colors.info },
  completed: { bg: colors.successWash, text: colors.success },
  other: { bg: colors.sunken, text: colors.textMuted },
};
