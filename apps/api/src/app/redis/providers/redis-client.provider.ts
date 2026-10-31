import { Logger, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Env } from '../../env';
import { redisClient, redisOptions } from '../constants/redis.constants';

/**
 * A client with the API's fail-fast options; tests use it too, to point the real options at a fake Redis.
 * Logs once when the connection fails and once when it's back, so an outage or a wrong `REDIS_URL` shows
 * even with no traffic. ioredis emits an error on every reconnect attempt; the rest are dropped.
 */
export const createRedisClient = (url: string) => {
  const logger = new Logger('Redis');
  let down = false;
  return new Redis(url, redisOptions)
    .on('error', (error: Error) => {
      if (down) return;
      down = true;
      logger.error(`Redis unavailable: ${error.message}`);
    })
    .on('ready', () => {
      if (!down) return;
      down = false;
      logger.log('Redis is back');
    });
};

export const redisClientProvider: Provider = {
  provide: redisClient,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>) =>
    createRedisClient(config.get('REDIS_URL', { infer: true })),
};
