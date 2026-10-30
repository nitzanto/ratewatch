import { z } from 'zod';

/** Body of a 429 response: the request was over the user's limit. */
export const rateLimitedResponseSchema = z.object({
  message: z.string(),
  /** ISO 8601 time the user can send requests again. */
  retryAt: z.iso.datetime(),
});

export type RateLimitedResponse = z.infer<typeof rateLimitedResponseSchema>;
