import { healthResponseSchema } from './health.schema.js';

describe('healthResponseSchema', () => {
  it('accepts a healthy response', () => {
    expect(healthResponseSchema.parse({ status: 'ok' })).toEqual({
      status: 'ok',
    });
  });

  it.each([{}, { status: 'down' }, { status: 1 }, null])(
    'rejects %j',
    (body) => {
      expect(healthResponseSchema.safeParse(body).success).toBe(false);
    },
  );
});
