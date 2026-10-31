import {
  canAddExtraRequests,
  canSetLimit,
  customLimitSchema,
  extraRequestsSchema,
  pauseSchema,
  resetUsersSchema,
} from './admin-controls.schema.js';

describe('canAddExtraRequests', () => {
  it('allows 10 more up to a limit of 1,000, and no further', () => {
    expect(canAddExtraRequests(100)).toBe(true);
    expect(canAddExtraRequests(990)).toBe(true);
    expect(canAddExtraRequests(991)).toBe(false);
    expect(canAddExtraRequests(1000)).toBe(false);
  });
});

describe('extraRequestsSchema', () => {
  it('takes 10 at a time only', () => {
    expect(extraRequestsSchema.parse({ amount: 10 })).toEqual({ amount: 10 });
    for (const amount of [1, 20, -10, '10'])
      expect(extraRequestsSchema.safeParse({ amount }).success).toBe(false);
  });
});

describe('resetUsersSchema', () => {
  const ids = (count: number) =>
    Array.from({ length: count }, (_, i) => `user-${i}`);

  it('takes 1 to 100 user IDs', () => {
    expect(resetUsersSchema.safeParse({ userIds: ids(1) }).success).toBe(true);
    expect(resetUsersSchema.safeParse({ userIds: ids(100) }).success).toBe(
      true,
    );
  });

  it.each([{ userIds: [] }, { userIds: ids(101) }, { userIds: [''] }, {}])(
    'rejects %j',
    (bad) => {
      expect(resetUsersSchema.safeParse(bad).success).toBe(false);
    },
  );
});

describe('customLimitSchema', () => {
  it('takes a whole number from 1 to 1,000', () => {
    for (const limit of [1, 100, 1000])
      expect(customLimitSchema.parse({ limit })).toEqual({ limit });
  });

  it.each([0, 1001, 2.5, -5, '250', null])('rejects %j', (limit) => {
    expect(customLimitSchema.safeParse({ limit }).success).toBe(false);
  });
});

describe('canSetLimit', () => {
  it("keeps a custom limit plus the window's extra requests at 1,000 or under", () => {
    expect(canSetLimit(1000, 0)).toBe(true);
    expect(canSetLimit(990, 10)).toBe(true);
    expect(canSetLimit(991, 10)).toBe(false);
    expect(canSetLimit(1000, 10)).toBe(false);
  });
});

describe('pauseSchema', () => {
  it('takes one of the three durations', () => {
    for (const duration of ['15m', '1h', 'untilReset'])
      expect(pauseSchema.parse({ duration })).toEqual({ duration });
  });

  it.each([{ duration: '2h' }, { until: '2026-11-01T14:32:00.000Z' }, {}])(
    'rejects %j',
    (bad) => {
      expect(pauseSchema.safeParse(bad).success).toBe(false);
    },
  );
});
