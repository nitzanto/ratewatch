import { sortValueOf } from '@/libs/api/admin-users-queries';
import {
  activeWithinMs,
  activityRanges,
  defaultHourlyLimit,
  extraRequestsAmount,
  recentRequestsKept,
  usersQuerySchema,
  warningThreshold,
  type ActivityRange,
  type RecentRequest,
  type UserDetail,
  type UserHistory,
  type UserRow,
  type UsersPage,
  type UsersQuery,
  type UserStatus,
} from '@ratewatch/contracts';

const minuteMs = 60_000;

const statusFor = (used: number, limit: number): UserStatus => {
  if (used >= limit) return 'exceeded';
  if (used >= limit * warningThreshold) return 'warning';
  return 'ok';
};

/** A user with an open window, `used` requests in, last seen `idleMs` ago; times are relative to now. */
export const userRow = (
  userId: string,
  used: number,
  idleMs: number,
  overrides: Partial<UserRow> = {},
): UserRow => {
  const now = Date.now();
  const limit = overrides.limit ?? defaultHourlyLimit;
  return {
    userId,
    limit,
    baseLimit: limit,
    used,
    requestsLeft: Math.max(limit - used, 0),
    resetAt: new Date(now + 40 * minuteMs - idleMs).toISOString(),
    status: statusFor(used, limit),
    lastRequestAt: new Date(now - idleMs).toISOString(),
    pausedUntil: null,
    ...overrides,
  };
};

/** The row with `used` of `limit`, its requests left and its status following them, as the API derives them. */
const withUsage = (row: UserRow, used: number, limit: number): UserRow => ({
  ...row,
  limit,
  used,
  requestsLeft: Math.max(limit - used, 0),
  status: row.pausedUntil ? 'paused' : statusFor(used, limit),
});

/** The row after one more allowed request at `at`: a window opens if none is, and the status follows the share used. */
export const afterRequest = (row: UserRow, at: string): UserRow => ({
  ...withUsage(row, row.used + 1, row.limit),
  resetAt:
    row.resetAt ?? new Date(Date.parse(at) + 60 * minuteMs).toISOString(),
  lastRequestAt: at,
});

/** The row after an admin's reset: no window, the plain limit (`baseLimit`, without extra requests) all left. */
export const afterReset = (row: UserRow): UserRow => ({
  ...withUsage(row, 0, row.baseLimit),
  resetAt: null,
});

/** The row after an admin sets its limit in every window; extra requests in the open window stay on top. */
export const afterLimit = (row: UserRow, baseLimit: number): UserRow => ({
  ...withUsage(row, row.used, baseLimit + row.limit - row.baseLimit),
  baseLimit,
});

/** The row after an admin pauses it until `pausedUntil`, or unlocks it with `null`. */
export const afterPause = (row: UserRow, pausedUntil: string | null) =>
  withUsage({ ...row, pausedUntil }, row.used, row.limit);

/** The row after an admin adds extra requests to its open window; they're on top of `baseLimit`, for this window only. */
export const afterExtraRequests = (row: UserRow) =>
  withUsage(row, row.used, row.limit + extraRequestsAmount);

/** The users the dashboard opens on in mock mode: every status, a custom limit and an ended window. */
export const mockUsers = (): UserRow[] => [
  userRow('user-3f9a1c2e', 59, 4_000),
  userRow('user-8b21d4f0', 93, 12_000),
  userRow('user-c47e9a13', 100, 30_000),
  userRow('user-1d6f02b8', 12, 2 * minuteMs),
  userRow('user-a90c3e57', 140, 5 * minuteMs, {
    status: 'paused',
    requestsLeft: 0,
    pausedUntil: new Date(Date.now() + 15 * minuteMs).toISOString(),
  }),
  userRow('user-5e7b8812', 230, 9 * minuteMs, { limit: 250 }),
  userRow('user-72f4c6a9', 0, 70 * minuteMs, { resetAt: null }),
];

/** `q` is the whole ID, or a prefix once it's 2 characters; case-insensitive, like the API's search. */
const matchesId = (userId: string, q: string) => {
  const [id, search] = [userId.toLowerCase(), q.toLowerCase()];
  return search.length >= 2 ? id.startsWith(search) : id === search;
};

/**
 * One page as `GET /admin/users` answers it: searched, filtered, sorted and paged like the API, with each status's
 * count under the search and last-active filter. Users without a value to sort by go last either way.
 */
export const usersPage = (
  rows: UserRow[],
  {
    q,
    status,
    activeWithin,
    sort,
    order,
    page,
    pageSize,
  }: UsersQuery = usersQuerySchema.parse({}),
): UsersPage => {
  const since = Date.now() - activeWithinMs[activeWithin];
  const matching = rows.filter(
    (row) =>
      Date.parse(row.lastRequestAt) >= since &&
      (!q || matchesId(row.userId, q)),
  );
  const direction = order === 'asc' ? 1 : -1;
  const shown = matching
    .filter((row) => !status || row.status === status)
    .sort((a, b) => {
      const [x, y] = [sortValueOf(a, sort), sortValueOf(b, sort)];
      if (x === undefined || y === undefined)
        return Number(x === undefined) - Number(y === undefined);
      return x < y ? -direction : x > y ? direction : 0;
    });
  const count = (each: UserStatus) =>
    matching.filter((row) => row.status === each).length;
  return {
    rows: shown.slice(page * pageSize, (page + 1) * pageSize),
    total: shown.length,
    counts: {
      ok: count('ok'),
      warning: count('warning'),
      exceeded: count('exceeded'),
      paused: count('paused'),
    },
  };
};

/** A user's last requests in mock mode: one every 20 s back from their last request, the newest refused once they're Exceeded. */
export const recentRequestsOf = (row: UserRow): RecentRequest[] =>
  Array.from(
    { length: Math.min(row.limit - row.requestsLeft, recentRequestsKept) },
    (_, i) => ({
      at: new Date(Date.parse(row.lastRequestAt) - i * 20_000).toISOString(),
      allowed: !(row.status === 'exceeded' && i === 0),
    }),
  );

/** `GET /admin/users/:id` for a mock user: a window that is open started 90 minutes before it ends, after the last reset. */
export const userDetail = (row: UserRow): UserDetail => ({
  row,
  lastResetAt: row.resetAt
    ? new Date(Date.parse(row.resetAt) - 90 * minuteMs).toISOString()
    : null,
  recent: recentRequestsOf(row),
});

/** `GET /admin/users/:id/history` for a mock user: their recent requests, counted per bucket. */
export const userHistory = (
  row: UserRow,
  range: ActivityRange,
): UserHistory => {
  const { buckets, bucketMs } = activityRanges[range];
  const first = Math.floor(Date.now() / bucketMs) - buckets + 1;
  const counts = Array.from({ length: buckets }, (_, i) => ({
    start: new Date((first + i) * bucketMs).toISOString(),
    accepted: 0,
    refused: 0,
  }));
  for (const { at, allowed } of recentRequestsOf(row)) {
    const bucket = counts[Math.floor(Date.parse(at) / bucketMs) - first];
    if (bucket) bucket[allowed ? 'accepted' : 'refused'] += 1;
  }
  return { buckets: counts };
};
