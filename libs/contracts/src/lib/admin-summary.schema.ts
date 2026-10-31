import { z } from 'zod';
import { statusCountsSchema } from './admin-users.schema.js';

/** How many users the top-users list shows. */
export const topUsersShown = 5;

/** One of the top users: the requests they made in their current window, against its limit. */
export const topUserSchema = z.object({
  userId: z.string().min(1),
  used: z.int().positive(),
  limit: z.int().positive(),
});

export type TopUser = z.infer<typeof topUserSchema>;

/**
 * Body of `GET /admin/summary`, and the payload of `rate:summary`. Users are those active in the past 24 hours;
 * "near the limit" is Warning or Exceeded, out of all of them.
 */
export const adminSummarySchema = z.object({
  totalUsers: z.int().nonnegative(),
  /** (Warning + Exceeded) ÷ total users, from 0 to 1; 0 with no users. */
  nearLimitShare: z.number().min(0).max(1),
  /** Requests refused for being over the limit since midnight UTC. */
  refusedToday: z.int().nonnegative(),
  counts: statusCountsSchema,
  /** Most requests in the current window first; users whose window ended aren't in it. */
  topUsers: z.array(topUserSchema).max(topUsersShown),
});

export type AdminSummary = z.infer<typeof adminSummarySchema>;
