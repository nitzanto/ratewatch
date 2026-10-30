import { RateLimitedError } from '@/libs/errors/api-error';
import {
  clickResponseSchema,
  rateLimitHeadersSchema,
  requestsLeftHeader,
} from '@ratewatch/contracts';
import {
  mutationOptions,
  queryOptions,
  skipToken,
  type QueryClient,
} from '@tanstack/react-query';
import { api } from './api-client';

/**
 * The user's limit as their clicks last left it, in one cache entry so it survives leaving the page
 * and isn't cleared while the next click is in flight. `undefined` before any click.
 * - `counted`: a click succeeded. `requestsLeft` is `null` when the response had no usable `x-count`;
 *   `before` is the count the previous click left, so a page can tell when a stage was crossed.
 * - `refused`: a click got a 429. Times are ms; `refusedAt` is when the refusal arrived.
 * - `reset`: the refusal's wait has run out, so the limit has reset and the count is unknown.
 */
export type RateLimit =
  | { kind: 'counted'; requestsLeft: number | null; before?: number }
  | { kind: 'refused'; message: string; retryAt: number; refusedAt: number }
  | { kind: 'reset' };

export const rateLimitQueryKey = ['rate-limit'] as const;

export const postClick = async () => {
  const { data, responseHeaders } = await api.post(
    '/clicks',
    clickResponseSchema,
    { responseHeaders: rateLimitHeadersSchema },
  );
  return { ...data, requestsLeft: responseHeaders[requestsLeftHeader] };
};

export const clickQueries = {
  rateLimit: () =>
    queryOptions<RateLimit>({
      queryKey: rateLimitQueryKey,
      // Never fetched: each click's outcome writes it (see `clickMutations.click`).
      queryFn: skipToken,
      // Kept while the user is on another page, so a wait they left still pauses clicking on return.
      gcTime: Infinity,
    }),
};

/** Ends a refusal's wait: the limit has reset, and the next click brings the new count. */
export const endWait = (client: QueryClient) =>
  client.setQueryData<RateLimit>(rateLimitQueryKey, { kind: 'reset' });

export const clickMutations = {
  click: () =>
    mutationOptions({
      mutationFn: postClick,
      onSuccess: ({ requestsLeft }, _variables, _result, { client }) =>
        client.setQueryData<RateLimit>(rateLimitQueryKey, (last) => ({
          kind: 'counted',
          requestsLeft,
          before:
            last?.kind === 'counted' && last.requestsLeft !== null
              ? last.requestsLeft
              : undefined,
        })),
      // Only a refusal changes the limit; any other failure leaves the last known state.
      onError: (error, _variables, _result, { client }) => {
        if (!(error instanceof RateLimitedError)) return;
        const refused: RateLimit = {
          kind: 'refused',
          message: error.message,
          retryAt: error.retryAt.getTime(),
          refusedAt: Date.now(),
        };
        client.setQueryData<RateLimit>(rateLimitQueryKey, refused);
      },
    }),
};
