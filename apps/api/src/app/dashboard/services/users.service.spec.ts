import {
  RedisContainer,
  type StartedRedisContainer,
} from '@testcontainers/redis';
import {
  usersQuerySchema,
  type UsersPage,
  type UsersQuery,
  type UserStatus,
} from '@ratewatch/contracts';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import {
  historyKey,
  recentKey,
  refusedKey,
  userKey,
} from '../constants/dashboard.constants';
import type { Activity } from '../interfaces/activity.interface';
import type { Decision } from '../interfaces/decision.interface';
import { UsersService } from './users.service';

/** A user's activity of one request: `latest`. */
const activityOf = (latest: Decision): Activity => ({
  latest,
  requests: [{ at: latest.at, allowed: latest.allowed }],
  counts: new Map([
    [`${latest.allowed ? 'a' : 'r'}:${Math.floor(latest.at / 60_000)}`, 1],
  ]),
});

// A real Redis: the record script uses hash field expiry, which ioredis-mock doesn't have. Same image as compose.yaml.
describe('UsersService.record', () => {
  let container: StartedRedisContainer;
  let redis: Redis;
  let users: UsersService;

  beforeAll(async () => {
    container = await new RedisContainer('redis:8.10-alpine').start();
    redis = new Redis(container.getConnectionUrl());
    users = new UsersService(redis);
  }, 120_000);

  afterAll(async () => {
    await users?.close();
    await redis?.quit();
    await container?.stop();
  });

  const minuteMs = 60_000;

  /** One instance's latest decision for `userId`: `used` of 100 requests, the window ending at `resetAt`. */
  const decision = (
    userId: string,
    used: number,
    resetAt: number,
  ): Decision => ({
    userId,
    allowed: true,
    at: Date.now(),
    limit: 100,
    used,
    resetAt,
    firstRefusal: false,
  });

  const recorded = async (next: Decision) => {
    const [row] = await users.record([activityOf(next)]);
    if (row instanceof Error) throw row;
    return row;
  };

  it("keeps the newer numbers when another instance's older batch arrives late, and that window's first reset time", async () => {
    const userId = `user-${randomUUID()}`;
    const resetAt = Date.now() + 30 * minuteMs;

    await recorded(decision(userId, 5, resetAt));
    // Same window, seen 3 s later by an instance whose clock is ahead.
    const row = await recorded(decision(userId, 3, resetAt + 3000));

    expect(row).toMatchObject({
      requestsLeft: 95,
      resetAt: new Date(resetAt).toISOString(),
    });
  });

  it('moves to a later window, then ignores a late batch from the window before it', async () => {
    const userId = `user-${randomUUID()}`;
    const firstEnd = Date.now() + 30 * minuteMs;
    const secondEnd = firstEnd + 60 * minuteMs;

    await recorded(decision(userId, 80, firstEnd));
    await recorded(decision(userId, 1, secondEnd));
    const row = await recorded(decision(userId, 90, firstEnd));

    expect(row).toMatchObject({
      requestsLeft: 99,
      resetAt: new Date(secondEnd).toISOString(),
    });
  });

  it('reads a window that has ended as a full limit, with no reset time', async () => {
    const userId = `user-${randomUUID()}`;

    const row = await recorded(decision(userId, 100, Date.now() - 1000));

    expect(row).toMatchObject({
      limit: 100,
      requestsLeft: 100,
      resetAt: null,
      status: 'ok',
    });
  });
});

