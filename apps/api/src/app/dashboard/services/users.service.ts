import { Inject, Injectable } from '@nestjs/common';
import {
  type ActivityRange,
  type AdminSummary,
  activeWithinMs,
  activityRanges,
  defaultHourlyLimit,
  recentRequestsKept,
  sameWindowToleranceMs,
  type TopUser,
  topUsersShown,
  type UserDetail,
  type UserHistory,
  type UserRow,
  type UsersPage,
  type UsersQuery,
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
  recentKey,
  recordChunkSize,
  recordUserScript,
  refusedKey,
  statusQueries,
  userKey,
  userRecordTtlSeconds,
  usersIndex,
  usersIndexSchema,
} from '../constants/dashboard.constants';
import {
  addStatusCounts,
  buildIdQuery,
  getReplies,
  addUserSearch,
  statuses,
  parseStatusCounts,
  parseHash,
  buildUserRow,
  parseSearchReply,
} from '../helpers/users-search.helpers';
import type { Activity } from '../interfaces/activity.interface';

type RecordPipeline = ChainableCommander & {
  recordUser(...args: (string | number)[]): RecordPipeline;
};

const daySeconds = 24 * 60 * 60;

/** A time's UTC day, as `YYYY-MM-DD`. */
const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The refused requests in a user's per-minute counts (`r:<minute>`), added up per UTC day. */
const refusedPerDay = (counts: Activity['counts']) => {
  const days = new Map<string, number>();

  for (const [field, count] of counts) {
    const [kind, minute] = field.split(':');

    if (kind !== 'r') continue;

    const day = utcDay(Number(minute) * 60_000);

    days.set(day, (days.get(day) ?? 0) + count);
  }

  return days;
};

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
    // Step 1: make sure the search index exists, so the new records are indexed.
    await this.ensureIndex();
    const results: (Error | UserRow)[] = [];

    // Step 2: write the users a chunk at a time, one pipeline each.

    for (
      let chunkStart = 0;
      chunkStart < activities.length;
      chunkStart += recordChunkSize
    )
      results.push(
        ...(await this.recordChunk(
          activities.slice(chunkStart, chunkStart + recordChunkSize),
        )),
      );

    return results;
  }

  private async recordChunk(activities: Activity[]) {
    const pipeline = this.redis.pipeline() as RecordPipeline;
    // Where each user's commands start in the pipeline.
    const starts: number[] = [];

    for (const { latest, requests, counts } of activities) {
      const { userId, at, limit, used, resetAt } = latest;

      // Step 1: the user's record (the table row), from their latest decision.
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

      // Step 2: their accepted and refused requests per minute, for the history chart.
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

      // Step 3: their recent requests, oldest first, so the newest ends up at the head.
      pipeline.lpush(
        recentKey(userId),
        ...[...requests].reverse().map((request) => JSON.stringify(request)),
      );
      pipeline.ltrim(recentKey(userId), 0, recentRequestsKept - 1);
      pipeline.expire(recentKey(userId), userRecordTtlSeconds);

      // Step 4: today's 429 count. Each refusal counts on its own minute's UTC day, so a batch across midnight splits.
      for (const [day, refused] of refusedPerDay(counts)) {
        pipeline.incrby(refusedKey(day), refused);
        pipeline.expireat(
          refusedKey(day),
          Date.parse(day) / 1000 + 2 * daySeconds,
        );
      }
    }

    // Step 5: send it all in one trip.
    const results = (await pipeline.exec()) ?? [];
    const now = Date.now();

    // Step 6: each user's result: the row Redis now has, or the first error among their commands.
    return starts.map((start, userIndex) => {
      const own = results.slice(start, starts[userIndex + 1]);
      const failed = own.find(([error]) => error)?.[0];

      return failed ?? buildUserRow(parseHash(own[0][1] as string[]), now);
    });
  }

  /** One user's row, when their count last went back to zero, and their last requests; `null` with no record. */
  async detail(userId: string): Promise<UserDetail | null> {
    // Step 1: read the record and the recent requests together.
    const [fields, recent] = await Promise.all([
      this.redis.hgetall(userKey(userId)),
      this.redis.lrange(recentKey(userId), 0, recentRequestsKept - 1),
    ]);

    if (!fields.id) return null;

    // Step 2: when the count last went back to zero. A window that ended did that, though the record moves on only
    // with the next request.
    const now = Date.now();
    const windowEnd = Number(fields.windowEnd);
    const lastResetAt =
      windowEnd <= now ? windowEnd : Number(fields.lastResetAt ?? 0);

    // Step 3: build the row, and parse each recent request.
    return {
      row: buildUserRow(fields, now),
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
    // Step 1: empty buckets for the range, the last one holding now.
    const { buckets, bucketMs } = activityRanges[range];
    const first = Math.floor(Date.now() / bucketMs) - buckets + 1;
    const counts = Array.from({ length: buckets }, (_, bucketIndex) => ({
      start: new Date((first + bucketIndex) * bucketMs).toISOString(),
      accepted: 0,
      refused: 0,
    }));

    // Step 2: read the per-minute counts and add each to its bucket; minutes outside the range are skipped.
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
  list(query: UsersQuery): Promise<UsersPage> {
    return this.withIndex(() => this.search(query));
  }

  /**
   * The dashboard's summary over the users active in the past 24 hours: their count, the share near the limit
   * (Warning or Exceeded), each status's count, the requests refused today (UTC), and the top users by requests in
   * their current window.
   */
  summary(): Promise<AdminSummary> {
    return this.withIndex(async () => {
      const now = Date.now();
      const active = `@lastRequest:[${now - activeWithinMs['24h']} +inf]`;

      // Step 1: queue the status counts, then the top users, then today's 429s; the replies come back in that order.
      const pipeline = addUserSearch(
        addStatusCounts(this.redis.pipeline(), active),
        // `used` expires with the window, so a user whose window ended isn't matched.
        `${active} @used:[1 +inf]`,
        {
          sortBy: 'used',
          order: 'desc',
          limit: topUsersShown,
          returnFields: ['id', 'used', 'limit'],
        },
      ).get(refusedKey(utcDay(now)));

      // Step 2: run them in one trip, and split the replies back up.
      const replies = getReplies(await pipeline.exec());
      const counts = parseStatusCounts(replies.slice(0, statuses.length));
      const [top, refused] = replies.slice(statuses.length) as [
        unknown,
        string | null,
      ];

      // Step 3: the totals the cards show.
      const totalUsers = statuses.reduce(
        (sum, status) => sum + counts[status],
        0,
      );
      const topUsers: TopUser[] = parseSearchReply(top).docs.map((fields) => ({
        userId: fields.id,
        used: Number(fields.used),
        limit: Number(fields.limit),
      }));

      return {
        totalUsers,
        nearLimitShare: totalUsers
          ? (counts.warning + counts.exceeded) / totalUsers
          : 0,
        refusedToday: Number(refused ?? 0),
        counts,
        topUsers,
      };
    });
  }

  /** Runs a read of the index, creating the index again, once, if Redis has lost it (a flush, or a restart or failover without its data). */
  private async withIndex<T>(read: () => Promise<T>) {
    await this.ensureIndex();

    try {
      return await read();
    } catch (error) {
      if (!(
        error instanceof Error &&
        error.message.startsWith('SEARCH_INDEX_NOT_FOUND')
      ))
        throw error;

      this.indexReady = false;
      await this.ensureIndex();

      return read();
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
    const now = Date.now();
    // Step 1: the filter every query shares: active within the range, and the ID search.
    const matching = `@lastRequest:[${now - activeWithinMs[activeWithin]} +inf]${q ? ` ${buildIdQuery(q)}` : ''}`;

    // Step 2: one page of rows, plus a count per status, in one trip.
    const pipeline = addUserSearch(
      this.redis.pipeline(),
      status ? `${matching} ${statusQueries[status]}` : matching,
      { sortBy: sort, order, offset: page * pageSize, limit: pageSize },
    );
    const [found, ...counts] = getReplies(
      await addStatusCounts(pipeline, matching).exec(),
    );

    // Step 3: parse the replies into rows and counts.
    const { total, docs } = parseSearchReply(found);

    return {
      rows: docs.map((fields) => buildUserRow(fields, now)),
      total,
      counts: parseStatusCounts(counts),
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

      return record.id ? [buildUserRow(record, now)] : [];
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
