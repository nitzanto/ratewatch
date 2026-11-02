import type { UserRow, UsersPage } from '@ratewatch/contracts';
import {
  applyRowToPage,
  buildExceededRow,
  mergeNewRequests,
} from './admin-users-queries';

const row = (userId: string, overrides: Partial<UserRow> = {}): UserRow => ({
  userId,
  limit: 100,
  baseLimit: 100,
  used: 50,
  requestsLeft: 50,
  resetAt: '2026-11-01T13:00:00.000Z',
  status: 'ok',
  lastRequestAt: '2026-11-01T12:00:00.000Z',
  pausedUntil: null,
  ...overrides,
});

const page = (rows: UserRow[]): UsersPage => ({
  rows,
  total: rows.length,
  counts: { ok: rows.length, warning: 0, exceeded: 0, paused: 0 },
});

const always = () => true;

describe('applyRowToPage', () => {
  it("writes the row over the user's row and moves them between the status counts", () => {
    const before = page([row('a'), row('b')]);
    const next = row('b', { used: 95, requestsLeft: 5, status: 'warning' });

    const after = applyRowToPage(before, next, always);

    expect(after.rows).toEqual([row('a'), next]);
    expect(after.counts).toEqual({
      ok: 1,
      warning: 1,
      exceeded: 0,
      paused: 0,
    });
    expect(before.counts.ok).toBe(2);
  });

  it('returns the same page when the user is not on it', () => {
    const before = page([row('a')]);

    expect(applyRowToPage(before, row('z'), always)).toBe(before);
  });

  it('returns the same page when `keeps` refuses the update', () => {
    const before = page([row('a')]);

    expect(applyRowToPage(before, row('a'), () => false)).toBe(before);
  });
});

describe('mergeNewRequests', () => {
  const at = (second: number) =>
    `2026-11-01T12:00:${String(second).padStart(2, '0')}.000Z`;

  it('adds the new requests, newest first', () => {
    const recent = [{ at: at(10), allowed: true }];

    expect(
      mergeNewRequests(recent, [
        { at: at(30), allowed: false },
        { at: at(20), allowed: true },
      ]),
    ).toEqual([
      { at: at(30), allowed: false },
      { at: at(20), allowed: true },
      { at: at(10), allowed: true },
    ]);
  });

  it('counts a request already listed once, and returns the same list when nothing is new', () => {
    const recent = [{ at: at(10), allowed: true }];

    expect(mergeNewRequests(recent, [{ at: at(10), allowed: true }])).toBe(
      recent,
    );
  });

  it('sorts batches that arrive out of order', () => {
    const recent = [{ at: at(30), allowed: true }];

    expect(
      mergeNewRequests(recent, [{ at: at(20), allowed: true }]).map(
        ({ at }) => at,
      ),
    ).toEqual([at(30), at(20)]);
  });

  it('keeps only the newest 50', () => {
    const recent = Array.from({ length: 50 }, (_, second) => ({
      at: at(second),
      allowed: true,
    }));

    const merged = mergeNewRequests(recent, [{ at: at(59), allowed: true }]);

    expect(merged).toHaveLength(50);
    expect(merged[0].at).toBe(at(59));
  });
});

describe('buildExceededRow', () => {
  it('marks the row Exceeded with nothing left, from the refusal', () => {
    const exceeded = buildExceededRow(row('a', { used: 98 }), {
      userId: 'a',
      limit: 100,
      resetAt: '2026-11-01T13:30:00.000Z',
      at: '2026-11-01T12:05:00.000Z',
    });

    expect(exceeded).toEqual(
      row('a', {
        used: 100,
        requestsLeft: 0,
        resetAt: '2026-11-01T13:30:00.000Z',
        status: 'exceeded',
        lastRequestAt: '2026-11-01T12:05:00.000Z',
      }),
    );
  });
});
