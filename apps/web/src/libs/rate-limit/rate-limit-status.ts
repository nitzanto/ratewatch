import { defaultHourlyLimit, warningThreshold } from '@ratewatch/contracts';

/** Where a user stands in the current window (see GLOSSARY.md). Paused arrives with admin controls. */
export type RateLimitStatus = 'ok' | 'warning' | 'exceeded';

// shortcut: assumes the default limit, since `x-count` only says what's left; take the user's limit from the API once custom limits exist.
/** Share of the limit used, from 0 to 1. More left than the limit (an admin's extra requests) counts as none used. */
export const usedShare = (requestsLeft: number) =>
  Math.min(
    1,
    Math.max(0, (defaultHourlyLimit - requestsLeft) / defaultHourlyLimit),
  );

export const rateLimitStatus = (requestsLeft: number): RateLimitStatus => {
  const used = usedShare(requestsLeft);
  if (used >= 1) return 'exceeded';
  if (used >= warningThreshold) return 'warning';
  return 'ok';
};
