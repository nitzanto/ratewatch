import type { INestApplication } from '@nestjs/common';
import {
  userDetailSchema,
  userHistorySchema,
  usersPageSchema,
} from '@ratewatch/contracts';
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

// A real Redis: the users table reads the query engine, which ioredis-mock doesn't have. Same image as compose.yaml.
describe('GET /api/admin/users', () => {
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

  const getUsers = (cookie: string, search = '') =>
    fetch(`${baseUrl}/admin/users?${search}`, { headers: { cookie } });

  it("lists a user who clicked, with their requests left and last request, once the second's batch is written", async () => {
    const { userId, cookie } = await signedInUser(baseUrl);
    const admin = await signedInCookie(baseUrl, 'admin');
    const before = Date.now();
    for (let i = 0; i < 3; i++) await postClick(baseUrl, cookie);

    await vi.waitFor(
      async () => {
        const page = usersPageSchema.parse(
          await (await getUsers(admin)).json(),
        );
        const row = page.rows.find((candidate) => candidate.userId === userId);
        expect(row).toMatchObject({
          userId,
          limit: 100,
          requestsLeft: 97,
          status: 'ok',
          pausedUntil: null,
        });
        expect(Date.parse(row?.lastRequestAt ?? '')).toBeGreaterThanOrEqual(
          before - 1000,
        );
        expect(Date.parse(row?.resetAt ?? '')).toBeGreaterThan(
          before + 59 * 60_000,
        );
        expect(page.counts.ok).toBeGreaterThanOrEqual(1);
      },
      { timeout: 4000, interval: 200 },
    );
  }, 10_000);

  it("counts each status the way it shows each row's status", async () => {
    const clicks = async (count: number) => {
      const user = await signedInUser(baseUrl);
      await Promise.all(
        Array.from({ length: count }, () => postClick(baseUrl, user.cookie)),
      );
      return user.userId;
    };
    const ok = await clicks(1);
    const warning = await clicks(90);
    const exceeded = await clicks(101);
    const admin = await signedInCookie(baseUrl, 'admin');

    await vi.waitFor(
      async () => {
        const { rows, counts } = usersPageSchema.parse(
          await (await getUsers(admin)).json(),
        );
        const statusOf = (userId: string) =>
          rows.find((row) => row.userId === userId)?.status;
        expect([statusOf(ok), statusOf(warning), statusOf(exceeded)]).toEqual([
          'ok',
          'warning',
          'exceeded',
        ]);
        // Every user this spec made fits on the first page, so the rows give the true counts.
        const tally = (status: string) =>
          rows.filter((row) => row.status === status).length;
        expect(counts).toEqual({
          ok: tally('ok'),
          warning: tally('warning'),
          exceeded: tally('exceeded'),
          paused: 0,
        });
      },
      { timeout: 4000, interval: 200 },
    );
  }, 10_000);

  it('answers 400 to a sort, filter or page it does not offer', async () => {
    const admin = await signedInCookie(baseUrl, 'admin');

    for (const search of ['sort=limit', 'status=suspended', 'pageSize=1000'])
      expect((await getUsers(admin, search)).status).toBe(400);
  });

  it('answers 403 to a User', async () => {
    const res = await getUsers(await signedInCookie(baseUrl, 'user'));

    expect(res.status).toBe(403);
  });

  describe(':id and its history', () => {
    const get = (cookie: string, path: string) =>
      fetch(`${baseUrl}/admin/users/${path}`, { headers: { cookie } });

    it("answers a user's row, recent requests and activity, refused ones included, once the second's batch is written", async () => {
      const { userId, cookie } = await signedInUser(baseUrl);
      const admin = await signedInCookie(baseUrl, 'admin');
      await Promise.all(
        Array.from({ length: 101 }, () => postClick(baseUrl, cookie)),
      );

      await vi.waitFor(
        async () => {
          const detail = userDetailSchema.parse(
            await (await get(admin, userId)).json(),
          );
          expect(detail.row).toMatchObject({ userId, status: 'exceeded' });
          expect(detail.lastResetAt).toBeNull();
          expect(detail.recent).toHaveLength(50);
          expect(detail.recent.filter(({ allowed }) => !allowed)).toHaveLength(
            1,
          );
        },
        { timeout: 4000, interval: 200 },
      );
      const hour = userHistorySchema.parse(
        await (await get(admin, `${userId}/history?range=hour`)).json(),
      ).buckets;
      expect(hour).toHaveLength(60);
      // The clicks may straddle a minute.
      expect(hour.slice(-2).reduce((sum, b) => sum + b.accepted, 0)).toBe(100);
      expect(hour.slice(-2).reduce((sum, b) => sum + b.refused, 0)).toBe(1);
      const day = userHistorySchema.parse(
        await (await get(admin, `${userId}/history?range=day`)).json(),
      ).buckets;
      expect(day).toHaveLength(96);
    }, 10_000);

    it('answers 404 for a user without a record', async () => {
      const admin = await signedInCookie(baseUrl, 'admin');

      expect((await get(admin, 'user-nobody')).status).toBe(404);
    });

    it('answers 400 to a range it does not offer', async () => {
      const admin = await signedInCookie(baseUrl, 'admin');

      expect((await get(admin, 'user-nobody/history?range=week')).status).toBe(
        400,
      );
    });

    it('answers 403 to a User', async () => {
      const { userId, cookie } = await signedInUser(baseUrl);

      expect((await get(cookie, userId)).status).toBe(403);
      expect((await get(cookie, `${userId}/history`)).status).toBe(403);
    });
  });
});
