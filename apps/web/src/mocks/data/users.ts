import { sortValueOf } from '@/libs/api/admin-users-queries';
import {
  activeWithinMs,
  defaultHourlyLimit,
  usersQuerySchema,
  warningThreshold,
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
    requestsLeft: Math.max(limit - used, 0),
    resetAt: new Date(now + 40 * minuteMs - idleMs).toISOString(),
    status: statusFor(used, limit),
    lastRequestAt: new Date(now - idleMs).toISOString(),
    pausedUntil: null,
    ...overrides,
  };
};

/** The row after one more allowed request at `at`: a window opens if none is, and the status follows the share used. */
export const afterRequest = (row: UserRow, at: string): UserRow => {
  const requestsLeft = Math.max(row.requestsLeft - 1, 0);
  return {
    ...row,
    requestsLeft,
    resetAt:
      row.resetAt ?? new Date(Date.parse(at) + 60 * minuteMs).toISOString(),
    status:
      row.status === 'paused'
        ? 'paused'
        : statusFor(row.limit - requestsLeft, row.limit),
    lastRequestAt: at,
  };
};

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
  userRow('user-72f4c6a9', 0, 70 * minuteMs, {
    requestsLeft: defaultHourlyLimit,
    resetAt: null,
  }),
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
