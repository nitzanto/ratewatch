import { resetClicks } from './mocks/handlers/clicks';
import { setMockSession } from './mocks/handlers/session';
import { server } from './mocks/node';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetClicks();
  setMockSession(null);
});
afterAll(() => server.close());
