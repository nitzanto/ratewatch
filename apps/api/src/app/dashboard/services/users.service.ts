import { Inject, Injectable } from '@nestjs/common';
import {
  type ActivityRange,
  activeWithinMs,
  activityRanges,
  defaultHourlyLimit,
  recentRequestsKept,
  sameWindowToleranceMs,
  type UserDetail,
  type UserHistory,
  type UserRow,
  type UsersPage,
  type UsersQuery,
  type UserStatus,
  warningThreshold,
} from '@ratewatch/contracts';
import type Redis from 'ioredis';
import type { ChainableCommander } from 'ioredis';
import { redisClient } from '../../redis/constants/redis.constants';
import {
  rateLimitKeys,
  windowMs,
} from '../../rate-limit/constants/rate-limit.constants';
import {
  dashboardCommandTimeoutMs,
  historyKey,
  queryDialect,
  recentKey,
  recordChunkSize,
  recordUserScript,
  statusQueries,
  userKey,
  userRecordTtlSeconds,
  usersIndex,
  usersIndexSchema,
} from '../constants/dashboard.constants';
import type { Activity } from '../interfaces/activity.interface';

type RecordPipeline = ChainableCommander & {
  recordUser(...args: (string | number)[]): RecordPipeline;
};

/** A hash as Redis sends it in RESP2: field, value, field, value… */
export const toFields = (flat: string[]) => {
  const fields: Record<string, string> = {};
  for (let i = 0; i < flat.length; i += 2) fields[flat[i]] = flat[i + 1];
  return fields;
};

/** A record as a row. The window's fields expire with it, so a user whose window ended reads as a full limit, OK. */
export const toRow = (fields: Record<string, string>, now: number): UserRow => {
  const resetAt = Number(fields.resetAt);
  const open = resetAt > now;
  const baseLimit = Number(fields.baseLimit ?? defaultHourlyLimit);
  const limit = open ? Number(fields.limit) : baseLimit;
  const ratio = open ? Number(fields.ratio) : 0;
  const pausedUntil = Number(fields.pausedUntil);
  const paused = pausedUntil > now;
  const status: UserStatus = paused
    ? 'paused'
    : ratio >= 1
      ? 'exceeded'
      : ratio >= warningThreshold
        ? 'warning'
        : 'ok';
  return {
    userId: fields.id,
    limit,
    baseLimit,
    used: open ? Number(fields.used) : 0,
    requestsLeft: open ? Number(fields.left) : limit,
    resetAt: open ? new Date(resetAt).toISOString() : null,
    status,
    lastRequestAt: new Date(Number(fields.lastRequest)).toISOString(),
    pausedUntil: paused ? new Date(pausedUntil).toISOString() : null,
  };
};

/**
 * Users whose ID is `q`, or starts with it once it's 2 characters (the query engine's shortest prefix). Every
 * character but letters, digits and `_` is escaped, so the admin's text is never read as query syntax.
 */
const idQuery = (q: string) =>
  `@id:{${q.replace(/[^\p{L}\p{N}_]/gu, '\\$&')}${q.length >= 2 ? '*' : ''}}`;

/**
 * The users' records in Redis: written from the limiter's decisions, read by the users table and the realtime acks.
 * On its own connection, with a longer timeout than the limiter's: a second's batch or a page of searches never
 * waits in front of a limit check, and the limit check's 50 ms never cuts one short.
 */
@Injectable()
export class UsersService {
  private readonly redis: Redis;
  private indexReady = false;

  constructor(@Inject(redisClient) shared: Redis) {
    this.redis = shared.duplicate({
      commandTimeout: dashboardCommandTimeoutMs,
    });
    this.redis.on('error', () => undefined);
    this.redis.defineCommand('recordUser', {
      numberOfKeys: 2,
      lua: recordUserScript,
    });
  }

  /** Called once the last records are written, at shutdown. */
  async close() {
    // QUIT needs a live connection; with Redis down, just drop the socket.
    await this.redis.quit().catch(() => this.redis.disconnect());
  }

  /**
   * Writes each user's activity, a chunk of users per pipeline: their record from the latest decision, their
   * requests per minute and their recent requests. Returns each user's record after the write, or the error for that user.
   */
  async record(activities: Activity[]) {
    await this.ensureIndex();
    const results: (Error | UserRow)[] = [];
    for (let i = 0; i < activities.length; i += recordChunkSize)
      results.push(
        ...(await this.recordChunk(activities.slice(i, i + recordChunkSize))),
      );
    return results;
  }

  private async recordChunk(activities: Activity[]) {
    const pipeline = this.redis.pipeline() as RecordPipeline;
    // Where each user's commands start in the pipeline.
    const starts: number[] = [];
    for (const { latest, requests, counts } of activities) {
      const { userId, at, limit, used, resetAt } = latest;
      starts.push(pipeline.length);
      pipeline.recordUser(
        userKey(userId),
        rateLimitKeys(userId)[1],
        userId,
        at,
        limit,
        used,
        resetAt,
        windowMs,
        sameWindowToleranceMs,
        userRecordTtlSeconds,
        defaultHourlyLimit,
      );
      for (const [field, count] of counts)
        pipeline.hincrby(historyKey(userId), field, count);
      // Each minute's fields expire 24 hours after they were first written.
      pipeline.hexpire(
        historyKey(userId),
        userRecordTtlSeconds,
        'NX',
        'FIELDS',
        counts.size,
        ...counts.keys(),
      );
      // Oldest first, so the newest ends up at the head.
      pipeline.lpush(
        recentKey(userId),
        ...[...requests].reverse().map((request) => JSON.stringify(request)),
      );
      pipeline.ltrim(recentKey(userId), 0, recentRequestsKept - 1);
      pipeline.expire(recentKey(userId), userRecordTtlSeconds);
    }
    const results = (await pipeline.exec()) ?? [];
    const now = Date.now();
    return starts.map((start, i) => {
      const own = results.slice(start, starts[i + 1]);
      const failed = own.find(([error]) => error)?.[0];
      return failed ?? toRow(toFields(own[0][1] as string[]), now);
    });
  }

