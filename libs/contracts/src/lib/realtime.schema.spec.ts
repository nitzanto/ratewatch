import {
  rateLimitExceededEventSchema,
  rateSubscribeSchema,
  rateUpdateEventSchema,
} from './realtime.schema.js';

const row = {
  userId: 'user-3f9a1c2e',
  limit: 100,
  baseLimit: 100,
  used: 100,
  requestsLeft: 0,
  resetAt: '2026-10-31T14:32:00.000Z',
  status: 'exceeded',
  lastRequestAt: '2026-10-31T13:40:12.000Z',
  pausedUntil: null,
};

describe('rateSubscribeSchema', () => {
  it('accepts up to a page of 100 users plus the open one', () => {
    const userIds = Array.from({ length: 101 }, (_, i) => `user-${i}`);

    expect(rateSubscribeSchema.parse({ userIds })).toEqual({ userIds });
  });

  it.each([
    { userIds: Array.from({ length: 102 }, (_, i) => `user-${i}`) },
    { userIds: [''] },
    { userIds: 'user-3f9a1c2e' },
  ])('rejects %j', (body) => {
    expect(rateSubscribeSchema.safeParse(body).success).toBe(false);
  });
});

describe('rateUpdateEventSchema', () => {
  it('accepts the latest row and the requests since the last update', () => {
    const event = {
      row,
      requests: [{ at: '2026-10-31T13:40:12.000Z', allowed: false }],
    };

    expect(rateUpdateEventSchema.parse(event)).toEqual(event);
  });

  it.each([
    { requests: [] },
    { row, requests: [{ at: 'now', allowed: true }] },
    { row: { ...row, status: 'busy' }, requests: [] },
  ])('rejects %j', (event) => {
    expect(rateUpdateEventSchema.safeParse(event).success).toBe(false);
  });
});

describe('rateLimitExceededEventSchema', () => {
  const event = {
    userId: 'user-3f9a1c2e',
    limit: 100,
    resetAt: '2026-10-31T14:32:00.000Z',
    at: '2026-10-31T13:40:12.000Z',
  };

  it('accepts who hit their limit, when, and when it resets', () => {
    expect(rateLimitExceededEventSchema.parse(event)).toEqual(event);
  });

  it.each([
    { ...event, resetAt: null },
    { ...event, limit: 0 },
    { ...event, userId: undefined },
  ])('rejects %j', (bad) => {
    expect(rateLimitExceededEventSchema.safeParse(bad).success).toBe(false);
  });
});
