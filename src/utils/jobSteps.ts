import type { EngineerCall } from '@/types/call';

/**
 * The job, broken into one screen per step.
 *
 * Replaces the single long job screen: an engineer working outdoors, often
 * one-handed, should see one task at a time rather than scroll past ten
 * cards looking for the one that still needs doing.
 *
 * The order follows the real visit — the ride happens before arrival, so it
 * comes before check-in, not after it.
 */
export type JobStepKey =
  | 'ride'
  | 'check-in'
  | 'product'
  | 'work'
  | 'spares'
  | 'photos'
  | 'charges'
  | 'signature'
  | 'payment'
  | 'check-out'
  | 'job-sheet';

export interface JobStepDef {
  key: JobStepKey;
  title: string;
  /** One line under the title on the overview, describing what the step is for. */
  hint: string;
  /** Route to push. Every step screen takes `?callId=`, matching the signature screen. */
  route: string;
  /**
   * Optional steps never block a later step. Spare parts and photos are not
   * part of every job, and forcing them would teach engineers to enter junk.
   */
  optional?: boolean;
  /** Whether the engineer has finished this step, judged from the ticket itself. */
  isDone: (call: EngineerCall) => boolean;
}

export const hasWorkRecorded = (call: EngineerCall): boolean => {
  const steppedWork = (call.stepResults ?? []).some((s) => (s.notes ?? '').trim().length > 0);
  return steppedWork || (call.remarks ?? '').trim().length > 0;
};

export const JOB_STEPS: JobStepDef[] = [
  {
    key: 'ride',
    title: 'Your ride',
    hint: 'How you travelled here, and what it cost',
    route: '/(tabs)/calls/ride',
    isDone: (call) => Boolean(call.ride),
  },
  {
    key: 'check-in',
    title: 'Start work',
    hint: 'Selfie and location, to start the job',
    route: '/(tabs)/calls/check-in',
    isDone: (call) => Boolean(call.checkIn),
  },
  {
    key: 'product',
    title: 'Check SR',
    hint: 'Photograph the unit and confirm its warranty',
    route: '/(tabs)/calls/product',
    isDone: (call) => Boolean(call.warrantyStatus),
  },
  {
    key: 'work',
    title: 'Do the work',
    hint: 'What you did on this visit',
    route: '/(tabs)/calls/work',
    isDone: hasWorkRecorded,
  },
  {
    key: 'spares',
    title: 'Spare parts',
    hint: 'Only if something was missing',
    route: '/(tabs)/calls/spares',
    optional: true,
    isDone: () => false,
  },
  {
    key: 'photos',
    title: 'Photos',
    hint: 'Evidence of the work, before and after — photos or a short video',
    route: '/(tabs)/calls/photos',
    optional: true,
    isDone: (call) => (call.service_images ?? []).length > 0 || (call.service_videos ?? []).length > 0,
  },
  {
    key: 'charges',
    title: 'Charges',
    hint: 'What the customer is billed',
    route: '/(tabs)/calls/charges',
    isDone: (call) => (call.engineerServices ?? []).length > 0,
  },
  {
    key: 'signature',
    title: 'Customer signature',
    hint: 'The customer signs for the work',
    route: '/(tabs)/calls/sign',
    isDone: (call) => Boolean(call.customerSignature),
  },
  {
    key: 'payment',
    title: 'Payment',
    hint: 'What you collected, and how',
    route: '/(tabs)/calls/payment',
    isDone: (call) => Boolean(call.paymentCollected),
  },
  {
    key: 'check-out',
    title: 'Checkout',
    hint: 'Location, to close out the visit',
    route: '/(tabs)/calls/check-out',
    isDone: (call) => Boolean(call.checkOut),
  },
  {
    key: 'job-sheet',
    title: 'Job sheet',
    hint: 'Review everything, then finish the job',
    route: '/(tabs)/calls/job-sheet',
    isDone: () => false,
  },
];

export const stepByKey = (key: JobStepKey): JobStepDef => {
  const found = JOB_STEPS.find((s) => s.key === key);
  if (!found) throw new Error(`Unknown job step: ${key}`);
  return found;
};

/**
 * A step is reachable once every *required* step before it is done.
 *
 * Optional steps are skipped over rather than blocking, and a finished step
 * always stays reachable so the engineer can go back and correct it.
 */
export const isStepUnlocked = (call: EngineerCall, key: JobStepKey): boolean => {
  const index = JOB_STEPS.findIndex((s) => s.key === key);
  if (index <= 0) return true;

  return JOB_STEPS.slice(0, index).every((s) => s.optional || s.isDone(call));
};

/** The step the engineer should be on — the first required one not yet done. */
export const currentStep = (call: EngineerCall): JobStepDef =>
  JOB_STEPS.find((s) => !s.optional && !s.isDone(call)) ?? JOB_STEPS[JOB_STEPS.length - 1];

/** Progress over required steps only, so skipping photos never looks like falling behind. */
export const stepProgress = (call: EngineerCall): { done: number; total: number } => {
  const required = JOB_STEPS.filter((s) => !s.optional && s.key !== 'job-sheet');
  return { done: required.filter((s) => s.isDone(call)).length, total: required.length };
};

/** The next step to send the engineer to after finishing one, or null at the end. */
export const nextStepAfter = (call: EngineerCall, key: JobStepKey): JobStepDef | null => {
  const index = JOB_STEPS.findIndex((s) => s.key === key);
  return JOB_STEPS[index + 1] ?? null;
};