describe('UsersService.list', () => {
  let container: StartedRedisContainer;
  let redis: Redis;
  let users: UsersService;

  beforeAll(async () => {
    container = await new RedisContainer('redis:8.10-alpine').start();
    redis = new Redis(container.getConnectionUrl());
    users = new UsersService(redis);
  }, 120_000);

  afterAll(async () => {
    await users?.close();
    await redis?.quit();
    await container?.stop();
  });

  const minuteMs = 60_000;
  const query = (overrides: Partial<UsersQuery> = {}) =>
    usersQuerySchema.parse(overrides);
  const userIds = (page: UsersPage) => page.rows.map(({ userId }) => userId);
  /** A prefix of its own per test, so a search for it finds only that test's users. */
  const newPrefix = () => `t${randomUUID().slice(0, 8)}`;

  /** Records `used` of 100 requests for `userId`, last seen `idleMs` ago, the window ending in `resetInMs` (ended when negative). */
  const record = async (
    userId: string,
    used: number,
    { idleMs = 0, resetInMs = 30 * minuteMs } = {},
  ) => {
    const now = Date.now();
    const [row] = await users.record([
      activityOf({
        userId,
        allowed: true,
        at: now - idleMs,
        limit: 100,
        used,
        resetAt: now + resetInMs,
        firstRefusal: false,
      }),
    ]);
    if (row instanceof Error) throw row;
  };

  it('creates the index again when Redis has lost it', async () => {
    await users.list(query());
    await redis.flushall();

    await expect(users.list(query())).resolves.toMatchObject({
      rows: [],
      total: 0,
    });
  });

  it('finds users by a prefix of their ID or the whole ID, never reading the search as query syntax', async () => {
    const prefix = newPrefix();
    await record(`${prefix}-one`, 1);
    await record(`${prefix}-two`, 2);
    await record(`${prefix}x-three`, 3);

    expect(
      userIds(
        await users.list(query({ q: `${prefix}-`, sort: 'id', order: 'asc' })),
      ),
    ).toEqual([`${prefix}-one`, `${prefix}-two`]);
    expect(userIds(await users.list(query({ q: `${prefix}-two` })))).toEqual([
      `${prefix}-two`,
    ]);
    await expect(
      users.list(query({ q: `${prefix}} | @id:{*` })),
    ).resolves.toMatchObject({ total: 0 });
  });

  it('filters by status, and counts each status under the same search', async () => {
    const prefix = newPrefix();
    await record(`${prefix}-ok`, 10);
    await record(`${prefix}-warning`, 95);
    await record(`${prefix}-exceeded`, 100);
    await record(`${prefix}-ended`, 100, { resetInMs: -1000 });
    await record(`${prefix}-paused`, 100);
    await redis.hset(
      userKey(`${prefix}-paused`),
      'pausedUntil',
      Date.now() + 15 * minuteMs,
    );

    const withStatus = async (status: UserStatus) =>
      userIds(
        await users.list(
          query({ q: prefix, status, sort: 'id', order: 'asc' }),
        ),
      );
    expect(await withStatus('ok')).toEqual([`${prefix}-ended`, `${prefix}-ok`]);
    expect(await withStatus('warning')).toEqual([`${prefix}-warning`]);
    expect(await withStatus('exceeded')).toEqual([`${prefix}-exceeded`]);
    expect(await withStatus('paused')).toEqual([`${prefix}-paused`]);
    expect(
      (await users.list(query({ q: prefix, status: 'ok' }))).counts,
    ).toEqual({ ok: 2, warning: 1, exceeded: 1, paused: 1 });
  });

  it('filters by last active time', async () => {
    const prefix = newPrefix();
    await record(`${prefix}-now`, 1);
    await record(`${prefix}-earlier`, 1, { idleMs: 30 * minuteMs });

    const activeWithin = async (within: UsersQuery['activeWithin']) =>
      (await users.list(query({ q: prefix, activeWithin: within }))).total;
    expect(await activeWithin('15m')).toBe(1);
    expect(await activeWithin('1h')).toBe(2);
  });

  it('answers the page asked for, with the total of every match', async () => {
    const prefix = newPrefix();
    const now = Date.now();
    await users.record(
      Array.from({ length: 26 }, (_, i) =>
        activityOf({
          userId: `${prefix}-${String(i).padStart(2, '0')}`,
          allowed: true,
          at: now,
          limit: 100,
          used: 1,
          resetAt: now + 30 * minuteMs,
          firstRefusal: false,
        }),
      ),
    );

    const page = await users.list(
      query({ q: prefix, sort: 'id', order: 'asc', page: 1 }),
    );

    expect(userIds(page)).toEqual([`${prefix}-25`]);
    expect(page.total).toBe(26);
  });

  describe('sorting', () => {
    const prefix = newPrefix();
    const [a, b, ended] = ['a', 'b', 'c'].map((name) => `${prefix}-${name}`);

    beforeAll(async () => {
      await record(a, 10, { idleMs: 3 * minuteMs, resetInMs: 50 * minuteMs });
      await record(b, 60, { idleMs: 2 * minuteMs, resetInMs: 20 * minuteMs });
      await record(ended, 100, { idleMs: minuteMs, resetInMs: -1000 });
    });

    // A user whose window ended has no requests left, share used or reset time to sort by, so goes last either way.
    it.each<[UsersQuery['sort'], UsersQuery['order'], string[]]>([
      ['id', 'asc', [a, b, ended]],
      ['id', 'desc', [ended, b, a]],
      ['left', 'asc', [b, a, ended]],
      ['left', 'desc', [a, b, ended]],
      ['ratio', 'asc', [a, b, ended]],
      ['ratio', 'desc', [b, a, ended]],
      ['resetAt', 'asc', [b, a, ended]],
      ['resetAt', 'desc', [a, b, ended]],
      ['lastRequest', 'asc', [a, b, ended]],
      ['lastRequest', 'desc', [ended, b, a]],
    ])('sorts by %s %s', async (sort, order, expected) => {
      expect(
        userIds(await users.list(query({ q: prefix, sort, order }))),
      ).toEqual(expected);
    });
  });
});

