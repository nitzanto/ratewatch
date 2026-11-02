import {
  recentRequestsKept,
  sameWindowToleranceMs,
  userDetailSchema,
  userHistorySchema,
  usersPageSchema,
  type ActivityRange,
  type RateLimitExceededEvent,
  type RateUpdateEvent,
  type UserDetail,
  type UserRow,
  type UsersPage,
  type UsersQuery,
} from '@ratewatch/contracts';
import {
  keepPreviousData,
  queryOptions,
  type QueryClient,
} from '@tanstack/react-query';
import { api } from '../api-client';

export const usersQueryKey = ['users'] as const;

// Apart from the users table's key, so its page updaters never meet a user's detail.
const userQueryKey = ['user'] as const;
const userHistoryQueryKey = ['user-history'] as const;

export const getUsers = (query: UsersQuery) =>
  api.get(
    `/admin/users?${new URLSearchParams(
      Object.entries(query).flatMap(([paramName, paramValue]) =>
        paramValue === undefined || paramValue === ''
          ? []
          : [[paramName, String(paramValue)]],
      ),
    )}`,
    usersPageSchema,
  );

/**
 * How long until the first of these rows' pauses ends, so the query is fetched again then: no update arrives when a
 * pause runs out, since nothing changes in Redis but a key expiring. `false` with no pause on screen.
 */
export const getMsUntilFirstPauseEnds = (rows: UserRow[] = []) => {
  const pauseEnds = rows.flatMap(({ pausedUntil }) =>
    pausedUntil ? [Date.parse(pausedUntil)] : [],
  );

  // A moment after the end, so the API has dropped the pause by then.
  return pauseEnds.length
    ? Math.max(Math.min(...pauseEnds) - Date.now(), 0) + 500
    : false;
};

export const usersQueries = {
  // A new search, filter, sort or page shouldReplaceRow the last page on screen until its own arrives.
  list: (query: UsersQuery) =>
    queryOptions({
      queryKey: [...usersQueryKey, query],
      queryFn: () => getUsers(query),
      placeholderData: keepPreviousData,
      refetchInterval: ({ state }) =>
        getMsUntilFirstPauseEnds(state.data?.rows),
    }),
  detail: (userId: string) =>
    queryOptions({
      queryKey: [...userQueryKey, userId],
      queryFn: () =>
        api.get(`/admin/users/${encodeURIComponent(userId)}`, userDetailSchema),
      refetchInterval: ({ state }) =>
        getMsUntilFirstPauseEnds(state.data && [state.data.row]),
    }),
  // The other range stays on screen until this one arrives, so the switch doesn't flash empty.
  history: (userId: string, range: ActivityRange) =>
    queryOptions({
      queryKey: [...userHistoryQueryKey, userId, range],
      queryFn: () =>
        api.get(
          `/admin/users/${encodeURIComponent(userId)}/history?range=${range}`,
          userHistorySchema,
        ),
      placeholderData: keepPreviousData,
    }),
};

/**
 * A row's value for one of the API's sort keys. A user whose window ended has no requests left, share used or reset
 * time, so sorts last either way, as the API does.
 */
export const getSortValue = (row: UserRow, sort: UsersQuery['sort']) =>
  ({
    id: row.userId,
    left: row.resetAt ? row.requestsLeft : undefined,
    resetAt: row.resetAt ?? undefined,
    ratio: row.resetAt ? 1 - row.requestsLeft / row.limit : undefined,
    lastRequest: row.lastRequestAt,
  })[sort];

const getUsed = (row: UserRow) => row.limit - row.requestsLeft;
const getWindowEnd = (row: UserRow) =>
  row.resetAt ? Date.parse(row.resetAt) : 0;

/**
 * An update is kept only when it isn't older than the row on screen: a later window, or the same window with at
 * least as many requests used. Reset times a few ms apart are the same window: `rate:limit_exceeded` carries one
 * instance's own, rows carry the record's.
 */
const isNotOlder = (incomingUserRow: UserRow, current: UserRow) => {
  const gap = getWindowEnd(incomingUserRow) - getWindowEnd(current);

  return Math.abs(gap) < sameWindowToleranceMs
    ? getUsed(incomingUserRow) >= getUsed(current)
    : gap > 0;
};

/**
 * The page with `incomingUserRow` written over the same user's row, if `shouldReplaceRow` says so, and the user moved between
 * the page's status counts. The same page when the user isn't on it or the update is older.
 */
export const applyRowToPage = (
  page: UsersPage,
  incomingUserRow: UserRow,
  shouldReplaceRow: (current: UserRow) => boolean,
): UsersPage => {
  const counts = { ...page.counts };
  let changed = false;
  const rows = page.rows.map((row) => {
    if (row.userId !== incomingUserRow.userId || !shouldReplaceRow(row))
      return row;

    counts[row.status] -= 1;
    counts[incomingUserRow.status] += 1;
    changed = true;

    return incomingUserRow;
  });

  return changed ? { ...page, rows, counts } : page;
};

/**
 * Writes a live row over the same user's row in place, on every page that shows it, and moves the user between the
 * page's status counts; the table never re-sorts from here. An admin's change (`byAdmin`) always wins, though a
 * reset row looks older: it has no window. Returns whether any page or the open user took it.
 */
