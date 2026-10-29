import { expect, test } from '@playwright/test';
import { healthResponseSchema } from '@ratewatch/contracts';

test('GET /api/health reports ok', async ({ request }) => {
  const res = await request.get('/api/health');

  expect(res.status()).toBe(200);
  expect(healthResponseSchema.parse(await res.json())).toEqual({
    status: 'ok',
  });
});
