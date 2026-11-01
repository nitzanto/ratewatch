import type { INestApplication, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { type Role, sessionSchema } from '@ratewatch/contracts';
import cookieParser from 'cookie-parser';
import type Redis from 'ioredis';
import RedisMock from 'ioredis-mock';
import { AppModule } from '../app.module';
import { RedisIoAdapter } from '../dashboard/adapters/redis-io.adapter';
import type { Env } from '../env';
import {
  burstLimit,
  defaultBurstLimit,
} from '../rate-limit/constants/rate-limit.constants';
import type { BurstLimit } from '../rate-limit/interfaces/burst-limit.interface';
import { redisClient } from '../redis/constants/redis.constants';

/** For specs that click in bulk on purpose to test something else: a bucket no test can empty. */
export const noBurstLimit: BurstLimit = {
  capacity: 1_000_000,
  refillPerSecond: 1_000_000,
};

/**
 * Starts the whole API on a free port with `main.ts`'s setup (keep the two in step), plus any test-only
 * controllers. Redis is ioredis-mock unless a test passes a real client. Socket.IO's Redis adapter needs sharded
 * pub/sub, which ioredis-mock lacks, so with the mock Socket.IO stays on one instance's in-memory adapter.
 */
export const startApp = async (
  controllers: Type[] = [],
  redis: Redis = new RedisMock(),
  burst: BurstLimit = defaultBurstLimit,
) => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers,
  })
    .overrideProvider(redisClient)
    .useValue(redis)
    .overrideProvider(burstLimit)
    .useValue(burst)
    .compile();
  const app: INestApplication = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.use(
    cookieParser(
      app.get(ConfigService<Env, true>).get('SESSION_SECRET', { infer: true }),
    ),
  );
  if (!(redis instanceof RedisMock))
    app.useWebSocketAdapter(new RedisIoAdapter(app));
  await app.listen(0);
  return { app, baseUrl: `${await app.getUrl()}/api` };
};

/** Signs in through the real endpoint. `role` is a string so tests can send invalid ones. */
export const signIn = (baseUrl: string, role: Role | string | undefined) =>
  fetch(`${baseUrl}/auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });

/** The `name=value` part of the session cookie a response set, as a browser would send it back. */
export const cookieOf = (res: Response) =>
  res.headers.getSetCookie()[0].split(';')[0];

/** Signs in through the real endpoint and returns the session cookie to send back. */
export const signedInCookie = async (baseUrl: string, role: Role) =>
  cookieOf(await signIn(baseUrl, role));

/** Signs in a new User and returns their user ID with the cookie, without a request the limiter would count. */
export const signedInUser = async (baseUrl: string) => {
  const res = await signIn(baseUrl, 'user');
  const { userId } = sessionSchema.parse(await res.json());
  return { userId, cookie: cookieOf(res) };
};

/** One cookie-clicker click, as the signed-in person the cookie belongs to. */
export const postClick = (baseUrl: string, cookie: string) =>
  fetch(`${baseUrl}/clicks`, { method: 'POST', headers: { cookie } });
