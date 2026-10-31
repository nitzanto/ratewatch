import { expect, test } from '@playwright/test';
import { sessionSchema } from '@ratewatch/contracts';

test('a signed-in User is who the API says they are, until they sign out', async ({
  request,
}) => {
  expect((await request.get('/api/auth/me')).status()).toBe(401);

  const signIn = await request.post('/api/auth/sign-in', {
    data: { role: 'user' },
  });
  expect(signIn.status()).toBe(201);
  const session = sessionSchema.parse(await signIn.json());

  // The request context keeps the cookie, as a browser would.
  const me = await request.get('/api/auth/me');
  expect(sessionSchema.parse(await me.json())).toEqual(session);

  await request.post('/api/auth/sign-out');
  expect((await request.get('/api/auth/me')).status()).toBe(401);
});
