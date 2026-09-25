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

/**
 * The buckets the home screen counts, and the job list can be filtered by.
 * Deliberately not the same split as `StatusBucket`, and they overlap each
 * other on purpose — each answers a different question an engineer asks:
 *
 * - `today`      — scheduled for today, whatever its status: "where am I
 *                  going today".
 * - `pending`    — not picked up yet: the status itself still reads Pending
 *                  or Call Registered. Narrower than `open`.
 * - `open`       — everything still outstanding (not completed, not closed),
 *                  which is "what's left for me" however far along it is.
 * - `open_today` — the intersection: outstanding AND scheduled today, i.e.
 *                  the work that has to happen before the day ends.
 * - `completed`  — finished, still on the engineer's list until the office
 *                  closes it. A closed job leaves the app entirely: sign-off
 *                  is the office's business, not the engineer's.
 * - `all`        — every assigned job, no filter at all.
 */
export type JobFilter = 'today' | 'pending' | 'open' | 'open_today' | 'completed' | 'all';

export const jobFilterLabel: Record<JobFilter, string> = {
  today: "Today's Appointment",
  pending: 'Pending',
  open: 'Open',
  open_today: 'Open Today',
  completed: 'Completed',
  all: 'All',
};

/** The date a visit is expected on — same pair of fields the job card shows. */
const scheduledDate = (call: { visitdate?: string; etaDate?: string }): Date | null => {
  const raw = call.visitdate ?? call.etaDate;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Local-day comparison — an engineer's "today" is the phone's today, not UTC's. */
export const isScheduledToday = (call: { visitdate?: string; etaDate?: string }): boolean => {
  const date = scheduledDate(call);
  if (!date) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

export const isCompleted = (call: { jobStatus: string }): boolean =>
  classifyStatus(call.jobStatus) === 'completed';

export const matchesJobFilter = (
  call: { jobStatus: string; subStatus?: string; visitdate?: string; etaDate?: string },
  filter: JobFilter
): boolean => {
  switch (filter) {
    case 'all':
      return true;
    case 'today':
      return isScheduledToday(call);
    case 'pending':
      return classifyStatus(call.jobStatus) === 'pending';
    case 'open':
      return !isFinished(call);
    case 'open_today':
      return !isFinished(call) && isScheduledToday(call);
    case 'completed':
      return isCompleted(call);
    default:
      return true;
  }
};

export const countByJobFilter = <T extends { jobStatus: string; subStatus?: string; visitdate?: string; etaDate?: string }>(
  calls: T[],
  filter: JobFilter
): number => calls.filter((call) => matchesJobFilter(call, filter)).length;

/**
 * Closed jobs, which the office has signed off.
 *
 * `classifyStatus` deliberately leaves these in the `other` bucket — the
 * engineer's list never used to contain them, so they were never worth a
 * bucket of their own. Now that finished work is visible, they need their
 * own test.
 */
export const isClosed = (call: { jobStatus: string; subStatus?: string }): boolean =>
  [call.jobStatus, call.subStatus ?? ''].some((v) => /close/i.test(v.trim()));

/**
 * Finished either way — marked done by the engineer, or closed by the
 * office. This, not `isCompleted`, is the test for anything that should
 * stop being offered once the work is over: the customer's phone number
 * above all, which an engineer has no reason to hold on to afterwards.
 */
export const isFinished = (call: { jobStatus: string; subStatus?: string }): boolean =>
  isCompleted(call) || isClosed(call);