// shortcut: only the users on screen send updates, so under a search or a last-active filter the counts miss status changes of users off the page until the next fetch (`applySummary` corrects the default view every second); a per-query count event fixes it if admins need it.
export const applyUserRow = (
  client: QueryClient,
  incomingUserRow: UserRow,
  byAdmin = false,
): boolean => {
  const shouldReplaceRow = (current: UserRow) =>
    byAdmin || isNotOlder(incomingUserRow, current);
  let isRowWritten = false;

  // Step 1: every cached page that shows the user.
  client.setQueriesData<UsersPage>({ queryKey: usersQueryKey }, (page) => {
    if (!page) return page;

    const updatedPage = applyRowToPage(page, incomingUserRow, shouldReplaceRow);

    // `applyRowToPage` returns the same page when the user isn't on it or the update is older.
    if (updatedPage !== page) isRowWritten = true;

    return updatedPage;
  });

  // Step 2: the open user, if it's them.
  client.setQueryData<UserDetail>(
    [...userQueryKey, incomingUserRow.userId],
    (detail) => {
      if (!detail || !shouldReplaceRow(detail.row)) return detail;

      isRowWritten = true;

      return { ...detail, row: incomingUserRow };
    },
  );

  return isRowWritten;
};

/**
 * The recent requests with the new ones merged in: a request already there (same time and outcome) counts once,
 * the list is sorted newest first, since batches from several API instances can arrive out of order, and capped.
 * The same list when nothing is new.
 */
export const mergeNewRequests = (
  recent: UserDetail['recent'],
  requests: RateUpdateEvent['requests'],
): UserDetail['recent'] => {
  const unmatchedRecent = [...recent];
  const newRequests = requests.filter(({ at, allowed }) => {
    const matchIndex = unmatchedRecent.findIndex(
      (recentRequest) =>
        recentRequest.at === at && recentRequest.allowed === allowed,
    );

    if (matchIndex === -1) return true;

    unmatchedRecent.splice(matchIndex, 1);

    return false;
  });

  if (!newRequests.length) return recent;

  // ISO times in UTC, so later is greater as text too.
  return [...newRequests, ...recent]
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, recentRequestsKept);
};

/**
 * A user's update: their row everywhere, their new requests merged into their recent requests, and their activity
 * fetched again if it's on screen. The detail may have been fetched after this batch was written, so a request it
 * already has (same time and outcome) counts once. Batches from several API instances can arrive out of order, so
 * the list is sorted again, newest first.
 */
export const applyRateUpdate = (
  client: QueryClient,
  { row, requests, byAdmin }: RateUpdateEvent,
): UserRow => {
  // Step 1: the row, everywhere it shows.
  applyUserRow(client, row, byAdmin);

  // Step 2: the new requests, into the open user's recent requests.
  client.setQueryData<UserDetail>([...userQueryKey, row.userId], (detail) => {
    if (!detail) return detail;

    const recent = mergeNewRequests(detail.recent, requests);

    return recent === detail.recent ? detail : { ...detail, recent };
  });

  // Step 3: their activity chart, fetched again if it's on screen.
  void client.invalidateQueries({
    queryKey: [...userHistoryQueryKey, row.userId],
  });

  return row;
};

/**
 * An admin's change, as its answer has it: each changed row everywhere, and the user's detail fetched again, since a
 * reset moves their last reset time too.
 */
export const applyAdminChange = (
  client: QueryClient,
  rows: UserRow[],
): UserRow[] => {
  for (const row of rows) {
    applyUserRow(client, row, true);
    void client.invalidateQueries({ queryKey: [...userQueryKey, row.userId] });
  }

  return rows;
};

/** Every users-table row in the cache, on any page. */
const getRowsOnScreen = (client: QueryClient) =>
  client
    .getQueriesData<UsersPage>({ queryKey: usersQueryKey })
    .flatMap(([, page]) => page?.rows ?? []);

/** The users whose live updates the dashboard needs: the rows of the page on screen, not of pages cached earlier, and the open user. */
export const getUserIdsOnScreen = (client: QueryClient) => [
  ...new Set([
    ...client
      .getQueriesData<UsersPage>({
        queryKey: usersQueryKey,
        type: 'active',
      })
      .flatMap(([, page]) => page?.rows.map(({ userId }) => userId) ?? []),
    ...client
      .getQueriesData<UserDetail>({ queryKey: userQueryKey, type: 'active' })
      .map(([queryKey]) => String(queryKey[userQueryKey.length])),
  ]),
];

/** The row on screen as Exceeded, from a first refusal: nothing left, and the refusal's limit, reset and time. */
export const buildExceededRow = (
  row: UserRow,
  { limit, resetAt, at }: RateLimitExceededEvent,
): UserRow => ({
  ...row,
  limit,
  used: Math.max(row.used, limit),
  requestsLeft: 0,
  resetAt,
  status: 'exceeded',
  lastRequestAt: at,
});

/**
 * A user's first refusal in a window arrives before their next `rate:update`: show them Exceeded at once. Returns
 * the row written, or `undefined` when the user isn't on screen.
 */
export const applyLimitExceeded = (
  client: QueryClient,
  event: RateLimitExceededEvent,
): UserRow | undefined => {
  const row = getRowsOnScreen(client).find(
    (candidate) => candidate.userId === event.userId,
  );

  if (!row) return undefined;

  const exceeded = buildExceededRow(row, event);

  applyUserRow(client, exceeded);

  return exceeded;
};
