import {
  sameWindowToleranceMs,
  usersPageSchema,
  type RateLimitExceededEvent,
  type UserRow,
  type UsersPage,
  type UsersQuery,
} from '@ratewatch/contracts';
import {
  keepPreviousData,
  queryOptions,
  type QueryClient,
} from '@tanstack/react-query';
import { api } from './api-client';

export const adminUsersQueryKey = ['admin', 'users'] as const;

export const getAdminUsers = (query: UsersQuery) =>
  api.get(
    `/admin/users?${new URLSearchParams(
      Object.entries(query).flatMap(([name, value]) =>
        value === undefined || value === '' ? [] : [[name, String(value)]],
      ),
    )}`,
    usersPageSchema,
  );

export const adminUsersQueries = {
  // A new search, filter, sort or page keeps the last page on screen until its own arrives.
  list: (query: UsersQuery) =>
    queryOptions({
      queryKey: [...adminUsersQueryKey, query],
      queryFn: () => getAdminUsers(query),
      placeholderData: keepPreviousData,
    }),
};

/**
 * A row's value for one of the API's sort keys. A user whose window ended has no requests left, share used or reset
 * time, so sorts last either way, as the API does.
 */
export const sortValueOf = (row: UserRow, sort: UsersQuery['sort']) =>
  ({
    id: row.userId,
    left: row.resetAt ? row.requestsLeft : undefined,
    resetAt: row.resetAt ?? undefined,
    ratio: row.resetAt ? 1 - row.requestsLeft / row.limit : undefined,
    lastRequest: row.lastRequestAt,
  })[sort];

const used = (row: UserRow) => row.limit - row.requestsLeft;
const windowEnd = (row: UserRow) => (row.resetAt ? Date.parse(row.resetAt) : 0);

/**
 * An update is kept only when it isn't older than the row on screen: a later window, or the same window with at
 * least as many requests used. Reset times a few ms apart are the same window: `rate:limit_exceeded` carries one
 * instance's own, rows carry the record's.
 */
// shortcut: an admin's Reset sends a row with no window (`resetAt: null`), which this drops as older; compare `lastResetAt` once admin controls (#54) send it.
const isNotOlder = (next: UserRow, current: UserRow) => {
  const gap = windowEnd(next) - windowEnd(current);
  return Math.abs(gap) < sameWindowToleranceMs
    ? used(next) >= used(current)
    : gap > 0;
};

/**
 * Writes a live row over the same user's row in place, on every page that shows it, and moves the user between the
 * page's status counts; the table never re-sorts from here.
 */
// shortcut: only the users on screen send updates, so the counts miss status changes of users off the page until the next fetch; take the unfiltered view's counts from `rate:summary` once analytics (#57) sends it every second.
export const applyUserRow = (client: QueryClient, next: UserRow) =>
  client.setQueriesData<UsersPage>({ queryKey: adminUsersQueryKey }, (page) => {
    if (!page) return page;
    const counts = { ...page.counts };
    const rows = page.rows.map((row) => {
      if (row.userId !== next.userId || !isNotOlder(next, row)) return row;
      counts[row.status] -= 1;
      counts[next.status] += 1;
      return next;
    });
    return { ...page, rows, counts };
  });

/** Every users-table row in the cache, on any page. */
const rowsOnScreen = (client: QueryClient) =>
  client
    .getQueriesData<UsersPage>({ queryKey: adminUsersQueryKey })
    .flatMap(([, page]) => page?.rows ?? []);

/** The users whose live updates the table needs: the rows of the page on screen, not of pages cached earlier. */
export const userIdsOnScreen = (client: QueryClient) => [
  ...new Set(
    client
      .getQueriesData<UsersPage>({
        queryKey: adminUsersQueryKey,
        type: 'active',
      })
      .flatMap(([, page]) => page?.rows.map(({ userId }) => userId) ?? []),
  ),
];

/** A user's first refusal in a window arrives before their next `rate:update`: show them Exceeded at once. */
export const applyLimitExceeded = (
  client: QueryClient,
  { userId, limit, resetAt, at }: RateLimitExceededEvent,
) => {
  const row = rowsOnScreen(client).find(
    (candidate) => candidate.userId === userId,
  );
  if (!row) return;
  applyUserRow(client, {
    ...row,
    limit,
    requestsLeft: 0,
    resetAt,
    status: 'exceeded',
    lastRequestAt: at,
  });
};
