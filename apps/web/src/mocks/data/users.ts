import {
  defaultHourlyLimit,
  warningThreshold,
  type UserRow,
  type UserStatus,
  type UsersPage,
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

/** One page as `GET /admin/users` answers it: latest request first, with every status's count. */
export const usersPage = (rows: UserRow[]): UsersPage => ({
  rows: [...rows].sort((a, b) =>
    b.lastRequestAt.localeCompare(a.lastRequestAt),
  ),
  total: rows.length,
  counts: {
    ok: rows.filter((row) => row.status === 'ok').length,
    warning: rows.filter((row) => row.status === 'warning').length,
    exceeded: rows.filter((row) => row.status === 'exceeded').length,
    paused: rows.filter((row) => row.status === 'paused').length,
  },
});
