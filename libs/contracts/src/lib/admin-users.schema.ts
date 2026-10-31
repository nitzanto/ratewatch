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
