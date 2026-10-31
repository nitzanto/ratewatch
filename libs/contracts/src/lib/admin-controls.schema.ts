import { z } from 'zod';
import { userParamsSchema, userRowSchema } from './admin-users.schema.js';

/** No limit, custom or with extra requests, goes above this. */
export const maxLimit = 1000;

/** Extra requests come 10 at a time, for the current window only. */
export const extraRequestsAmount = 10;

/** The most users one bulk reset takes: a page of 100 rows. */
export const maxResetUsers = 100;

/** Whether `limit`, the user's limit this window, can take 10 extra requests without passing 1,000. */
export const canAddExtraRequests = (limit: number) =>
  limit + extraRequestsAmount <= maxLimit;

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
