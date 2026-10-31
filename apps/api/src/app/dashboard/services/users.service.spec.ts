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
import { userKey } from '../constants/dashboard.constants';
import type { Decision } from '../interfaces/decision.interface';
import { UsersService } from './users.service';

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
    const [row] = await users.record([next]);
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
      {
        userId,
        allowed: true,
        at: now - idleMs,
        limit: 100,
        used,
        resetAt: now + resetInMs,
        firstRefusal: false,
      },
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
      Array.from({ length: 26 }, (_, i) => ({
        userId: `${prefix}-${String(i).padStart(2, '0')}`,
        allowed: true,
        at: now,
        limit: 100,
        used: 1,
        resetAt: now + 30 * minuteMs,
        firstRefusal: false,
      })),
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
