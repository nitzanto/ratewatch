import { replaceRealtime } from './libs/realtime/realtime-client';
import { resetUsers } from './mocks/handlers/admin-users';
import { resetClicks } from './mocks/handlers/clicks';
import { setMockSession } from './mocks/handlers/session';
import { server } from './mocks/node';
import { connectFakeRealtime, restoreRealtime } from './mocks/realtime';

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
  replaceRealtime(connectFakeRealtime);
});
afterEach(() => {
  server.resetHandlers();
  resetClicks();
  resetUsers();
  restoreRealtime();
  setMockSession(null);
});
afterAll(() => server.close());
