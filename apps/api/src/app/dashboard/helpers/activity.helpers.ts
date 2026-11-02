import type {
  RateLimitExceededEvent,
  RateUpdateEvent,
  UserRow,
} from '@ratewatch/contracts';
import { maxRequestsPerUpdate } from '../constants/dashboard.constants';
import type { Activity } from '../interfaces/activity.interface';
import type { Decision } from '../interfaces/decision.interface';

/**
 * The dashboard publisher's merging, kept out of `DashboardPublisher`: each one builds a new value and leaves its
 * inputs as they were.
 */

/** The history field a request counts in: `a:<minute>` accepted, `r:<minute>` refused. */
export const buildHistoryField = ({ at, allowed }: Decision) =>
  `${allowed ? 'a' : 'r'}:${Math.floor(at / 60_000)}`;

/** The two maps' counts added up, field by field. */
export const mergeCounts = (
  a: Map<string, number>,
  b: Map<string, number>,
): Map<string, number> => {
  const merged = new Map(a);

  for (const [field, count] of b)
    merged.set(field, (merged.get(field) ?? 0) + count);

  return merged;
};

/** The user's activity with one more decision: its numbers become the latest, and its request is the newest. */
export const addDecision = (
  older: Activity | undefined,
  decision: Decision,
): Activity => ({
  latest: decision,
  requests: [
    { at: decision.at, allowed: decision.allowed },
    ...(older?.requests ?? []),
  ].slice(0, maxRequestsPerUpdate),
  counts: mergeCounts(
    older?.counts ?? new Map(),
    new Map([[buildHistoryField(decision), 1]]),
  ),
});

/** A failed batch entry merged behind newer activity: the newer numbers win, and the requests and counts add up. */
export const mergeActivities = (
  newer: Activity,
  older: Activity,
): Activity => ({
  latest: newer.latest,
  requests: [...newer.requests, ...older.requests].slice(
    0,
    maxRequestsPerUpdate,
  ),
  counts: mergeCounts(newer.counts, older.counts),
});

/** The `rate:update` for a written row, with the requests since the last update. */
export const buildUpdateEvent = (
  row: UserRow,
  { requests }: Activity,
): RateUpdateEvent => ({
  row,
  requests: requests.map(({ at, allowed }) => ({
    at: new Date(at).toISOString(),
    allowed,
  })),
});

/** The `rate:limit_exceeded` for a first refusal. */
export const buildLimitExceededEvent = ({
  userId,
  limit,
  resetAt,
  at,
}: Decision): RateLimitExceededEvent => ({
  userId,
  limit,
  resetAt: new Date(resetAt).toISOString(),
  at: new Date(at).toISOString(),
});
