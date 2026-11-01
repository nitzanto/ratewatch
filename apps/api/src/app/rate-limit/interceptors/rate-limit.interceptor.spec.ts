import type { INestApplication } from '@nestjs/common';
import { rateLimitedResponseSchema, type Role } from '@ratewatch/contracts';
import type Redis from 'ioredis';
import RedisMock from 'ioredis-mock';
import {
  postClick,
  signedInCookie,
  signedInUser,
  startApp,
} from '../../test-utils/test-app';
import { rateLimitKeys } from '../constants/rate-limit.constants';

describe('rate limit', () => {
  let app: INestApplication;
  let baseUrl: string;
  let redis: Redis;

  beforeEach(async () => {
    redis = new RedisMock();
    ({ app, baseUrl } = await startApp([], redis));
  });

  afterEach(() => app.close());

  const signedIn = (role: Role = 'user') => signedInCookie(baseUrl, role);
  const click = (cookie: string) => postClick(baseUrl, cookie);

  it('counts each click and reports the requests left in x-count', async () => {
    const cookie = await signedIn();

    const first = await click(cookie);
    const second = await click(cookie);

    expect(first.status).toBe(200);
    expect(first.headers.get('x-count')).toBe('99');
    expect(second.headers.get('x-count')).toBe('98');
  });

  it('counts only clicks: never sign-in, health, the session or the Admin', async () => {
    const cookie = await signedIn();
    const health = await fetch(`${baseUrl}/health`, { headers: { cookie } });
    const me = await fetch(`${baseUrl}/auth/me`, { headers: { cookie } });
    const admin = await click(await signedIn('admin'));

    const userClick = await click(cookie);

    expect(health.headers.get('x-count')).toBeNull();
    expect(me.status).toBe(200);
    expect(me.headers.get('x-count')).toBeNull();
    expect(admin.status).toBe(200);
    expect(admin.headers.get('x-count')).toBeNull();
    expect(userClick.headers.get('x-count')).toBe('99');
  });

  describe('over the limit', () => {
    const start = new Date('2026-11-02T10:00:00.000Z');

    // Only Date is faked: the HTTP server and fetch keep real timers, and ioredis-mock expires keys by Date.now().
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(start);
    });

    afterEach(() => vi.useRealTimers());

    const useAll = async (cookie: string) => {
      for (let i = 0; i < 100; i++) await click(cookie);
    };

    it('refuses with 429, a message and the time to try again: one hour after the first click', async () => {
      const cookie = await signedIn();
      await useAll(cookie);

      const refused = await click(cookie);

      expect(refused.status).toBe(429);
      expect(refused.headers.get('x-count')).toBeNull();
      expect(refused.headers.get('retry-after')).toBe('3600');
      expect(await refused.json()).toEqual({
        message: "You've used all your requests for this hour.",
        retryAt: '2026-11-02T11:00:00.000Z',
      });
    });

    it('never uses up the limit with a refusal: the count starts again one hour after the first click', async () => {
      const cookie = await signedIn();
      await useAll(cookie);
      vi.setSystemTime(new Date('2026-11-02T10:59:00.000Z'));
      const late = await click(cookie);

      vi.setSystemTime(new Date('2026-11-02T11:00:00.000Z'));
      const fresh = await click(cookie);

      expect(rateLimitedResponseSchema.parse(await late.json()).retryAt).toBe(
        '2026-11-02T11:00:00.000Z',
      );
      expect(fresh.status).toBe(200);
      expect(fresh.headers.get('x-count')).toBe('99');
    });

    it('applies a custom limit in every window', async () => {
      const { userId, cookie } = await signedInUser(baseUrl);
      await redis.set(rateLimitKeys(userId)[1], 3);

      const counts: (string | null)[] = [];
      for (let i = 0; i < 3; i++)
        counts.push((await click(cookie)).headers.get('x-count'));
      const refused = await click(cookie);
      vi.setSystemTime(new Date('2026-11-02T11:00:00.000Z'));
      const nextWindow = await click(cookie);

      expect(counts).toEqual(['2', '1', '0']);
      expect(refused.status).toBe(429);
      expect(nextWindow.headers.get('x-count')).toBe('2');
    });

    it("counts a paused user's requests but refuses none, until the pause ends by itself", async () => {
      const { userId, cookie } = await signedInUser(baseUrl);
      const [windowKey, , pauseKey] = rateLimitKeys(userId);
      await useAll(cookie);
      const pauseMs = 15 * 60_000;
      await redis.set(pauseKey, start.getTime() + pauseMs, 'PX', pauseMs);

      const paused = await click(cookie);
      vi.setSystemTime(new Date(start.getTime() + pauseMs));
      const after = await click(cookie);

      expect(paused.status).toBe(200);
      expect(paused.headers.get('x-count')).toBe('0');
      expect(await redis.hget(windowKey, 'count')).toBe('101');
      expect(after.status).toBe(429);
      expect(rateLimitedResponseSchema.parse(await after.json()).retryAt).toBe(
        '2026-11-02T11:00:00.000Z',
      );
    });
  });
});
