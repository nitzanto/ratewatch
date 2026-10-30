import { toApiError } from '@/libs/errors/api-error';
import type { z } from 'zod';

interface ApiClientOptions {
  /** Defaults to `/api`: the API sits on the dashboard's own origin. */
  baseUrl?: string;
  /** Sees every failed request before it throws; error tracking plugs in here. */
  onError?: (error: unknown) => void;
}

/**
 * Every call takes the response's schema and returns what it parses, so no
 * caller can claim a response type it never checked.
 */
export const createApiClient = ({
  baseUrl = '/api',
  onError,
}: ApiClientOptions = {}) => {
  const request = async <S extends z.ZodType>(
    method: string,
    path: string,
    schema: S,
    body?: unknown,
  ): Promise<z.output<S>> => {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        ...(body !== undefined && {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
      });
      if (!res.ok) throw await toApiError(res);
      // The API is a trust boundary for the browser too: parse, don't cast.
      return schema.parse(await res.json());
    } catch (error) {
      onError?.(error);
      throw error;
    }
  };

  return {
    get: <S extends z.ZodType>(path: string, schema: S) =>
      request('GET', path, schema),
    post: <S extends z.ZodType>(path: string, schema: S, body?: unknown) =>
      request('POST', path, schema, body),
    patch: <S extends z.ZodType>(path: string, schema: S, body?: unknown) =>
      request('PATCH', path, schema, body),
  };
};

export const api = createApiClient();
