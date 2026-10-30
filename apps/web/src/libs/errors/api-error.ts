import { rateLimitedResponseSchema } from '@ratewatch/contracts';

/** A non-2xx API response. `body` is the parsed JSON, or `undefined` if it wasn't JSON. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message = `API responded ${status}`,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** A 429: the user is over their limit until `retryAt`. */
export class RateLimitedError extends ApiError {
  constructor(
    body: unknown,
    message: string,
    readonly retryAt: Date,
  ) {
    super(429, body, message);
    this.name = 'RateLimitedError';
  }
}

/** Turns a failed response into its typed error. A 429 whose body breaks the contract stays a plain `ApiError`. */
export const toApiError = async (res: Response): Promise<ApiError> => {
  const body: unknown = await res.json().catch(() => undefined);
  const limited =
    res.status === 429 ? rateLimitedResponseSchema.safeParse(body) : undefined;
  return limited?.success
    ? new RateLimitedError(
        body,
        limited.data.message,
        new Date(limited.data.retryAt),
      )
    : new ApiError(res.status, body);
};
