/**
 * Shared by the admin-control scripts. KEYS: the limiter's window, custom limit and pause, then the user's record;
 * all carry the `{userId}` hash tag, so one script changes the limiter and the record together.
 *
 * `sync` writes the record's window from the limiter's keys, as the next batch would, so the change shows at once;
 * it returns the record, or nothing for a user without one.
 */
const controlPrelude = `
local function sync(defaultLimit)
  if redis.call('HEXISTS', KEYS[4], 'id') == 0 then
    return {}
  end
  local resetAt = redis.call('PEXPIRETIME', KEYS[1])
  if resetAt < 0 then
    redis.call('HDEL', KEYS[4], 'limit', 'used', 'left', 'ratio', 'resetAt')
  else
    local used = tonumber(redis.call('HGET', KEYS[1], 'count') or '0')
    local limit = tonumber(redis.call('GET', KEYS[2]) or defaultLimit)
      + tonumber(redis.call('HGET', KEYS[1], 'extra') or '0')
    redis.call('HSET', KEYS[4], 'limit', limit, 'used', used, 'left', math.max(limit - used, 0),
      'ratio', used / limit, 'resetAt', resetAt, 'windowEnd', resetAt)
    redis.call('HPEXPIREAT', KEYS[4], resetAt, 'FIELDS', 5, 'limit', 'used', 'left', 'ratio', 'resetAt')
  end
  return redis.call('HGETALL', KEYS[4])
end
`;

/**
 * Reset limit: ends the window, so the count is zero and the next request opens a new one. The record's window ends
 * now, so a batch from before the reset can't bring the old count back.
 * ARGV: now, default limit. Returns the record.
 */
export const resetLimitScript = `${controlPrelude}
redis.call('DEL', KEYS[1])
if redis.call('HEXISTS', KEYS[4], 'id') == 1 then
  redis.call('HSET', KEYS[4], 'windowEnd', ARGV[1], 'lastResetAt', ARGV[1])
end
return sync(ARGV[2])
`;

/**
 * Extra requests: adds `amount` to the current window's limit. Fails with NO_WINDOW without an open window, and with
 * OVER_MAX_LIMIT when the limit would pass the most allowed.
 * ARGV: amount, most allowed limit, default limit. Returns the record.
 */
export const addExtraRequestsScript = `${controlPrelude}
if redis.call('EXISTS', KEYS[1]) == 0 then
  return redis.error_reply('NO_WINDOW')
end
local limit = tonumber(redis.call('GET', KEYS[2]) or ARGV[3])
  + tonumber(redis.call('HGET', KEYS[1], 'extra') or '0')
if limit + tonumber(ARGV[1]) > tonumber(ARGV[2]) then
  return redis.error_reply('OVER_MAX_LIMIT')
end
redis.call('HINCRBY', KEYS[1], 'extra', ARGV[1])
-- The user's next refusal in this window is a new one, announced to admins again.
redis.call('HDEL', KEYS[1], 'notified')
return sync(ARGV[3])
`;
