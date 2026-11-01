import type { BurstLimit } from '../interfaces/burst-limit.interface';

/** A window lasts one hour from the user's first request. */
export const windowMs = 60 * 60 * 1000;

/** Injection token for the burst limit, so tests that click in bulk on purpose can lift it. */
export const burstLimit = Symbol('burstLimit');

/**
 * Faster than a person clicks for long, slower than a script: a person can still reach the hourly limit in about
 * 20 seconds, while 100 requests sent at once spend only 20 of the hour's requests.
 */
export const defaultBurstLimit: BurstLimit = {
  capacity: 20,
  refillPerSecond: 5,
};

/** While Redis is down, the limiter logs that it's letting requests through uncounted at most this often. */
export const uncountedLogEveryMs = 10_000;

/** The user's keys share the `{userId}` hash tag, so Redis Cluster keeps them on one shard for the script. */
export const rateLimitKeys = (userId: string) =>
  [
    `rl:{${userId}}:window`,
    `rl:{${userId}}:limit`,
    `rl:{${userId}}:pause`,
  ] as const;

/**
 * Checks and counts one request as a single atomic step, so two requests can never both take the last one.
 * Two limits, both of which must have room: the hourly window, then the burst limit's token bucket, kept in the
 * window's hash (`tokens`, `tokensAt`), so a new window or an admin reset starts with a full bucket.
 * KEYS: window, custom limit, pause. ARGV: default limit, window length in ms, now (ms), bucket capacity, tokens
 * per ms.
 * Returns [allowed, requestsLeft, msUntilReset, limit, count, firstRefusal, msUntilToken]; `msUntilToken` is above
 * 0 only for a burst refusal.
 * Avoids HMGET, cjson and TIME: ioredis-mock, which the unit tests run it on, gets them wrong.
 */
export const rateLimitScript = `
local count = tonumber(redis.call('HGET', KEYS[1], 'count') or '0')
local extra = tonumber(redis.call('HGET', KEYS[1], 'extra') or '0')
local limit = tonumber(redis.call('GET', KEYS[2]) or ARGV[1]) + extra
local paused = redis.call('EXISTS', KEYS[3]) == 1

if count >= limit and not paused then
  -- Refused: nothing counted, so a refusal never uses up the limit.
  local first = redis.call('HSETNX', KEYS[1], 'notified', 1)
  return {0, 0, redis.call('PTTL', KEYS[1]), limit, count, first, 0}
end

-- A pause suspends the burst limit too.
if not paused then
  local now = tonumber(ARGV[3])
  local capacity = tonumber(ARGV[4])
  local perMs = tonumber(ARGV[5])
  local tokens = tonumber(redis.call('HGET', KEYS[1], 'tokens') or capacity)
  local tokensAt = tonumber(redis.call('HGET', KEYS[1], 'tokensAt') or now)
  -- Never negative: another API instance's clock may be a little ahead of this one's.
  tokens = math.min(capacity, tokens + math.max(now - tokensAt, 0) * perMs)
  if tokens < 1 then
    -- Refused: nothing written, so the bucket keeps refilling from its last spend.
    return {0, math.max(limit - count, 0), redis.call('PTTL', KEYS[1]), limit, count, 0,
      math.ceil((1 - tokens) / perMs)}
  end
  redis.call('HSET', KEYS[1], 'tokens', tokens - 1, 'tokensAt', now)
end

count = redis.call('HINCRBY', KEYS[1], 'count', 1)
-- The expiry is set once, when the window opens; setting it on every request would push the reset back forever.
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[2])
end
return {1, math.max(limit - count, 0), redis.call('PTTL', KEYS[1]), limit, count, 0, 0}
`;
