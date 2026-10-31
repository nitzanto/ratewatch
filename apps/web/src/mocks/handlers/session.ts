import { session } from '@/mocks/data/session';
import {
  type Role,
  type Session,
  signInRequestSchema,
} from '@ratewatch/contracts';
import { http, HttpResponse } from 'msw';
import { resetClicks } from './clicks';

// shortcut: kept in memory, so a reload in mock mode signs you out; the real API keeps it in a cookie.
let current: Session | null = null;

/** Signs the mock in as `role`, or out with `null`; tests use it to start a page signed in. */
export const setMockSession = (role: Role | null) => {
  current = role && session(role);
};

export const sessionHandlers = [
  http.post('/api/auth/sign-in', async ({ request }) => {
    const { role } = signInRequestSchema.parse(await request.json());
    // A User sign-in is a new user, with a fresh limit.
    if (role === 'user') resetClicks();
    setMockSession(role);
    return HttpResponse.json(current, { status: 201 });
  }),
  http.post('/api/auth/sign-out', () => {
    setMockSession(null);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get('/api/auth/me', () =>
    current
      ? HttpResponse.json(current)
      : HttpResponse.json(
          { statusCode: 401, message: 'Unauthorized' },
          { status: 401 },
        ),
  ),
];
