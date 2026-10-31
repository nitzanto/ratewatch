import {
  canAddExtraRequests,
  extraRequestsSchema,
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
