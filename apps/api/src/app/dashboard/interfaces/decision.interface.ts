/** One limit check's outcome for a User, as the limiter hands it to the dashboard. Times are epoch ms. */
export interface Decision {
  userId: string;
  allowed: boolean;
  /** When the request arrived. */
  at: number;
  /** The limit for this window, extra requests included. */
  limit: number;
  /** Requests counted in the window. */
  used: number;
  resetAt: number;
  /** The first refusal in this window, which admins hear about at once. */
  firstRefusal: boolean;
}
