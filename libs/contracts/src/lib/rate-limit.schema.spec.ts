import {
  rateLimitedResponseSchema,
  rateLimitHeadersSchema,
} from './rate-limit.schema.js';

describe('rateLimitHeadersSchema', () => {
  it('reads x-count as an integer', () => {
    expect(rateLimitHeadersSchema.parse({ 'x-count': '42' })).toEqual({
      'x-count': 42,
    });
  });

  it.each([
    {},
    { 'x-count': '' },
    { 'x-count': 'lots' },
    { 'x-count': '-1' },
    { 'x-count': '1.5' },
  ])('reads %j as unavailable', (headers) => {
    expect(rateLimitHeadersSchema.parse(headers)).toEqual({
      'x-count': null,
    });
  });
});

describe('rateLimitedResponseSchema', () => {
  it.each(['hourly', 'burst'])(
    'accepts a message, a retry time and the %s reason',
    (reason) => {
      const body = {
        message: 'Too many requests',
        retryAt: '2026-10-30T18:00:00.000Z',
        reason,
      };

      expect(rateLimitedResponseSchema.parse(body)).toEqual(body);
    },
  );

  it.each([
    {},
    { message: 'Too many requests' },
    { message: 'Too many requests', retryAt: 'soon', reason: 'hourly' },
    { retryAt: '2026-10-30T18:00:00.000Z', reason: 'hourly' },
    { message: 'Too many requests', retryAt: '2026-10-30T18:00:00.000Z' },
    {
      message: 'Too many requests',
      retryAt: '2026-10-30T18:00:00.000Z',
      reason: 'daily',
    },
    null,
  ])('rejects %j', (body) => {
    expect(rateLimitedResponseSchema.safeParse(body).success).toBe(false);
  });
});
