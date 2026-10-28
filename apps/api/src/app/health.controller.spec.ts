import { Test } from '@nestjs/testing';
import { healthResponseSchema } from '@ratewatch/contracts';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns a body matching the health contract', async () => {
    const app = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    const body = app.get(HealthController).check();

    expect(healthResponseSchema.parse(body)).toEqual({ status: 'ok' });
  });
});
