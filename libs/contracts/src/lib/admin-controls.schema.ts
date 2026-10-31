import { z } from 'zod';
import { userParamsSchema, userRowSchema } from './admin-users.schema.js';

/** No limit, custom or with extra requests, goes above this. */
export const maxLimit = 1000;

/** A custom limit is a whole number of requests per hour from 1 to 1,000; 100 is the default, so setting it clears the custom limit. */
export const limitSchema = z.int().min(1).max(maxLimit);

/** Body of `PUT /admin/users/:id/limit`. */
export const customLimitSchema = z.object({ limit: limitSchema });

export type CustomLimit = z.infer<typeof customLimitSchema>;

/** How long an admin can pause a user's limit: 15 minutes, 1 hour, or until their window ends. */
export const pauseDurationSchema = z.enum(['15m', '1h', 'untilReset']);

export type PauseDuration = z.infer<typeof pauseDurationSchema>;

/** How long the fixed pause durations last; `untilReset` lasts as long as the user's window has left. */
export const pauseMs = { '15m': 15 * 60_000, '1h': 60 * 60_000 } as const;

/** Body of `PUT /admin/users/:id/pause`. */
export const pauseSchema = z.object({ duration: pauseDurationSchema });

export type Pause = z.infer<typeof pauseSchema>;

/** Extra requests come 10 at a time, for the current window only. */
export const extraRequestsAmount = 10;

/** The most users one bulk reset takes: a page of 100 rows. */
export const maxResetUsers = 100;

/** Whether `limit`, the user's limit this window, can take 10 extra requests without passing 1,000. */
export const canAddExtraRequests = (limit: number) =>
  limit + extraRequestsAmount <= maxLimit;

/** Whether a custom limit `limit` keeps the window's `extra` requests on top without passing 1,000. */
export const canSetLimit = (limit: number, extra: number) =>
  limit + extra <= maxLimit;

/** Body of `POST /admin/users/:id/extra-requests`. */
export const extraRequestsSchema = z.object({
  amount: z.literal(extraRequestsAmount),
});

/** Body of `POST /admin/users/reset`: the users whose limits to reset together. */
export const resetUsersSchema = z.object({
  userIds: z.array(userParamsSchema.shape.id).min(1).max(maxResetUsers),
});

export type ResetUsers = z.infer<typeof resetUsersSchema>;

/** Body of an admin's change: the changed users' rows, none for a user without a record. */
export const adminChangeSchema = z.object({ rows: z.array(userRowSchema) });

export type AdminChange = z.infer<typeof adminChangeSchema>;
