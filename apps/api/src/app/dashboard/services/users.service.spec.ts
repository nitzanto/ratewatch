import {
  RedisContainer,
  type StartedRedisContainer,
} from '@testcontainers/redis';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
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
