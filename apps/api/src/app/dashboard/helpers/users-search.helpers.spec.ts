import type { ChainableCommander } from 'ioredis';
import { statusQueries } from '../constants/dashboard.constants';
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
} from './users-search.helpers';

/** A pipeline that records each queued command and returns itself, as an ioredis pipeline does. */
const fakePipeline = () => {
  const calls: unknown[][] = [];
  const pipeline = {
    call: (...args: unknown[]) => {
      calls.push(args);
      return pipeline;
    },
  };
  return { calls, pipeline: pipeline as unknown as ChainableCommander };
};

const now = Date.parse('2026-11-01T12:00:00.000Z');

/** A record whose window is open, `used` of 100 used. */
const openRecord = (used: number) => ({
  id: 'user-42',
  used: String(used),
  limit: '100',
  left: String(100 - used),
  ratio: String(used / 100),
  resetAt: String(now + 30 * 60_000),
  baseLimit: '100',
  lastRequest: String(now - 1_000),
});

describe('parseHash', () => {
  it('pairs a flat RESP2 hash into an object', () => {
    expect(parseHash(['id', 'user-42', 'used', '59'])).toEqual({
      id: 'user-42',
      used: '59',
    });
  });

  it('reads an empty reply as no fields', () => {
    expect(parseHash([])).toEqual({});
  });
});

describe('buildUserRow', () => {
  it('reads an open window as its numbers and reset time', () => {
    expect(buildUserRow(openRecord(59), now)).toEqual({
      userId: 'user-42',
      limit: 100,
      baseLimit: 100,
      used: 59,
      requestsLeft: 41,
      resetAt: '2026-11-01T12:30:00.000Z',
      status: 'ok',
      lastRequestAt: '2026-11-01T11:59:59.000Z',
      pausedUntil: null,
    });
  });

  it.each([
    [89, 'ok'],
    [90, 'warning'],
    [99, 'warning'],
    [100, 'exceeded'],
  ])('reads %i of 100 used as %s', (used, status) => {
    expect(buildUserRow(openRecord(used), now).status).toBe(status);
  });

  it('reads a window that ended as a full base limit, OK', () => {
    const row = buildUserRow(
      { ...openRecord(100), baseLimit: '150', resetAt: String(now - 1) },
      now,
    );

    expect(row).toMatchObject({
      limit: 150,
      used: 0,
      requestsLeft: 150,
      resetAt: null,
      status: 'ok',
    });
  });

  it('reads a running pause as Paused, whatever was used', () => {
    const pausedUntil = now + 15 * 60_000;
    const row = buildUserRow(
      { ...openRecord(100), pausedUntil: String(pausedUntil) },
      now,
    );

    expect(row.status).toBe('paused');
    expect(row.pausedUntil).toBe(new Date(pausedUntil).toISOString());
  });

  it('ignores a pause that has ended', () => {
    const row = buildUserRow(
      { ...openRecord(10), pausedUntil: String(now) },
      now,
    );

    expect(row.status).toBe('ok');
    expect(row.pausedUntil).toBeNull();
  });
});

describe('addUserSearch', () => {
  it('queues a search with only the query, LIMIT and DIALECT by default', () => {
    const { calls, pipeline } = fakePipeline();

    addUserSearch(pipeline, '@used:[1 +inf]');

    expect(calls).toEqual([
      ['FT.SEARCH', 'users', '@used:[1 +inf]', 'LIMIT', 0, 10, 'DIALECT', 2],
    ]);
  });

  it('queues sort, page and returned fields in the order Redis expects', () => {
    const { calls, pipeline } = fakePipeline();

    addUserSearch(pipeline, '*', {
      sortBy: 'used',
      order: 'desc',
      offset: 20,
      limit: 5,
      returnFields: ['id', 'used'],
    });

    expect(calls[0]).toEqual([
      'FT.SEARCH',
      'users',
      '*',
      'SORTBY',
      'used',
      'DESC',
      'LIMIT',
      20,
      5,
      'RETURN',
      2,
      'id',
      'used',
      'DIALECT',
      2,
    ]);
  });

  it('returns the pipeline, so calls chain', () => {
    const { pipeline } = fakePipeline();

    expect(addUserSearch(pipeline, '*')).toBe(pipeline);
  });
});

describe('addStatusCounts', () => {
  it('queues one count-only search per status, in `statuses` order, and returns the pipeline', () => {
    const { calls, pipeline } = fakePipeline();

    const returned = addStatusCounts(pipeline, '@lastRequest:[0 +inf]');

    expect(returned).toBe(pipeline);
    expect(calls.map((args) => args[2])).toEqual(
      statuses.map(
        (status) => `@lastRequest:[0 +inf] ${statusQueries[status]}`,
      ),
    );
    expect(calls.every((args) => args[4] === 0 && args[5] === 0)).toBe(true);
  });
});

describe('parseSearchReply', () => {
  it('reads the total and each document, skipping the keys', () => {
    const reply = [
      2,
      'user:{a}',
      ['id', 'a', 'used', '3'],
      'user:{b}',
      ['id', 'b', 'used', '1'],
    ];

    expect(parseSearchReply(reply)).toEqual({
      total: 2,
      docs: [
        { id: 'a', used: '3' },
        { id: 'b', used: '1' },
      ],
    });
  });

  it('reads a count-only reply as a total with no documents', () => {
    expect(parseSearchReply([7])).toEqual({ total: 7, docs: [] });
  });
});

describe('parseStatusCounts', () => {
  it('maps each count reply to its status', () => {
    const replies = statuses.map((_, i) => [i + 1]);

    expect(parseStatusCounts(replies)).toEqual(
      Object.fromEntries(statuses.map((status, i) => [status, i + 1])),
    );
  });
});

describe('getReplies', () => {
  it('returns the replies when no command failed', () => {
    expect(
      getReplies([
        [null, 'a'],
        [null, 2],
      ]),
    ).toEqual(['a', 2]);
  });

  it('throws the first error', () => {
    const error = new Error('SEARCH_INDEX_NOT_FOUND');

    expect(() =>
      getReplies([
        [null, 'a'],
        [error, null],
      ]),
    ).toThrow(error);
  });

  it('reads a pipeline that ran nothing as no replies', () => {
    expect(getReplies(null)).toEqual([]);
  });
});

describe('buildIdQuery', () => {
  it('matches a single character exactly, below the shortest prefix', () => {
    expect(buildIdQuery('a')).toBe('@id:{a}');
  });

  it('matches 2 characters or more as a prefix', () => {
    expect(buildIdQuery('ab')).toBe('@id:{ab*}');
  });

  it('escapes query syntax in the admin text', () => {
    expect(buildIdQuery('user-4')).toBe('@id:{user\\-4*}');
    expect(buildIdQuery('a}|@b')).toBe('@id:{a\\}\\|\\@b*}');
  });
});
