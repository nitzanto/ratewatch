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
