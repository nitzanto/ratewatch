import { healthHandlers } from './health';

/** Happy-path API mocks, shared by the dev worker and the component tests. */
export const handlers = [...healthHandlers];
