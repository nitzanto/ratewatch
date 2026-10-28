import type { HealthResponse } from '@ratewatch/contracts';
import { http, HttpResponse } from 'msw';

/** Happy-path API mocks, shared by the dev worker and the component tests. */
export const handlers = [
  http.get('/api/health', () =>
    HttpResponse.json({ status: 'ok' } satisfies HealthResponse),
  ),
];
