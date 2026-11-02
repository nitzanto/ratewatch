import {
  defaultHourlyLimit,
  type UserRow,
  type UsersPage,
  type UserStatus,
  warningThreshold,
} from '@ratewatch/contracts';
import type { ChainableCommander } from 'ioredis';
import {
  queryDialect,
  statusQueries,
  usersIndex,
} from '../constants/dashboard.constants';

/**
 * The users index's Redis details, kept out of `UsersService`: building FT.SEARCH queries and turning raw replies
 * into rows. ioredis has no typed search API (node-redis's `ft.search`), so these do that job. Pure, apart from
 * queueing on a pipeline.
 */

/** A hash as Redis sends it in RESP2: field, value, field, value… */
export const parseHash = (flat: string[]) => {
  const fields: Record<string, string> = {};

  for (let nameAt = 0; nameAt < flat.length; nameAt += 2)
    fields[flat[nameAt]] = flat[nameAt + 1];

  return fields;
};

/** A record as a row. The window's fields expire with it, so a user whose window ended reads as a full limit, OK. */
export const buildUserRow = (
  fields: Record<string, string>,
  now: number,
): UserRow => {
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

export interface SearchOptions {
  sortBy?: string;
  order?: 'asc' | 'desc';
  offset?: number;
  /** 0 returns only the total, for counts. */
  limit?: number;
  /** Only these fields of each document; all of them when left out. */
  returnFields?: string[];
}

/** Queues one FT.SEARCH over the users index and returns the pipeline, so calls chain; read its reply with `parseSearchReply`. */
export const addUserSearch = (
  pipeline: ChainableCommander,
  query: string,
  {
    sortBy,
    order = 'asc',
    offset = 0,
    limit = 10,
    returnFields,
  }: SearchOptions = {},
): ChainableCommander =>
  pipeline.call(
    'FT.SEARCH',
    usersIndex,
    query,
    ...(sortBy ? ['SORTBY', sortBy, order.toUpperCase()] : []),
    'LIMIT',
    offset,
    limit,
    ...(returnFields ? ['RETURN', returnFields.length, ...returnFields] : []),
    'DIALECT',
    queryDialect,
  );

/** An FT.SEARCH reply, `[total, key, fields, key, fields…]`, as its total and each document's fields. */
export const parseSearchReply = (reply: unknown) => {
  const flat = reply as unknown[];
  const docs: Record<string, string>[] = [];

  for (let fieldsAt = 2; fieldsAt < flat.length; fieldsAt += 2)
    docs.push(parseHash(flat[fieldsAt] as string[]));

  return { total: Number(flat[0]), docs };
};

export const statuses = Object.keys(statusQueries) as UserStatus[];

/**
 * Queues one count per status among the users `matching`, and returns the pipeline, like `addUserSearch`, so calls
 * chain. Their replies come back in `statuses` order.
 */
export const addStatusCounts = (
  pipeline: ChainableCommander,
  matching: string,
): ChainableCommander =>
  statuses.reduce(
    (queued, status) =>
      addUserSearch(queued, `${matching} ${statusQueries[status]}`, {
        limit: 0,
      }),
    pipeline,
  );

/** The status counts' replies as `{ ok, warning, exceeded, paused }`. */
export const parseStatusCounts = (replies: unknown[]) =>
  Object.fromEntries(
    statuses.map((status, statusIndex) => [
      status,
      parseSearchReply(replies[statusIndex]).total,
    ]),
  ) as UsersPage['counts'];

/** A pipeline's replies, throwing the first error. */
export const getReplies = (results: [Error | null, unknown][] | null) =>
  (results ?? []).map(([error, reply]) => {
    if (error) throw error;

    return reply;
  });

/**
 * Users whose ID is `q`, or starts with it once it's 2 characters (the query engine's shortest prefix). Every
 * character but letters, digits and `_` is escaped, so the admin's text is never read as query syntax.
 */
export const buildIdQuery = (q: string) =>
  `@id:{${q.replace(/[^\p{L}\p{N}_]/gu, '\\$&')}${q.length >= 2 ? '*' : ''}}`;
