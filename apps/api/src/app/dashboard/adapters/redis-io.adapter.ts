import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createShardedAdapter } from '@socket.io/redis-adapter';
import type Redis from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';
import { redisClient } from '../../redis/constants/redis.constants';

/**
 * Socket.IO with the sharded Redis adapter, so an event sent on one API instance reaches admins on all of them.
 * Publishing shares the API's fail-fast client (the adapter drops a failed publish). Subscribing needs its own
 * connection, which queues while Redis is down and resubscribes when it's back.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly redis: Redis;
  private subscriber?: Redis;

  constructor(app: INestApplicationContext) {
    super(app);
    this.redis = app.get<Redis>(redisClient);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const subscriber = this.redis.duplicate({
      enableOfflineQueue: true,
      maxRetriesPerRequest: null,
      commandTimeout: undefined,
    });
    // The shared client already logs the outage once; this one would log every reconnect attempt.
    subscriber.on('error', () => undefined);
    // The adapter never handles these replies. Queued while Redis is down, they fail only when the connection
    // closes for good at shutdown, which would otherwise be an unhandled rejection.
    const { ssubscribe, sunsubscribe } = subscriber;
    subscriber.ssubscribe = ((...channels: string[]) =>
      ssubscribe
        .apply(subscriber, channels)
        .catch(() => 0)) as typeof ssubscribe;
    subscriber.sunsubscribe = ((...channels: string[]) =>
      sunsubscribe
        .apply(subscriber, channels)
        .catch(() => 0)) as typeof sunsubscribe;
    this.subscriber = subscriber;
    return super.createIOServer(port, {
      ...options,
      adapter: createShardedAdapter(this.redis, subscriber),
    });
  }

  override async close(server: Server): Promise<void> {
    await super.close(server);
    // No replies to wait for, and QUIT would wait in the offline queue forever while Redis is down.
    this.subscriber?.disconnect();
  }
}
