import {
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Env } from '../../env';
import { redisClient } from '../constants/redis.constants';

/** One Redis connection per API instance, shared by every feature. */
@Global()
@Module({
  providers: [
    {
      provide: redisClient,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new Redis(config.get('REDIS_URL', { infer: true })),
    },
  ],
  exports: [redisClient],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(redisClient) private readonly redis: Redis) {}

  // Runs after the HTTP server has closed, so QUIT lets the last replies arrive before the connection ends.
  async onApplicationShutdown() {
    await this.redis.quit();
  }
}
