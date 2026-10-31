/** Requests per user per hour, unless an admin sets a custom limit. */
export const defaultHourlyLimit = 100;

/** Share of the limit used at which a user's status turns from OK to Warning. */
export const warningThreshold = 0.9;

/**
 * Each API instance turns a window's TTL into a reset time with its own clock, so one window's reset times can
 * differ by a few ms. Reset times closer than this are the same window; windows are at least an hour apart.
 */
export const sameWindowToleranceMs = 5000;

/** Header on every successful response: the requests the user has left this hour, as an integer. */
export const requestsLeftHeader = 'x-count';
