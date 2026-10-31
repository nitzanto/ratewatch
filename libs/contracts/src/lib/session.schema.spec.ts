import { sessionSchema, signInRequestSchema } from './session.schema.js';

describe('sessionSchema', () => {
  it.each([
    {
      userId: 'user-7f3a9c2e',
      role: 'user',
      expiresAt: '2026-11-01T12:00:00.000Z',
    },
    { userId: 'admin', role: 'admin', expiresAt: '2026-11-01T12:00:00.000Z' },
  ])('accepts %j', (session) => {
    expect(sessionSchema.parse(session)).toEqual(session);
  });

  it.each([
    {},
    {
      userId: 'user-7f3a9c2e',
      role: 'owner',
      expiresAt: '2026-11-01T12:00:00.000Z',
    },
    { userId: '', role: 'user', expiresAt: '2026-11-01T12:00:00.000Z' },
    { userId: 'user-7f3a9c2e', role: 'user', expiresAt: 'tomorrow' },
    null,
  ])('rejects %j', (body) => {
    expect(sessionSchema.safeParse(body).success).toBe(false);
  });
});

describe('signInRequestSchema', () => {
  it.each(['user', 'admin'])('accepts the %s role', (role) => {
    expect(signInRequestSchema.parse({ role })).toEqual({ role });
  });

  it.each([{}, { role: 'owner' }, { role: 'admin', userId: 'admin' }])(
    'rejects %j',
    (body) => {
      expect(signInRequestSchema.safeParse(body).success).toBe(false);
    },
  );
});
