import { z } from 'zod';
import { recentRequestSchema, userRowSchema } from './admin-users.schema.js';

/** Socket.IO events between the API and an admin's web app. */
export const realtimeEvents = {
  /** Web to API, with an ack: the users on screen, whose updates the admin wants from now on. */
  subscribe: 'rate:subscribe',
  /** A subscribed user's latest row, at most once a second per user. */
  update: 'rate:update',
  /** A user's first refusal in a window, sent at once. */
  limitExceeded: 'rate:limit_exceeded',
  /** The dashboard's summary (`adminSummarySchema`), once a second. */
  summary: 'rate:summary',
} as const;

/** The most users one admin follows: a page of 100 rows plus the open user. */
export const maxSubscribedUsers = 101;

/** Body of `rate:subscribe`: replaces the users the admin follows. */
export const rateSubscribeSchema = z.object({
  userIds: z.array(z.string().min(1).max(64)).max(maxSubscribedUsers),
});

export type RateSubscribe = z.infer<typeof rateSubscribeSchema>;

/** Ack of `rate:subscribe`: the followed users' current rows, so nothing changes unseen between the page load and the subscription. */
export const rateSubscribeAckSchema = z.object({
  rows: z.array(userRowSchema),
});

export type RateSubscribeAck = z.infer<typeof rateSubscribeAckSchema>;

export const rateUpdateEventSchema = z.object({
  row: userRowSchema,
  /** The user's requests since the last update, newest first. */
  requests: z.array(recentRequestSchema),
  /** An admin changed the user: the row replaces the one on screen though it may look older (a reset ends the window). */
  byAdmin: z.boolean().optional(),
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
