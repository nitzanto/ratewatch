import {
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import type Redis from 'ioredis';
import { redisClient } from '../constants/redis.constants';
import { redisClientProvider } from '../providers/redis-client.provider';

/** The shared Redis client of each API instance. The dashboard and the Socket.IO adapter's subscriber open their own duplicates. */
@Global()
@Module({
  providers: [redisClientProvider],
  exports: [redisClient],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(redisClient) private readonly redis: Redis) {}

  // Runs after the HTTP server has closed, so QUIT lets the last replies arrive before the connection ends.
  async onApplicationShutdown() {
    // QUIT needs a live connection; with Redis down, just drop the socket.
    await this.redis.quit().catch(() => this.redis.disconnect());
  }
}
