import { warningThreshold } from '@ratewatch/contracts';

/** The dashboard publisher writes the second's decisions to Redis, and sends their updates, this often. */
export const flushEveryMs = 1000;

/** While Redis is down, the publisher keeps at most this many users' latest numbers (about 5 KB each); the oldest go first. */
export const maxPendingUsers = 10_000;

/** Users per pipeline when the publisher writes a second's records, so no single reply waits behind thousands of scripts. */
export const recordChunkSize = 500;

/** The dashboard's Redis connection waits this long for a reply; it is never on a request's path. */
export const dashboardCommandTimeoutMs = 1000;

/**
 * Redis 8 still defaults to query dialect 1, where `-@a:[…] @b:[…]` means "not (a and b)"; dialect 2 reads it as
 * "not a, and b", which the status filters need.
 */
export const queryDialect = 2;

/** Requests kept per user between two updates; `rate:update` carries them. */
export const maxRequestsPerUpdate = 50;

/** A user record lives this long after the user's last request. */
export const userRecordTtlSeconds = 24 * 60 * 60;

/** A user's last requests (`recentRequestsKept` of them), as JSON, newest first. */
export const recentKey = (userId: string) => `recent:{${userId}}`;

/** A user's accepted (`a:<minute>`) and refused (`r:<minute>`) requests per minute; each field lives 24 hours. */
export const historyKey = (userId: string) => `hist:{${userId}}`;

/** The query engine index over every `user:{id}` record. */
export const usersIndex = 'users';

/** The user's record carries the user ID in braces, like the limiter's keys, so Redis Cluster keeps them together. */
export const userKey = (userId: string) => `user:{${userId}}`;

/** Every admin's socket joins this room, for events about any user. */
export const adminsRoom = 'admins';

/** An admin's socket joins one per user on screen, for that user's `rate:update`. */
export const userRoom = (userId: string) => `user:${userId}`;

export const usersIndexSchema = [
  'id',
  'TAG',
  'SORTABLE',
  'lastRequest',
  'NUMERIC',
  'SORTABLE',
  'baseLimit',
  'NUMERIC',
  'limit',
  'NUMERIC',
  'SORTABLE',
  'used',
  'NUMERIC',
  'SORTABLE',
  'left',
  'NUMERIC',
  'SORTABLE',
  'ratio',
  'NUMERIC',
  'SORTABLE',
  'resetAt',
  'NUMERIC',
  'SORTABLE',
  'pausedUntil',
  'NUMERIC',
];

/** Query engine filters for each status, as the design doc sets out; a user whose window ended has no `ratio`, so counts as OK. */
export const statusQueries = {
  paused: '@pausedUntil:[-inf +inf]',
  exceeded: '-@pausedUntil:[-inf +inf] @ratio:[1 +inf]',
  warning: `-@pausedUntil:[-inf +inf] @ratio:[${warningThreshold} (1]`,
  ok: `-@pausedUntil:[-inf +inf] -@ratio:[${warningThreshold} +inf]`,
} as const;

/**
 * Writes one user's record, only when its numbers are newer: a later window, or the same window with at least as
 * many requests used, so two instances flushing the same user in either order never bring older numbers back.
 * A window that opened before `lastResetAt` is ignored. The window's fields expire with the window.
 * KEYS: the record, the limiter's custom limit. ARGV: user ID, request time, limit, used, reset time, window length,
 * same-window tolerance, record TTL in seconds, default limit. Returns the record after the write, as HGETALL does.
 */
export const recordUserScript = `
local at, limit, used, resetAt = tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4]), tonumber(ARGV[5])
local windowMs, tolerance = tonumber(ARGV[6]), tonumber(ARGV[7])
local windowEnd = tonumber(redis.call('HGET', KEYS[1], 'windowEnd') or '0')
local lastResetAt = tonumber(redis.call('HGET', KEYS[1], 'lastResetAt') or '0')
local storedUsed = tonumber(redis.call('HGET', KEYS[1], 'used') or '-1')

if resetAt - windowMs < lastResetAt - tolerance then
  return redis.call('HGETALL', KEYS[1])
end
if resetAt > windowEnd + tolerance then
  if windowEnd > 0 then
    redis.call('HSET', KEYS[1], 'lastResetAt', windowEnd)
  end
  windowEnd = resetAt
elseif resetAt < windowEnd - tolerance or used < storedUsed then
  return redis.call('HGETALL', KEYS[1])
end

local lastRequest = math.max(at, tonumber(redis.call('HGET', KEYS[1], 'lastRequest') or '0'))
redis.call('HSET', KEYS[1], 'id', ARGV[1], 'lastRequest', lastRequest,
  'baseLimit', tonumber(redis.call('GET', KEYS[2]) or ARGV[9]), 'limit', limit, 'used', used,
  'left', math.max(limit - used, 0), 'ratio', used / limit, 'resetAt', windowEnd, 'windowEnd', windowEnd)
redis.call('HPEXPIREAT', KEYS[1], windowEnd, 'FIELDS', 5, 'limit', 'used', 'left', 'ratio', 'resetAt')
redis.call('EXPIRE', KEYS[1], ARGV[8])
return redis.call('HGETALL', KEYS[1])
`;
