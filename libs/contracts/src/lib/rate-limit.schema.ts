import { z } from 'zod';
import { requestsLeftHeader } from './rate-limit.constants.js';

/**
 * Headers of a successful rate-limited response. `x-count` is the requests left this hour; only a
 * plain integer is trusted, so a missing or malformed value parses to `null` ("limit unavailable").
 */
export const rateLimitHeadersSchema = z.object({
  [requestsLeftHeader]: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .nullable()
    .catch(null),
});

export type RateLimitHeaders = z.infer<typeof rateLimitHeadersSchema>;

/**
 * Body of a 429 response. `reason` says which limit refused it: `hourly` when the user has used their requests
 * for this hour, `burst` when they sent too many at once and only need to wait for the next token.
 */
export const rateLimitedResponseSchema = z.object({
  message: z.string(),
  /** ISO 8601 time the user can send requests again. */
  retryAt: z.iso.datetime(),
  reason: z.enum(['hourly', 'burst']),
});

export type RateLimitedResponse = z.infer<typeof rateLimitedResponseSchema>;
