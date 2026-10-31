import type { INestApplication } from '@nestjs/common';
import { adminChangeSchema, userDetailSchema } from '@ratewatch/contracts';
import {
  RedisContainer,
  type StartedRedisContainer,
} from '@testcontainers/redis';
import Redis from 'ioredis';
import { RealtimeGateway } from '../gateways/realtime.gateway';
import {
  postClick,
  signedInCookie,
  signedInUser,
  startApp,
} from '../../test-utils/test-app';

// A real Redis: the controls write the user record with hash field expiry, which ioredis-mock doesn't have.
describe('admin controls', () => {
  let container: StartedRedisContainer;
  let app: INestApplication;
  let baseUrl: string;
  let admin: string;

  beforeAll(async () => {
    container = await new RedisContainer('redis:8.10-alpine').start();
    ({ app, baseUrl } = await startApp(
      [],
      new Redis(container.getConnectionUrl()),
    ));
    admin = await signedInCookie(baseUrl, 'admin');
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  const post = (path: string, body?: unknown, cookie = admin) =>
    fetch(`${baseUrl}/admin/${path}`, {
      method: 'POST',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const change = async (path: string, body?: unknown) => {
    const res = await post(path, body);
    expect(res.status).toBe(200);
    return adminChangeSchema.parse(await res.json());
  };
  const addTen = (userId: string) =>
    post(`users/${userId}/extra-requests`, { amount: 10 });
  const requestsLeftAfterClick = async (cookie: string) =>
    (await postClick(baseUrl, cookie)).headers.get('x-count');
  const detailOf = async (userId: string) =>
    userDetailSchema.parse(
      await (
        await fetch(`${baseUrl}/admin/users/${userId}`, {
          headers: { cookie: admin },
        })
      ).json(),
    );

  /** A new User who has clicked `clicks` times, once the second's batch has written their record. */
  const userWithClicks = async (clicks: number) => {
    const user = await signedInUser(baseUrl);
    await Promise.all(
      Array.from({ length: clicks }, () => postClick(baseUrl, user.cookie)),
    );
    await vi.waitFor(
      async () =>
        expect((await detailOf(user.userId)).row.requestsLeft).toBe(
          Math.max(100 - clicks, 0),
        ),
      { timeout: 4000, interval: 200 },
    );
    return user;
  };

  describe('reset limit', () => {
    it("ends the user's window: the count is zero, and the next request starts a new window", async () => {
      const { userId, cookie } = await userWithClicks(5);
      const before = Date.now();

      const { rows } = await change(`users/${userId}/reset`);

      expect(rows).toEqual([
        expect.objectContaining({
          userId,
          limit: 100,
          requestsLeft: 100,
          resetAt: null,
          status: 'ok',
        }),
      ]);
      expect(
        Date.parse((await detailOf(userId)).lastResetAt ?? ''),
      ).toBeGreaterThanOrEqual(before);
      expect(await requestsLeftAfterClick(cookie)).toBe('99');
      await vi.waitFor(
        async () => {
          const { row } = await detailOf(userId);
          expect(row.requestsLeft).toBe(99);
          expect(Date.parse(row.resetAt ?? '')).toBeGreaterThan(
            before + 59 * 60_000,
          );
        },
        { timeout: 4000, interval: 200 },
      );
    }, 15_000);

    it("lets an exceeded user's requests through again", async () => {
      const { userId, cookie } = await userWithClicks(101);

      await change(`users/${userId}/reset`);

      expect((await postClick(baseUrl, cookie)).status).toBe(200);
    }, 15_000);

    it('resets several users together, each once', async () => {
      const first = await userWithClicks(3);
      const second = await userWithClicks(7);

      const { rows } = await change('users/reset', {
        userIds: [first.userId, second.userId, first.userId],
      });

      expect(rows.map(({ userId }) => userId)).toEqual([
        first.userId,
        second.userId,
      ]);
      expect(rows.map(({ requestsLeft }) => requestsLeft)).toEqual([100, 100]);
      expect(await requestsLeftAfterClick(first.cookie)).toBe('99');
      expect(await requestsLeftAfterClick(second.cookie)).toBe('99');
    }, 15_000);

    it('answers 400 to more than 100 users, or none', async () => {
      const userIds = Array.from({ length: 101 }, (_, i) => `user-${i}`);

      expect((await post('users/reset', { userIds })).status).toBe(400);
      expect((await post('users/reset', { userIds: [] })).status).toBe(400);
    });
  });

  describe('extra requests', () => {
    it('adds 10 requests to the current window only', async () => {
      const { userId, cookie } = await userWithClicks(101);

      const { rows } = await change(`users/${userId}/extra-requests`, {
        amount: 10,
      });

      expect(rows).toEqual([
        expect.objectContaining({
          userId,
          limit: 110,
          requestsLeft: 10,
          status: 'warning',
        }),
      ]);
      expect(await requestsLeftAfterClick(cookie)).toBe('9');
      // The next window starts again from the plain limit.
      await change(`users/${userId}/reset`);
      expect(await requestsLeftAfterClick(cookie)).toBe('99');
    }, 15_000);

    it('answers 409 when the user has no open window', async () => {
      const { userId } = await signedInUser(baseUrl);

      expect((await addTen(userId)).status).toBe(409);
    });

    it('answers 422 once the limit would pass 1,000', async () => {
      const { userId } = await userWithClicks(1);
      for (let i = 0; i < 90; i++)
        expect((await addTen(userId)).status).toBe(200);

      expect((await addTen(userId)).status).toBe(422);
      expect((await detailOf(userId)).row.limit).toBe(1000);
    }, 20_000);

    it('answers 400 to any amount but 10', async () => {
      const { userId } = await userWithClicks(1);

      expect(
        (await post(`users/${userId}/extra-requests`, { amount: 20 })).status,
      ).toBe(400);
    }, 10_000);
  });

  it('sends each changed row to the admins following the user', async () => {
    const sendChange = vi.spyOn(app.get(RealtimeGateway), 'sendChange');
    const { userId } = await userWithClicks(2);

    await change(`users/${userId}/reset`);

    expect(sendChange).toHaveBeenCalledWith(
      expect.objectContaining({ userId, requestsLeft: 100 }),
    );
    sendChange.mockRestore();
  }, 10_000);

  it('answers 403 to a User', async () => {
    const { userId, cookie } = await signedInUser(baseUrl);

    for (const [path, body] of [
      [`users/${userId}/reset`, undefined],
      ['users/reset', { userIds: [userId] }],
      [`users/${userId}/extra-requests`, { amount: 10 }],
    ] as const)
      expect((await post(path, body, cookie)).status).toBe(403);
  });
});
