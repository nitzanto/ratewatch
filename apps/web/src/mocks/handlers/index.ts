import { clickHandlers } from './clicks';
import { healthHandlers } from './health';
import { sessionHandlers } from './session';

/** Happy-path API mocks, shared by the dev worker and the component tests. */
export const handlers = [
  ...healthHandlers,
  ...clickHandlers,
  ...sessionHandlers,
];
