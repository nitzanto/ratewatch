import type { INestApplication } from '@nestjs/common';
import { sessionSchema } from '@ratewatch/contracts';
import { cookieOf, signIn, startApp } from '../../test-utils/test-app';

const dayMs = 24 * 60 * 60 * 1000;

describe('auth endpoints', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeEach(async () => {
    ({ app, baseUrl } = await startApp());
  });

  afterEach(() => app.close());

  const me = (cookie?: string) =>
    fetch(`${baseUrl}/auth/me`, { headers: cookie ? { cookie } : {} });

  it('signs in as a User with a new user ID that lasts 24 hours', async () => {
    const before = Date.now();
    const res = await signIn(baseUrl, 'user');

    expect(res.status).toBe(201);
    const session = sessionSchema.parse(await res.json());
    expect(session).toMatchObject({
      userId: expect.stringMatching(/^user-[0-9a-f]{8}$/),
      role: 'user',
    });
    const expiresAt = Date.parse(session.expiresAt);
    expect(expiresAt).toBeGreaterThanOrEqual(before + dayMs);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + dayMs);

    const cookie = res.headers.getSetCookie()[0];
    expect(cookie).toMatch(/^session=/);
    expect(cookie).toContain('Max-Age=86400');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).not.toContain('Secure');

    const restored = await me(cookieOf(res));
    expect(restored.status).toBe(200);
    expect(await restored.json()).toEqual(session);
  });

  it('gives each User sign-in a different user ID', async () => {
    const first = sessionSchema.parse(
      await (await signIn(baseUrl, 'user')).json(),
    );
    const second = sessionSchema.parse(
      await (await signIn(baseUrl, 'user')).json(),
    );

    expect(second.userId).not.toBe(first.userId);
  });

  it('signs in as the Admin', async () => {
    const res = await signIn(baseUrl, 'admin');

    expect(res.status).toBe(201);
    expect(await (await me(cookieOf(res))).json()).toEqual({
      userId: 'admin',
      role: 'admin',
      expiresAt: expect.any(String),
    });
  });

  it.each(['owner', undefined])(
    'refuses to sign in with role %s',
    async (role) => {
      const res = await signIn(baseUrl, role);

      expect(res.status).toBe(400);
      expect(res.headers.getSetCookie()).toEqual([]);
    },
  );

  it('signs out by clearing the cookie', async () => {
    const res = await fetch(`${baseUrl}/auth/sign-out`, { method: 'POST' });

    expect(res.status).toBe(204);
    const cleared = res.headers.getSetCookie()[0];
    expect(cleared).toMatch(/^session=;/);
    expect(cleared).toContain('Expires=Thu, 01 Jan 1970');
  });

  it('answers who am I with 401 when signed out', async () => {
    expect((await me()).status).toBe(401);
  });
});
