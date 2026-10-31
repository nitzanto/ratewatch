import type { INestApplication } from '@nestjs/common';
import {
  RedisContainer,
  type StartedRedisContainer,
} from '@testcontainers/redis';
import Redis from 'ioredis';
import { cookieOf, signIn, startApp } from '../../test-app';

// A real Redis, because ioredis-mock can't prove the script is atomic. Same image as compose.yaml.
describe('rate limit under concurrent requests', () => {
  let container: StartedRedisContainer;
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    container = await new RedisContainer('redis:8.10-alpine').start();
    ({ app, baseUrl } = await startApp(
      [],
      new Redis(container.getConnectionUrl()),
    ));
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  it('lets exactly 100 of 150 simultaneous clicks through', async () => {
    const cookie = cookieOf(await signIn(baseUrl, 'user'));

    const responses = await Promise.all(
      Array.from({ length: 150 }, () =>
        fetch(`${baseUrl}/clicks`, { method: 'POST', headers: { cookie } }),
      ),
    );

    const statuses = responses.map((res) => res.status);
    expect(statuses.filter((status) => status === 200)).toHaveLength(100);
    expect(statuses.filter((status) => status === 429)).toHaveLength(50);
  });
});