// A container of its own: the summary covers every user in Redis.
describe('UsersService.summary', () => {
  let container: StartedRedisContainer;
  let redis: Redis;
  let users: UsersService;

  beforeAll(async () => {
    container = await new RedisContainer('redis:8.10-alpine').start();
    redis = new Redis(container.getConnectionUrl());
    users = new UsersService(redis);
  }, 120_000);

  afterAll(async () => {
    await users?.close();
    await redis?.quit();
    await container?.stop();
  });

  const minuteMs = 60_000;

  /** Records `used` of 100 requests for `userId`, the last of them `refused` ones, at `at`, the window ending in `resetInMs`. */
  const record = async (
    userId: string,
    used: number,
    { refused = 0, at = Date.now(), resetInMs = 30 * minuteMs } = {},
  ) => {
    const minute = Math.floor(at / minuteMs);
    const [row] = await users.record([
      {
        latest: {
          userId,
          allowed: !refused,
          at,
          limit: 100,
          used,
          resetAt: Date.now() + resetInMs,
          firstRefusal: false,
        },
        requests: [{ at, allowed: !refused }],
        counts: new Map([[`${refused ? 'r' : 'a'}:${minute}`, refused || 1]]),
      },
    ]);
    if (row instanceof Error) throw row;
  };

  it('answers zeros before any request', async () => {
    await expect(users.summary()).resolves.toEqual({
      totalUsers: 0,
      nearLimitShare: 0,
      refusedToday: 0,
      counts: { ok: 0, warning: 0, exceeded: 0, paused: 0 },
      topUsers: [],
    });
  });

  it("counts the users, the share near the limit, today's refusals and the top users", async () => {
    const startOfToday =
      Math.floor(Date.now() / (24 * 60 * minuteMs)) * 24 * 60 * minuteMs;
    await record('user-ok', 10);
    await record('user-warning', 95);
    await record('user-exceeded', 100, { refused: 3 });
    // Refused just before midnight UTC: yesterday's, not today's.
    await record('user-yesterday', 100, {
      refused: 4,
      at: startOfToday - 1000,
    });
    await record('user-ended', 100, { resetInMs: -1000 });
    await record('user-paused', 100);
    await redis.hset(
      userKey('user-paused'),
      'pausedUntil',
      Date.now() + 15 * minuteMs,
    );
    for (let i = 0; i < 6; i++) await record(`user-light-${i}`, 1);

    const summary = await users.summary();

    expect(summary).toMatchObject({
      totalUsers: 12,
      counts: { ok: 8, warning: 1, exceeded: 2, paused: 1 },
      nearLimitShare: 3 / 12,
      refusedToday: 3,
    });
    // Most requests in the current window first; the user whose window ended has none. The three at 100 tie.
    expect(
      summary.topUsers
        .slice(0, 3)
        .map(({ userId }) => userId)
        .sort(),
    ).toEqual(['user-exceeded', 'user-paused', 'user-yesterday']);
    expect(summary.topUsers.slice(3)).toEqual([
      { userId: 'user-warning', used: 95, limit: 100 },
      { userId: 'user-ok', used: 10, limit: 100 },
    ]);
  });

  it('keeps a day of refusals until the end of the next UTC day', async () => {
    await record('user-refused', 100, { refused: 1 });

    const day = new Date().toISOString().slice(0, 10);
    const expiresAt = (await redis.call(
      'EXPIRETIME',
      refusedKey(day),
    )) as number;
    expect(expiresAt).toBe(Date.parse(day) / 1000 + 2 * 24 * 60 * 60);
  });
});

