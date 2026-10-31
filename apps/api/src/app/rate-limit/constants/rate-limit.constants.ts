/** A window lasts one hour from the user's first request. */
export const windowMs = 60 * 60 * 1000;

/** The user's keys share the `{userId}` hash tag, so Redis Cluster keeps them on one shard for the script. */
export const rateLimitKeys = (userId: string) =>
  [
    `rl:{${userId}}:window`,
    `rl:{${userId}}:limit`,
    `rl:{${userId}}:pause`,
  ] as const;

/**
 * Checks and counts one request as a single atomic step, so two requests can never both take the last one.
 * KEYS: window, custom limit, pause. ARGV: default limit, window length in ms.
 * Returns [allowed, requestsLeft, msUntilReset, limit, count, firstRefusal].
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
  return {0, 0, redis.call('PTTL', KEYS[1]), limit, count, first}
end

count = redis.call('HINCRBY', KEYS[1], 'count', 1)
-- The expiry is set once, when the window opens; setting it on every request would push the reset back forever.
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[2])
end
return {1, math.max(limit - count, 0), redis.call('PTTL', KEYS[1]), limit, count, 0}
`;
