import { click, rateLimited } from '@/mocks/data/clicks';
import { defaultHourlyLimit, requestsLeftHeader } from '@ratewatch/contracts';
import { http, HttpResponse } from 'msw';

// The mock refuses for 30s instead of the rest of the hour, so the wait is quick to try out in mock mode.
const mockWaitMs = 30_000;

let left = defaultHourlyLimit;
let retryAt: Date | undefined;

/** Gives the mock user a fresh allowance, so each test starts from the full limit. */
export const resetClicks = () => {
  left = defaultHourlyLimit;
  retryAt = undefined;
};

export const clickHandlers = [
  http.post('/api/clicks', () => {
    if (retryAt && Date.now() >= retryAt.getTime()) resetClicks();
    if (left === 0) {
      retryAt ??= new Date(Date.now() + mockWaitMs);
      return HttpResponse.json(rateLimited(retryAt), { status: 429 });
    }
    left -= 1;
    return HttpResponse.json(click(), {
      headers: { [requestsLeftHeader]: String(left) },
    });
  }),
];