describe('UsersService.detail and history', () => {
  let container: StartedRedisContainer;
  let redis: Redis;
  let users: UsersService;

  beforeAll(async () => {
    container = await new RedisContainer('redis:8.10-alpine').start();
    redis = new Redis(container.getConnectionUrl());
    users = new UsersService(redis);
  }, 120_000);

  afterAll(async () => {
    await users?.close();
    await redis?.quit();
    await container?.stop();
  });

  const minuteMs = 60_000;

  /** Records one second's `requests` for `userId` (newest first), `used` of 100 in a window ending at `resetAt`. */
  const record = async (
    userId: string,
    requests: { at: number; allowed: boolean }[],
    { used = 1, resetAt = Date.now() + 30 * minuteMs } = {},
  ) => {
    const counts = new Map<string, number>();
    for (const { at, allowed } of requests) {
      const field = `${allowed ? 'a' : 'r'}:${Math.floor(at / minuteMs)}`;
      counts.set(field, (counts.get(field) ?? 0) + 1);
    }
    const [{ at, allowed }] = requests;
    const [row] = await users.record([
      {
        latest: {
          userId,
          allowed,
          at,
          limit: 100,
          used,
          resetAt,
          firstRefusal: false,
        },
        requests,
        counts,
      },
    ]);
    if (row instanceof Error) throw row;
  };

  it("answers a user's row and their last 50 requests, newest first", async () => {
    const userId = `user-${randomUUID()}`;
    const start = Date.now() - 10_000;
    const at = (i: number) => start + i * 100;
    await record(
      userId,
      Array.from({ length: 30 }, (_, i) => ({ at: at(29 - i), allowed: true })),
      { used: 30 },
    );
    await record(
      userId,
      Array.from({ length: 30 }, (_, i) => ({
        at: at(59 - i),
        allowed: false,
      })),
      { used: 30 },
    );

    const detail = await users.detail(userId);

    expect(detail?.row).toMatchObject({ userId, requestsLeft: 70 });
    expect(detail?.lastResetAt).toBeNull();
    expect(detail?.recent).toHaveLength(50);
    expect(detail?.recent[0]).toEqual({
      at: new Date(at(59)).toISOString(),
      allowed: false,
    });
    expect(detail?.recent[49]).toEqual({
      at: new Date(at(10)).toISOString(),
      allowed: true,
    });
  });

  it('answers when the count last went back to zero: the end of the last window', async () => {
    const userId = `user-${randomUUID()}`;
    const firstEnd = Date.now() - 1000;

    await record(userId, [{ at: firstEnd - 5 * minuteMs, allowed: true }], {
      resetAt: firstEnd,
    });
    expect((await users.detail(userId))?.lastResetAt).toBe(
      new Date(firstEnd).toISOString(),
    );

    await record(userId, [{ at: Date.now(), allowed: true }], {
      resetAt: Date.now() + 60 * minuteMs,
    });
    expect((await users.detail(userId))?.lastResetAt).toBe(
      new Date(firstEnd).toISOString(),
    );
  });

  it('answers nothing for a user without a record', async () => {
    await expect(users.detail(`user-${randomUUID()}`)).resolves.toBeNull();
  });

  it('counts accepted and refused requests per minute over the past hour, and per 15 minutes over the past day', async () => {
    const userId = `user-${randomUUID()}`;
    const now = Date.now();
    const quarterMs = 15 * minuteMs;
    await record(userId, [
      { at: now, allowed: false },
      { at: now, allowed: true },
      { at: now - 2 * minuteMs, allowed: true },
      { at: now - 3 * 60 * minuteMs, allowed: true },
    ]);

    const hour = (await users.history(userId, 'hour')).buckets;
    expect(hour).toHaveLength(60);
    expect(hour[0].start).toBe(
      new Date((Math.floor(now / minuteMs) - 59) * minuteMs).toISOString(),
    );
    expect(hour[59]).toMatchObject({ accepted: 1, refused: 1 });
    expect(hour[57]).toMatchObject({ accepted: 1, refused: 0 });
    expect(hour.reduce((sum, { accepted }) => sum + accepted, 0)).toBe(2);

    const day = (await users.history(userId, 'day')).buckets;
    expect(day).toHaveLength(96);
    expect(day[95].start).toBe(
      new Date(Math.floor(now / quarterMs) * quarterMs).toISOString(),
    );
    expect(day[95].refused).toBe(1);
    expect(day[83].accepted).toBe(1);
    expect(day.reduce((sum, { accepted }) => sum + accepted, 0)).toBe(3);
  });

  it('keeps recent requests and history for 24 hours', async () => {
    const userId = `user-${randomUUID()}`;
    const now = Date.now();
    await record(userId, [{ at: now, allowed: true }]);

    const day = 24 * 60 * 60;
    expect(await redis.ttl(recentKey(userId))).toBeGreaterThan(day - 10);
    const [fieldTtl] = (await redis.call(
      'HTTL',
      historyKey(userId),
      'FIELDS',
      1,
      `a:${Math.floor(now / minuteMs)}`,
    )) as number[];
    expect(fieldTtl).toBeGreaterThan(day - 10);
    expect(fieldTtl).toBeLessThanOrEqual(day);
  });
});
