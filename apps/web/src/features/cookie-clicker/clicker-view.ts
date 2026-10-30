import type { CrumbMood } from '@/components/ui/crumb';
import type { RateLimit } from '@/libs/api/click-queries';
import {
  rateLimitStatus,
  usedShare,
  type RateLimitStatus,
} from '@/libs/rate-limit/rate-limit-status';

/** What the message slot says. */
export type ClickerNote =
  | { kind: 'refused'; message: string; waiting: boolean }
  | { kind: 'failed' }
  | { kind: 'welcome-back' }
  | { kind: 'almost-out'; requestsLeft: number }
  | { kind: 'stage'; stage: number }
  | { kind: 'last-request' }
  | { kind: 'hint' };

/** Everything the clicker card draws outside a wait. */
export type ClickerView = {
  /**
   * - `clicking`: no refusal; the count comes from the latest `x-count`.
   * - `refused`: refused, but the retry time had already passed when the refusal arrived (a server clock behind this one), so clicking stays on.
   * - `back`: a wait has run out, so the limit has reset; the count is unknown until the next click.
   */
  phase: 'clicking' | 'refused' | 'back';
  /** Requests left; `undefined` when unknown. */
  left: number | undefined;
  /** The last response had no usable `x-count` (the API couldn't check the limit). */
  unavailable: boolean;
  status: RateLimitStatus | undefined;
  mood: CrumbMood;
  note: ClickerNote;
};

/** A refusal still counting down: the card shows the wait instead (see `Waiting`). */
export type ClickerWait = Extract<RateLimit, { kind: 'refused' }> & {
  phase: 'waiting';
};

/** Crumb's five moods while OK; he moves to the next and drops a chip every 20% of the limit used. */
const crumbStages: CrumbMood[] = [
  'fresh',
  'warming-up',
  'excited',
  'focused',
  'tired',
];

/** Which of Crumb's OK stages a count falls in, from 0 (fresh) to 4 (tired). */
const stageOf = (left: number) =>
  Math.min(
    crumbStages.length - 1,
    Math.floor(usedShare(left) * crumbStages.length),
  );

const crumbMood = (
  status: RateLimitStatus | undefined,
  left: number | undefined,
  unavailable: boolean,
): CrumbMood => {
  if (unavailable) return 'unsure';
  if (status === 'exceeded' || status === 'warning') return status;
  return left === undefined ? 'fresh' : crumbStages[stageOf(left)];
};

/** The note while clicking, most urgent first. */
const clickingNote = (
  failed: boolean,
  status: RateLimitStatus | undefined,
  left: number | undefined,
  before: number | undefined,
): ClickerNote => {
  if (failed) return { kind: 'failed' };
  if (left === undefined) return { kind: 'hint' };
  if (status === 'warning') return { kind: 'almost-out', requestsLeft: left };
  if (status === 'exceeded') return { kind: 'last-request' };
  // A note each time a click crosses into a new stage, even when the count jumped past its boundary.
  if (before !== undefined && stageOf(left) > stageOf(before))
    return { kind: 'stage', stage: stageOf(left) };
  return { kind: 'hint' };
};

/** Maps the user's limit, as their clicks last left it, to what the clicker card draws. */
export const clickerView = (
  limit: RateLimit | undefined,
  /** The last click failed some other way (server error, broken contract). */
  failed: boolean,
): ClickerView | ClickerWait => {
  if (limit?.kind === 'refused') {
    if (limit.retryAt > limit.refusedAt) return { ...limit, phase: 'waiting' };
    return {
      phase: 'refused',
      // A 429 means none left, whatever the last count said.
      left: 0,
      unavailable: false,
      status: 'exceeded',
      mood: 'exceeded',
      note: { kind: 'refused', message: limit.message, waiting: false },
    };
  }

  if (limit?.kind === 'reset')
    return {
      phase: 'back',
      left: undefined,
      unavailable: false,
      status: undefined,
      mood: 'fresh',
      note: failed ? { kind: 'failed' } : { kind: 'welcome-back' },
    };

  const left = limit?.requestsLeft ?? undefined;
  const unavailable = limit?.requestsLeft === null;
  const status = left === undefined ? undefined : rateLimitStatus(left);
  return {
    phase: 'clicking',
    left,
    unavailable,
    status,
    mood: crumbMood(status, left, unavailable),
    note: clickingNote(failed, status, left, limit?.before),
  };
};
