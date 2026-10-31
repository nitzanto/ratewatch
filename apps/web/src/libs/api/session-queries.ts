import { ApiError } from '@/libs/errors/api-error';
import {
  type Role,
  type Session,
  sessionSchema,
  type SignInRequest,
} from '@ratewatch/contracts';
import {
  mutationOptions,
  queryOptions,
  type QueryClient,
} from '@tanstack/react-query';
import { z } from 'zod';
import { api } from './api-client';

export const sessionQueryKey = ['session'] as const;

/** The signed-in person, or `null` when the API answers 401 because nobody is. */
export const getSession = async () => {
  try {
    return await api.get('/auth/me', sessionSchema);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
};

export const postSignIn = (role: Role) =>
  api.post('/auth/sign-in', sessionSchema, {
    body: { role } satisfies SignInRequest,
  });

// 204: no body.
export const postSignOut = () => api.post('/auth/sign-out', z.undefined());

// Every other cached query belonged to the last person, such as their rate limit, so a new session starts without it.
const replaceSession = (client: QueryClient, session: Session | null) => {
  client.removeQueries({
    predicate: ({ queryKey }) => queryKey[0] !== sessionQueryKey[0],
  });
  client.setQueryData(sessionQueryKey, session);
};

export const sessionQueries = {
  // Only signing in or out changes it, and both write it directly.
  current: () =>
    queryOptions({
      queryKey: sessionQueryKey,
      queryFn: getSession,
      staleTime: Infinity,
    }),
};

export const sessionMutations = {
  signIn: () =>
    mutationOptions({
      mutationFn: postSignIn,
      onSuccess: (session, _role, _result, { client }) =>
        replaceSession(client, session),
    }),
  signOut: () =>
    mutationOptions({
      mutationFn: postSignOut,
      onSuccess: (_data, _variables, _result, { client }) =>
        replaceSession(client, null),
    }),
};
