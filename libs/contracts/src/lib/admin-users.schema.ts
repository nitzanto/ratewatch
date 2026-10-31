import { z } from 'zod';

/** Where a user stands in the current window (see GLOSSARY.md). */
export const userStatusSchema = z.enum(['ok', 'warning', 'exceeded', 'paused']);

export type UserStatus = z.infer<typeof userStatusSchema>;

/** One user in the admin users table, and in each `rate:update`. Times are ISO 8601. */
export const userRowSchema = z.object({
  userId: z.string().min(1),
  /** The user's limit for this window: 100 or their custom limit, plus any extra requests. */
  limit: z.int().positive(),
  requestsLeft: z.int().nonnegative(),
  /** When the window ends; `null` once it has, which reads as a full limit. */
  resetAt: z.iso.datetime().nullable(),
  status: userStatusSchema,
  lastRequestAt: z.iso.datetime(),
  pausedUntil: z.iso.datetime().nullable(),
});

export type UserRow = z.infer<typeof userRowSchema>;

/** Body of `GET /admin/users`: one page of rows, every match's total and each status's count. */
export const usersPageSchema = z.object({
  rows: z.array(userRowSchema),
  total: z.int().nonnegative(),
  counts: z.record(userStatusSchema, z.int().nonnegative()),
});

export type UsersPage = z.infer<typeof usersPageSchema>;

/** The last-active filter's choices, and how far back each reaches. */
export const activeWithinMs = {
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '24h': 24 * 60 * 60_000,
} as const;

/** The users table's page sizes. */
export const usersPageSizes = [25, 50, 100] as const;

/** Query of `GET /admin/users`. `q` is a full user ID, or a prefix of at least 2 characters. */
export const usersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: userStatusSchema.optional(),
  activeWithin: z.enum(['15m', '1h', '24h']).default('24h'),
  sort: z
    .enum(['id', 'left', 'resetAt', 'ratio', 'lastRequest'])
    .default('lastRequest'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().pipe(z.literal(usersPageSizes)).default(25),
});

export type UsersQuery = z.infer<typeof usersQuerySchema>;

/** Path parameters of a user's admin endpoints, such as `GET /admin/users/:id`. */
export const userParamsSchema = z.object({ id: z.string().min(1).max(64) });

/** One request a user sent, and whether the limiter let it through. */
export const recentRequestSchema = z.object({
  at: z.iso.datetime(),
  allowed: z.boolean(),
});

export type RecentRequest = z.infer<typeof recentRequestSchema>;

/** The requests the API keeps per user, for 24 hours after their last one. */
export const recentRequestsKept = 50;

/** Body of `GET /admin/users/:id`: the user's row, when their count last went back to zero, and their last requests, newest first. */
export const userDetailSchema = z.object({
  row: userRowSchema,
  /** `null` until the user's first window has ended. */
  lastResetAt: z.iso.datetime().nullable(),
  recent: z.array(recentRequestSchema).max(recentRequestsKept),
});

export type UserDetail = z.infer<typeof userDetailSchema>;

/** The activity ranges: how many buckets each has, and how long each bucket is. */
export const activityRanges = {
  hour: { buckets: 60, bucketMs: 60_000 },
  day: { buckets: 96, bucketMs: 15 * 60_000 },
} as const;

export type ActivityRange = keyof typeof activityRanges;

/** Query of `GET /admin/users/:id/history`. */
export const userHistoryQuerySchema = z.object({
  range: z.enum(['hour', 'day']).default('hour'),
});

/** Body of `GET /admin/users/:id/history`: accepted and refused requests per bucket, oldest first, the last one holding now. */
export const userHistorySchema = z.object({
  buckets: z.array(
    z.object({
      start: z.iso.datetime(),
      accepted: z.int().nonnegative(),
      refused: z.int().nonnegative(),
    }),
  ),
});

export type UserHistory = z.infer<typeof userHistorySchema>;
