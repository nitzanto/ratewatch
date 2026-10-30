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
  it('accepts a message and a retry time', () => {
    const body = {
      message: 'Too many requests',
      retryAt: '2026-10-30T18:00:00.000Z',
    };

    expect(rateLimitedResponseSchema.parse(body)).toEqual(body);
  });

  it.each([
    {},
    { message: 'Too many requests' },
    { message: 'Too many requests', retryAt: 'soon' },
    { retryAt: '2026-10-30T18:00:00.000Z' },
    null,
  ])('rejects %j', (body) => {
    expect(rateLimitedResponseSchema.safeParse(body).success).toBe(false);
  });
});