  /** One user's row, when their count last went back to zero, and their last requests; `null` with no record. */
  async detail(userId: string): Promise<UserDetail | null> {
    const [fields, recent] = await Promise.all([
      this.redis.hgetall(userKey(userId)),
      this.redis.lrange(recentKey(userId), 0, recentRequestsKept - 1),
    ]);
    if (!fields.id) return null;
    const now = Date.now();
    // A window that ended put the count back to zero, though the record moves on only with the next request.
    const windowEnd = Number(fields.windowEnd);
    const lastResetAt =
      windowEnd <= now ? windowEnd : Number(fields.lastResetAt ?? 0);
    return {
      row: toRow(fields, now),
      lastResetAt: lastResetAt ? new Date(lastResetAt).toISOString() : null,
      recent: recent.map((json) => {
        const { at, allowed } = JSON.parse(
          json,
        ) as Activity['requests'][number];
        return { at: new Date(at).toISOString(), allowed };
      }),
    };
  }

  /** One user's accepted and refused requests per bucket over `range`, oldest first; the last bucket holds now. */
  async history(userId: string, range: ActivityRange): Promise<UserHistory> {
    const { buckets, bucketMs } = activityRanges[range];
    const first = Math.floor(Date.now() / bucketMs) - buckets + 1;
    const counts = Array.from({ length: buckets }, (_, i) => ({
      start: new Date((first + i) * bucketMs).toISOString(),
      accepted: 0,
      refused: 0,
    }));
    const fields = await this.redis.hgetall(historyKey(userId));
    for (const [field, count] of Object.entries(fields)) {
      const [kind, minute] = field.split(':');
      const bucket =
        counts[Math.floor((Number(minute) * 60_000) / bucketMs) - first];
      if (bucket)
        bucket[kind === 'a' ? 'accepted' : 'refused'] += Number(count);
    }
    return { buckets: counts };
  }

  /** One page of the users table, and each status's count under the same search and last-active filter. */
  async list(query: UsersQuery): Promise<UsersPage> {
    try {
      return await this.search(query);
    } catch (error) {
      // Redis lost the index (a flush, or a restart or failover without its data): create it again, once.
      if (!(
        error instanceof Error &&
        error.message.startsWith('SEARCH_INDEX_NOT_FOUND')
      ))
        throw error;
      this.indexReady = false;
      return this.search(query);
    }
  }

  private async search({
    q,
    status,
    activeWithin,
    sort,
    order,
    page,
    pageSize,
  }: UsersQuery): Promise<UsersPage> {
    await this.ensureIndex();
    const now = Date.now();
    const matching = `@lastRequest:[${now - activeWithinMs[activeWithin]} +inf]${q ? ` ${idQuery(q)}` : ''}`;
    const pipeline = this.redis.pipeline();
    pipeline.call(
      'FT.SEARCH',
      usersIndex,
      status ? `${matching} ${statusQueries[status]}` : matching,
      'SORTBY',
      sort,
      order.toUpperCase(),
      'LIMIT',
      page * pageSize,
      pageSize,
      'DIALECT',
      queryDialect,
    );
    const statuses = Object.keys(statusQueries) as UserStatus[];
    for (const status of statuses)
      pipeline.call(
        'FT.SEARCH',
        usersIndex,
        `${matching} ${statusQueries[status]}`,
        'LIMIT',
        0,
        0,
        'DIALECT',
        queryDialect,
      );
    const [found, ...counts] = ((await pipeline.exec()) ?? []).map(
      ([error, reply]) => {
        if (error) throw error;
        return reply as (number | string | string[])[];
      },
    );
    const rows: UserRow[] = [];
    // FT.SEARCH answers [total, key, fields, key, fields…].
    for (let i = 2; i < found.length; i += 2)
      rows.push(toRow(toFields(found[i] as string[]), now));
    return {
      rows,
      total: Number(found[0]),
      counts: Object.fromEntries(
        statuses.map((status, i) => [status, Number(counts[i][0])]),
      ) as UsersPage['counts'],
    };
  }

  /** The current rows of these users, skipping any without a record. */
  async rows(userIds: string[]): Promise<UserRow[]> {
    if (!userIds.length) return [];
    const pipeline = this.redis.pipeline();
    for (const userId of userIds) pipeline.hgetall(userKey(userId));
    const now = Date.now();
    return ((await pipeline.exec()) ?? []).flatMap(([error, fields]) => {
      if (error) throw error;
      const record = fields as Record<string, string>;
      return record.id ? [toRow(record, now)] : [];
    });
  }

  /** Creates the index the first time it's needed; Redis may be down at startup, so it's tried again until it works. */
  private async ensureIndex() {
    if (this.indexReady) return;
    try {
      await this.redis.call(
        'FT.CREATE',
        usersIndex,
        'ON',
        'HASH',
        'PREFIX',
        1,
        'user:',
        'SCHEMA',
        ...usersIndexSchema,
      );
    } catch (error) {
      // Another instance, or an earlier run, created it.
      if (!(error instanceof Error && /already exists/i.test(error.message)))
        throw error;
    }
    this.indexReady = true;
  }
}
