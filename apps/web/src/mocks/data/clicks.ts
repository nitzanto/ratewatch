import type { ClickResponse, RateLimitedResponse } from '@ratewatch/contracts';

export const click = () =>
  ({ clickedAt: new Date().toISOString() }) satisfies ClickResponse;

export const rateLimited = (retryAt: Date) =>
  ({
    message: "You've used all your requests for this hour.",
    retryAt: retryAt.toISOString(),
  }) satisfies RateLimitedResponse;
