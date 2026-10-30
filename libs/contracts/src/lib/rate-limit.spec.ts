import { rateLimitedResponseSchema } from './rate-limit.js';

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
