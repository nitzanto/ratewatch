/** Requests per user per hour, unless an admin sets a custom limit. */
export const defaultHourlyLimit = 100;

/** Share of the limit used at which a user's status turns from OK to Warning. */
export const warningThreshold = 0.9;

/** Header on every successful response: the requests the user has left this hour, as an integer. */
export const requestsLeftHeader = 'x-count';
