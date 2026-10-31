import {
  sameWindowToleranceMs,
  usersPageSchema,
  type RateLimitExceededEvent,
  type UserRow,
  type UsersPage,
} from '@ratewatch/contracts';
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { api } from './api-client';

export const adminUsersQueryKey = ['admin', 'users'] as const;

export const getAdminUsers = () => api.get('/admin/users', usersPageSchema);

export const adminUsersQueries = {
  list: () =>
    queryOptions({ queryKey: adminUsersQueryKey, queryFn: getAdminUsers }),
};

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

/** Writes a live row over the same user's row in place, on every page that shows it; the table never re-sorts from here. */
export const applyUserRow = (client: QueryClient, next: UserRow) =>
  client.setQueriesData<UsersPage>(
    { queryKey: adminUsersQueryKey },
    (page) =>
      page && {
        ...page,
        rows: page.rows.map((row) =>
          row.userId === next.userId && isNotOlder(next, row) ? next : row,
        ),
      },
  );

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
