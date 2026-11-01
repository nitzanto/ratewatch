import type { INestApplication } from '@nestjs/common';
import { adminSummarySchema } from '@ratewatch/contracts';
import {
  RedisContainer,
  type StartedRedisContainer,
} from '@testcontainers/redis';
import Redis from 'ioredis';
import {
  noBurstLimit,
  postClick,
  signedInCookie,
  signedInUser,
  startApp,
} from '../../test-utils/test-app';

// A real Redis of its own: the summary reads the query engine, and covers every user in Redis.
describe('GET /api/admin/summary', () => {
  let container: StartedRedisContainer;
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    container = await new RedisContainer('redis:8.10-alpine').start();
    ({ app, baseUrl } = await startApp(
      [],
      new Redis(container.getConnectionUrl()),
      // These tests click in bulk to reach a status or a refusal, not to test the burst limit.
      noBurstLimit,
    ));
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  const getSummary = (cookie: string) =>
    fetch(`${baseUrl}/admin/summary`, { headers: { cookie } });

  it("counts the users near their limit, today's refusals and the top users, once the second's batch is written", async () => {
    const clicks = async (count: number) => {
      const user = await signedInUser(baseUrl);
      await Promise.all(
        Array.from({ length: count }, () => postClick(baseUrl, user.cookie)),
      );
      return user.userId;
    };
    const ok = await clicks(1);
    const warning = await clicks(90);
    const exceeded = await clicks(102);
    const admin = await signedInCookie(baseUrl, 'admin');

    await vi.waitFor(
      async () => {
        const res = await getSummary(admin);
        expect(res.status).toBe(200);
        expect(adminSummarySchema.parse(await res.json())).toEqual({
          totalUsers: 3,
          nearLimitShare: 2 / 3,
          refusedToday: 2,
          counts: { ok: 1, warning: 1, exceeded: 1, paused: 0 },
          topUsers: [
            { userId: exceeded, used: 100, limit: 100 },
            { userId: warning, used: 90, limit: 100 },
            { userId: ok, used: 1, limit: 100 },
          ],
        });
      },
      { timeout: 4000, interval: 200 },
    );
  }, 10_000);

  it('answers 403 to a User', async () => {
    const res = await getSummary(await signedInCookie(baseUrl, 'user'));

    expect(res.status).toBe(403);
  });
});
