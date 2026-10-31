import { toApiError } from '@/libs/errors/api-error';
import type { z } from 'zod';

interface ApiClientOptions {
  /** Defaults to `/api`: the API sits on the dashboard's own origin. */
  baseUrl?: string;
  /** Sees every failed request before it throws; error tracking plugs in here. */
  onError?: (error: unknown) => void;
}

interface CallOptions {
  /** Sent as JSON. */
  body?: unknown;
  /** The response headers' schema, from `@ratewatch/contracts`; ask for it to read a header such as `x-count`. */
  responseHeaders?: z.ZodType;
}

/** A call returns the parsed body, or the parsed body and headers when it passes a `responseHeaders` schema. */
type Call<Options> = {
  <S extends z.ZodType, H extends z.ZodType>(
    path: string,
    schema: S,
    options: Options & { responseHeaders: H },
  ): Promise<{ data: z.output<S>; responseHeaders: z.output<H> }>;
  <S extends z.ZodType>(
    path: string,
    schema: S,
    options?: Omit<Options, 'responseHeaders'>,
  ): Promise<z.output<S>>;
};

/** 204 No Content never has a body, and some servers send other empty responses with `Content-Length: 0`. */
const hasNoBody = (res: Response) =>
  res.status === 204 || res.headers.get('Content-Length') === '0';

/**
 * Every call takes the response's schema and returns what it parses, so no
 * caller can claim a response type it never checked.
 */
export const createApiClient = ({
  baseUrl = '/api',
  onError,
}: ApiClientOptions = {}) => {
  const request = async (
    method: string,
    path: string,
    schema: z.ZodType,
    { body, responseHeaders }: CallOptions = {},
  ) => {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        ...(body !== undefined && {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
      });
      if (!res.ok) throw await toApiError(res);
      // The API is a trust boundary for the browser too: parse, don't cast. An empty response's
      // body is `undefined`, so a caller expecting one passes `z.undefined()`.
      const data = schema.parse(hasNoBody(res) ? undefined : await res.json());
      if (!responseHeaders) return data;
      return {
        data,
        responseHeaders: responseHeaders.parse(Object.fromEntries(res.headers)),
      };
    } catch (error) {
      onError?.(error);
      throw error;
    }
  };

  // The overloads in `Call` give each call its return type; `request` above returns the same two shapes.
  const call = <Options extends CallOptions>(method: string) =>
    ((path: string, schema: z.ZodType, options?: Options) =>
      request(method, path, schema, options)) as Call<Options>;

  return {
    get: call<Pick<CallOptions, 'responseHeaders'>>('GET'),
    post: call<CallOptions>('POST'),
    patch: call<CallOptions>('PATCH'),
    put: call<CallOptions>('PUT'),
    delete: call<Pick<CallOptions, 'responseHeaders'>>('DELETE'),
  };
};

export const api = createApiClient();
