import { Controller, Get, type INestApplication } from '@nestjs/common';
import type { Session } from '@ratewatch/contracts';
import { cookieOf, signIn, startApp } from '../../test-app';
import { CurrentSession } from '../decorators/current-session.decorator';
import { Public } from '../decorators/public.decorator';

const dayMs = 24 * 60 * 60 * 1000;

// Stands in for every endpoint that isn't marked public, and echoes who the guard let in.
@Controller('guarded')
class GuardedController {
  @Get()
  get(@CurrentSession() session: Session) {
    return session;
  }
}

@Public()
@Controller('open')
class OpenController {
  @Get()
  get() {
    return { ok: true };
  }
}

describe('SessionGuard', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeEach(async () => {
    ({ app, baseUrl } = await startApp([GuardedController, OpenController]));
  });

  afterEach(() => app.close());

  const guarded = (cookie?: string) =>
    fetch(`${baseUrl}/guarded`, { headers: cookie ? { cookie } : {} });

  it('lets a signed-in person through and hands the handler their session', async () => {
    const res = await signIn(baseUrl, 'user');
    const session = await res.json();

    const answer = await guarded(cookieOf(res));

    expect(answer.status).toBe(200);
    expect(await answer.json()).toEqual(session);
  });

  it('answers 401 without a session cookie', async () => {
    expect((await guarded()).status).toBe(401);
  });

  it('answers 401 when the cookie was edited, for example to change the role', async () => {
    const cookie = cookieOf(await signIn(baseUrl, 'user'));
    const forged = cookie.replace(
      encodeURIComponent('"role":"user"'),
      encodeURIComponent('"role":"admin"'),
    );

    expect(forged).not.toBe(cookie);
    expect((await guarded(forged)).status).toBe(401);
  });

  it('answers 401 to an unsigned cookie', async () => {
    const unsigned = `session=${encodeURIComponent(
      `j:${JSON.stringify({
        userId: 'admin',
        role: 'admin',
        expiresAt: new Date(Date.now() + dayMs).toISOString(),
      })}`,
    )}`;

    expect((await guarded(unsigned)).status).toBe(401);
  });

  describe('after 24 hours', () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
    afterEach(() => vi.useRealTimers());

    it('answers 401 because the session has expired', async () => {
      const cookie = cookieOf(await signIn(baseUrl, 'user'));

      vi.setSystemTime(Date.now() + dayMs);

      expect((await guarded(cookie)).status).toBe(401);
    });
  });

  it.each([
    ['a route marked public', '/open'],
    ['health', '/health'],
    ['sign-out', '/auth/sign-out'],
  ])('lets anyone reach %s', async (_, path) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method: path === '/auth/sign-out' ? 'POST' : 'GET',
    });

    expect(res.status).toBeLessThan(400);
  });
});
