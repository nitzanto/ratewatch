import type { INestApplication } from '@nestjs/common';
import { rateLimitedResponseSchema, type Role } from '@ratewatch/contracts';
import { postClick, signedInCookie, startApp } from '../../test-utils/test-app';

describe('rate limit', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeEach(async () => {
    ({ app, baseUrl } = await startApp());
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

  it('never counts sign-in, health or the Admin', async () => {
    const cookie = await signedIn();
    const health = await fetch(`${baseUrl}/health`, { headers: { cookie } });
    const admin = await click(await signedIn('admin'));

    const userClick = await click(cookie);

    expect(health.headers.get('x-count')).toBeNull();
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
  });
});
