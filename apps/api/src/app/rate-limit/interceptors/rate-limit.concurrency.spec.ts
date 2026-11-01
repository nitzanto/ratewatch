import type { INestApplication } from '@nestjs/common';
import {
  RedisContainer,
  type StartedRedisContainer,
} from '@testcontainers/redis';
import Redis from 'ioredis';
import {
  noBurstLimit,
  postClick,
  signedInCookie,
  startApp,
} from '../../test-utils/test-app';

// A real Redis, because ioredis-mock can't prove the script is atomic. Same image as compose.yaml.
describe('rate limit under concurrent requests', () => {
  let container: StartedRedisContainer;
  let apps: INestApplication[] = [];

  beforeAll(async () => {
    container = await new RedisContainer('redis:8.10-alpine').start();
  }, 120_000);

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps = [];
  });

  afterAll(() => container?.stop());

  const clickAtOnce = async (...args: Parameters<typeof startApp>) => {
    const { app, baseUrl } = await startApp(...args);
    apps.push(app);
    const cookie = await signedInCookie(baseUrl, 'user');
    const responses = await Promise.all(
      Array.from({ length: 150 }, () => postClick(baseUrl, cookie)),
    );
    return responses.map((res) => res.status);
  };

  it('lets exactly 20 of 150 simultaneous clicks through the burst limit', async () => {
    // The bucket refills by the API's Date.now(): frozen, so a slow machine can't earn a token mid-burst.
    vi.useFakeTimers({ toFake: ['Date'] });
    const statuses = await clickAtOnce(
      [],
      new Redis(container.getConnectionUrl()),
    ).finally(() => vi.useRealTimers());

    expect(statuses.filter((status) => status === 200)).toHaveLength(20);
    expect(statuses.filter((status) => status === 429)).toHaveLength(130);
  });

  it('lets exactly 100 of 150 simultaneous clicks through the hourly limit', async () => {
    const statuses = await clickAtOnce(
      [],
      new Redis(container.getConnectionUrl()),
      noBurstLimit,
    );

    expect(statuses.filter((status) => status === 200)).toHaveLength(100);
    expect(statuses.filter((status) => status === 429)).toHaveLength(50);
  });
});
