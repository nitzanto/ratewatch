import type { INestApplication } from '@nestjs/common';
import {
  rateLimitedResponseSchema,
  type RateLimitExceededEvent,
  rateSubscribeAckSchema,
  type RateUpdateEvent,
  realtimeEvents,
} from '@ratewatch/contracts';
import {
  RedisContainer,
  type StartedRedisContainer,
} from '@testcontainers/redis';
import Redis from 'ioredis';
import { io, type Socket } from 'socket.io-client';
import {
  postClick,
  signedInCookie,
  signedInUser,
  startApp,
} from '../../test-utils/test-app';

// A real Redis: the users' records and the Socket.IO Redis adapter need it. Same image as compose.yaml.
describe('realtime', () => {
  let container: StartedRedisContainer;
  let app: INestApplication;
  let baseUrl: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    container = await new RedisContainer('redis:8.10-alpine').start();
    ({ app, baseUrl } = await startApp(
      [],
      new Redis(container.getConnectionUrl()),
    ));
  }, 120_000);

  afterEach(() => sockets.splice(0).forEach((socket) => socket.disconnect()));

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  /** A Socket.IO client on an API instance's origin, sending `cookie` with the handshake as a browser would. */
  const connect = (cookie?: string, apiUrl = baseUrl) => {
    const socket = io(new URL(apiUrl).origin, {
      transports: ['websocket'],
      extraHeaders: cookie ? { cookie } : {},
      reconnection: false,
    });
    sockets.push(socket);
    return socket;
  };

  /** Resolves once connected, or rejects with the handshake's refusal. */
  const connected = (socket: Socket) =>
    new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });

  const adminSocket = async (apiUrl = baseUrl) => {
    const socket = connect(await signedInCookie(apiUrl, 'admin'), apiUrl);
    await connected(socket);
    return socket;
  };

  const subscribe = async (socket: Socket, userIds: string[]) =>
    rateSubscribeAckSchema.parse(
      await socket.emitWithAck(realtimeEvents.subscribe, { userIds }),
    );

  describe('handshake', () => {
    it('refuses a visitor without a session', async () => {
      await expect(connected(connect())).rejects.toThrow();
    });

    it('refuses a User', async () => {
      const { cookie } = await signedInUser(baseUrl);

      await expect(connected(connect(cookie))).rejects.toThrow();
    });

    it('accepts the Admin', async () => {
      await expect(adminSocket()).resolves.toBeTruthy();
    });
  });

  it("acknowledges rate:subscribe with the followed users' current rows", async () => {
    const { userId, cookie } = await signedInUser(baseUrl);
    await postClick(baseUrl, cookie);
    const socket = await adminSocket();

    await vi.waitFor(
      async () => {
        const { rows } = await subscribe(socket, [userId, 'user-nobody']);
        expect(rows).toEqual([
          expect.objectContaining({ userId, requestsLeft: 99 }),
        ]);
      },
      { timeout: 3000, interval: 200 },
    );
  });

  it('follows a full page of 100 users plus the open user', async () => {
    const socket = await adminSocket();
    const userIds = Array.from({ length: 101 }, (_, i) => `user-${i}`);

    await expect(subscribe(socket, userIds)).resolves.toEqual({ rows: [] });
  });

  it('refuses a rate:subscribe that follows too many users', async () => {
    const socket = await adminSocket();
    const userIds = Array.from({ length: 102 }, (_, i) => `user-${i}`);

    await expect(
      socket.timeout(1000).emitWithAck(realtimeEvents.subscribe, { userIds }),
    ).rejects.toThrow();
  });

  it("sends a followed user's rate:update at most once a second, with the latest numbers and every request", async () => {
    const { userId, cookie } = await signedInUser(baseUrl);
    const socket = await adminSocket();
    await subscribe(socket, [userId]);
    const updates: RateUpdateEvent[] = [];
    socket.on(realtimeEvents.update, (event: RateUpdateEvent) =>
      updates.push(event),
    );

    const started = Date.now();
    for (let i = 0; i < 10; i++) {
      await postClick(baseUrl, cookie);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    await vi.waitFor(() => expect(updates.at(-1)?.row.requestsLeft).toBe(90), {
      timeout: 3000,
    });
    const seconds = (Date.now() - started) / 1000;

    expect(updates.length).toBeLessThanOrEqual(Math.ceil(seconds) + 1);
    expect(updates.flatMap(({ requests }) => requests)).toHaveLength(10);
  }, 10_000);

  it('sends rate:update for every followed user who changed in the same second', async () => {
    const users = await Promise.all(
      Array.from({ length: 5 }, () => signedInUser(baseUrl)),
    );
    const socket = await adminSocket();
    await subscribe(
      socket,
      users.map(({ userId }) => userId),
    );
    const updated = new Set<string>();
    socket.on(realtimeEvents.update, (event: RateUpdateEvent) =>
      updated.add(event.row.userId),
    );

    await Promise.all(users.map(({ cookie }) => postClick(baseUrl, cookie)));

    await vi.waitFor(() => expect(updated.size).toBe(users.length), {
      timeout: 3000,
    });
  });

  it('sends rate:update to an admin on another API instance', async () => {
    const other = await startApp([], new Redis(container.getConnectionUrl()));
    try {
      const { userId, cookie } = await signedInUser(baseUrl);
      const socket = await adminSocket(other.baseUrl);
      await subscribe(socket, [userId]);
      const updates: RateUpdateEvent[] = [];
      socket.on(realtimeEvents.update, (event: RateUpdateEvent) =>
        updates.push(event),
      );

      await postClick(baseUrl, cookie);

      await vi.waitFor(
        () =>
          expect(updates.at(-1)?.row).toMatchObject({
            userId,
            requestsLeft: 99,
          }),
        { timeout: 3000 },
      );
    } finally {
      await other.app.close();
    }
  });

  it("doesn't send rate:update for a user the admin doesn't follow", async () => {
    const { cookie } = await signedInUser(baseUrl);
    const socket = await adminSocket();
    await subscribe(socket, []);
    const updates: RateUpdateEvent[] = [];
    socket.on(realtimeEvents.update, (event: RateUpdateEvent) =>
      updates.push(event),
    );

    await postClick(baseUrl, cookie);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    expect(updates).toEqual([]);
  });

  it('sends rate:limit_exceeded to every admin at once, on the first refusal in the window only', async () => {
    const { userId, cookie } = await signedInUser(baseUrl);
    await Promise.all(
      Array.from({ length: 100 }, () => postClick(baseUrl, cookie)),
    );
    const socket = await adminSocket();
    const events: RateLimitExceededEvent[] = [];
    socket.on(realtimeEvents.limitExceeded, (event: RateLimitExceededEvent) =>
      events.push(event),
    );

    const refused = await postClick(baseUrl, cookie);
    const refusedAt = Date.now();
    await vi.waitFor(() => expect(events).toHaveLength(1), { timeout: 1000 });

    expect(refused.status).toBe(429);
    // Well inside the publisher's one-second tick.
    expect(Date.now() - refusedAt).toBeLessThan(500);
    expect(events[0]).toMatchObject({ userId, limit: 100 });
    expect(events[0].resetAt).toBe(
      rateLimitedResponseSchema.parse(await refused.json()).retryAt,
    );

    await postClick(baseUrl, cookie);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(events).toHaveLength(1);
  });
});
