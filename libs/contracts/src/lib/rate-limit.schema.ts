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

/** Body of a 429 response: the request was over the user's limit. */
export const rateLimitedResponseSchema = z.object({
  message: z.string(),
  /** ISO 8601 time the user can send requests again. */
  retryAt: z.iso.datetime(),
});

export type RateLimitedResponse = z.infer<typeof rateLimitedResponseSchema>;
