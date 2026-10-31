import { Inject, Injectable } from '@nestjs/common';
import {
  defaultHourlyLimit,
  sameWindowToleranceMs,
  type UserRow,
  type UsersPage,
  type UserStatus,
  warningThreshold,
} from '@ratewatch/contracts';
import type Redis from 'ioredis';
import type { ChainableCommander } from 'ioredis';
import { redisClient } from '../../redis/constants/redis.constants';
import { windowMs } from '../../rate-limit/constants/rate-limit.constants';
import {
  activeWithinMs,
  dashboardCommandTimeoutMs,
  queryDialect,
  recordChunkSize,
  recordUserScript,
  statusQueries,
  userKey,
  userRecordTtlSeconds,
  usersIndex,
  usersIndexSchema,
  usersPageSize,
} from '../constants/dashboard.constants';
import type { Decision } from '../interfaces/decision.interface';

type RecordPipeline = ChainableCommander & {
  recordUser(key: string, ...args: (string | number)[]): RecordPipeline;
};

/** A hash as Redis sends it in RESP2: field, value, field, value… */
const toFields = (flat: string[]) => {
  const fields: Record<string, string> = {};
  for (let i = 0; i < flat.length; i += 2) fields[flat[i]] = flat[i + 1];
  return fields;
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
      numberOfKeys: 1,
      lua: recordUserScript,
    });
  }

  /** Called once the last records are written, at shutdown. */
  async close() {
    // QUIT needs a live connection; with Redis down, just drop the socket.
    await this.redis.quit().catch(() => this.redis.disconnect());
  }

  /** Writes each user's latest decision, a chunk of users per pipeline. Returns each user's record after the write, or the error for that user. */
  async record(decisions: Decision[]) {
    await this.ensureIndex();
    const results: (Error | UserRow)[] = [];
    for (let i = 0; i < decisions.length; i += recordChunkSize)
      results.push(
        ...(await this.recordChunk(decisions.slice(i, i + recordChunkSize))),
      );
    return results;
  }

  private async recordChunk(decisions: Decision[]) {
    const pipeline = this.redis.pipeline() as RecordPipeline;
    for (const { userId, at, limit, used, resetAt } of decisions)
      pipeline.recordUser(
        userKey(userId),
        userId,
        at,
        limit,
        used,
        resetAt,
        windowMs,
        sameWindowToleranceMs,
        userRecordTtlSeconds,
      );
    const results = (await pipeline.exec()) ?? [];
    const now = Date.now();
    return results.map(([error, flat]) =>
      error ? error : this.toRow(toFields(flat as string[]), now),
    );
  }

  /** The users table's first page: users active in the last 24 hours, latest request first, and each status's count. */
  // shortcut: one fixed page and no search, filters or sorting; the query parameters arrive with #51.
  async list(): Promise<UsersPage> {
    await this.ensureIndex();
    const now = Date.now();
    const active = `@lastRequest:[${now - activeWithinMs} +inf]`;
    const pipeline = this.redis.pipeline();
    pipeline.call(
      'FT.SEARCH',
      usersIndex,
      active,
      'SORTBY',
      'lastRequest',
      'DESC',
      'LIMIT',
      0,
      usersPageSize,
      'DIALECT',
      queryDialect,
    );
    const statuses = Object.keys(statusQueries) as UserStatus[];
    for (const status of statuses)
      pipeline.call(
        'FT.SEARCH',
        usersIndex,
        `${active} ${statusQueries[status]}`,
        'LIMIT',
        0,
        0,
        'DIALECT',
        queryDialect,
      );
    const [page, ...counts] = ((await pipeline.exec()) ?? []).map(
      ([error, reply]) => {
        if (error) throw error;
        return reply as (number | string | string[])[];
      },
    );
    const rows: UserRow[] = [];
    // FT.SEARCH answers [total, key, fields, key, fields…].
    for (let i = 2; i < page.length; i += 2)
      rows.push(this.toRow(toFields(page[i] as string[]), now));
    return {
      rows,
      total: Number(page[0]),
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
      return record.id ? [this.toRow(record, now)] : [];
    });
  }

  /** A record as a row. The window's fields expire with it, so a user whose window ended reads as a full limit, OK. */
  private toRow(fields: Record<string, string>, now: number): UserRow {
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
      requestsLeft: open ? Number(fields.left) : limit,
      resetAt: open ? new Date(resetAt).toISOString() : null,
      status,
      lastRequestAt: new Date(Number(fields.lastRequest)).toISOString(),
      pausedUntil: paused ? new Date(pausedUntil).toISOString() : null,
    };
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
