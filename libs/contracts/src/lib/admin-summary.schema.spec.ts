import { adminSummarySchema } from './admin-summary.schema.js';

const summary = {
  totalUsers: 20,
  nearLimitShare: 0.15,
  refusedToday: 42,
  counts: { ok: 16, warning: 2, exceeded: 1, paused: 1 },
  topUsers: [{ userId: 'user-3f9a1c2e', used: 100, limit: 100 }],
};

describe('adminSummarySchema', () => {
  it('accepts the totals, the counts and the top users', () => {
    expect(adminSummarySchema.parse(summary)).toEqual(summary);
  });

  it.each([
    { ...summary, nearLimitShare: 1.5 },
    { ...summary, refusedToday: -1 },
    { ...summary, counts: { ...summary.counts, busy: 1 } },
    {
      ...summary,
      topUsers: [{ userId: 'user-3f9a1c2e', used: 0, limit: 100 }],
    },
    { ...summary, topUsers: Array(6).fill(summary.topUsers[0]) },
  ])('rejects %j', (body) => {
    expect(adminSummarySchema.safeParse(body).success).toBe(false);
  });
});
