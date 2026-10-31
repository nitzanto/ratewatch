import { z } from 'zod';
import { userRowSchema } from './admin-users.schema.js';

/** Socket.IO events the API sends admins. */
export const realtimeEvents = {
  /** A user's latest row, at most once a second per user. */
  update: 'rate:update',
  /** A user's first refusal in a window, sent at once. */
  limitExceeded: 'rate:limit_exceeded',
} as const;

export const rateUpdateEventSchema = z.object({
  row: userRowSchema,
  /** The user's requests since the last update, newest first. */
  requests: z.array(z.object({ at: z.iso.datetime(), allowed: z.boolean() })),
});

export type RateUpdateEvent = z.infer<typeof rateUpdateEventSchema>;

export const rateLimitExceededEventSchema = z.object({
  userId: z.string().min(1),
  limit: z.int().positive(),
  resetAt: z.iso.datetime(),
  /** When the refused request arrived. */
  at: z.iso.datetime(),
});

export type RateLimitExceededEvent = z.infer<
  typeof rateLimitExceededEventSchema
>;
