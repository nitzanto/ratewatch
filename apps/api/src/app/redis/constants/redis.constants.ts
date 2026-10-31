/** Injection token for the shared ioredis client; tests replace it with ioredis-mock. */
export const redisClient = Symbol('redisClient');
