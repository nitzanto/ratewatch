import { usersPageSchema, userRowSchema } from './admin-users.schema.js';

const row = {
  userId: 'user-3f9a1c2e',
  limit: 100,
  requestsLeft: 41,
  resetAt: '2026-10-31T14:32:00.000Z',
  status: 'ok',
  lastRequestAt: '2026-10-31T13:40:12.000Z',
  pausedUntil: null,
};

describe('userRowSchema', () => {
  it('accepts a row with an open window', () => {
    expect(userRowSchema.parse(row)).toEqual(row);
  });

  it('accepts a row whose window ended: no reset time', () => {
    const ended = { ...row, requestsLeft: 100, resetAt: null };

    expect(userRowSchema.parse(ended)).toEqual(ended);
  });

  it.each([
    { ...row, requestsLeft: -1 },
    { ...row, limit: 0 },
    { ...row, status: 'suspended' },
    { ...row, resetAt: 'soon' },
    { ...row, lastRequestAt: undefined },
    { ...row, userId: '' },
  ])('rejects %j', (bad) => {
    expect(userRowSchema.safeParse(bad).success).toBe(false);
  });
});

describe('usersPageSchema', () => {
  it('accepts rows, a total and a count per status', () => {
    const page = {
      rows: [row],
      total: 1,
      counts: { ok: 1, warning: 0, exceeded: 0, paused: 0 },
    };

    expect(usersPageSchema.parse(page)).toEqual(page);
  });

  it('rejects a page without counts', () => {
    expect(usersPageSchema.safeParse({ rows: [], total: 0 }).success).toBe(
      false,
    );
  });
});
