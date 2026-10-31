import { type INestApplication, Logger } from '@nestjs/common';
import type { Server } from 'node:net';
import { createRedisClient } from '../../redis/providers/redis-client.provider';
import { uncountedLogEveryMs } from '../constants/rate-limit.constants';
import { startFakeRedis, unreachableRedis } from '../../test-utils/fake-redis';
import { postClick, signedInCookie, startApp } from '../../test-utils/test-app';

describe('rate limit when Redis is down', () => {
  let app: INestApplication;
  let baseUrl: string;
  let logError: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    ({ app, baseUrl } = await startApp([], unreachableRedis()));
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  const click = (cookie: string) => postClick(baseUrl, cookie);
  // The Redis client logs its own outage line too; these tests are about the limiter's.
  const limiterLogs = () =>
    logError.mock.calls.filter(([message]: unknown[]) =>
      /letting requests through uncounted/.test(String(message)),
    );

  it('lets a click through without x-count, and logs that it went uncounted', async () => {
    const cookie = await signedInCookie(baseUrl, 'user');

    const res = await click(cookie);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-count')).toBeNull();
    expect(limiterLogs()).toHaveLength(1);
  });

  it('keeps the health check answering, so no orchestrator takes the API out of service', async () => {
    const res = await fetch(`${baseUrl}/health`);

    expect(res.status).toBe(200);
  });

  it('logs at most once every 10 seconds', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const cookie = await signedInCookie(baseUrl, 'user');
    await click(cookie);
    await click(cookie);
    await click(cookie);

    vi.setSystemTime(Date.now() + uncountedLogEveryMs);
    await click(cookie);

    vi.useRealTimers();
    expect(limiterLogs()).toHaveLength(2);
  });
});

describe('rate limit when Redis stops answering', () => {
  let redis: Server;
  let app: INestApplication;
  let baseUrl: string;

  beforeEach(async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    let url: string;
    ({ server: redis, url } = await startFakeRedis());
    const client = createRedisClient(url);
    await new Promise((resolve) => client.once('ready', resolve));
    ({ app, baseUrl } = await startApp([], client));
  });

  afterEach(async () => {
    await app.close();
    redis.close();
    vi.restoreAllMocks();
  });

  it('lets a click through without x-count, waiting well under a second', async () => {
    const cookie = await signedInCookie(baseUrl, 'user');

    const started = Date.now();
    const res = await postClick(baseUrl, cookie);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-count')).toBeNull();
    expect(Date.now() - started).toBeLessThan(500);
  });
});
