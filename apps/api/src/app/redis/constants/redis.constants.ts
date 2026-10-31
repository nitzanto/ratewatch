import type { RedisOptions } from 'ioredis';

/** Injection token for the shared ioredis client; tests replace it with ioredis-mock. */
export const redisClient = Symbol('redisClient');

/**
 * Fails fast, so a down or hanging Redis costs a request at most about 50 ms and the limiter can fail open:
 * no queue while disconnected, no retries, and a bound on each reply. The connection itself keeps
 * reconnecting in the background with ioredis's default backoff.
 */
export const redisOptions: RedisOptions = {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 0,
  // shortcut: 50 ms is about 10 times the limit check's p99 target; the load test (#41) sets the final value.
  commandTimeout: 50,
  connectTimeout: 2000,
};
