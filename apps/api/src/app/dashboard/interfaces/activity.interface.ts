import type { Decision } from './decision.interface';

/** One user's activity since the dashboard last wrote it to Redis. Times are epoch ms. */
export interface Activity {
  latest: Decision;
  /** Their requests, newest first, at most `maxRequestsPerUpdate`. */
  requests: { at: number; allowed: boolean }[];
  /** Requests per history field: `a:<minute>` accepted, `r:<minute>` refused, in epoch minutes. */
  counts: Map<string, number>;
}
