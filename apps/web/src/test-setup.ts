import { resetClicks } from './mocks/handlers/clicks';
import { server } from './mocks/node';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetClicks();
});
afterAll(() => server.close());
