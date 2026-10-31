import { Controller, Get, type INestApplication } from '@nestjs/common';
import { healthResponseSchema } from '@ratewatch/contracts';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { Public } from './auth/decorators/public.decorator';
import { startApp } from './test-utils/test-app';

// Returns a body that breaks the health contract, to prove responses are validated.
@Public()
@Controller('broken-health')
class BrokenHealthController {
  @Get()
  @ZodSerializerDto(class extends createZodDto(healthResponseSchema) {})
  check() {
    return { status: 'down' };
  }
}

describe('health endpoint', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeEach(async () => {
    ({ app, baseUrl } = await startApp([BrokenHealthController]));
  });

  afterEach(() => app.close());

  it('GET /api/health responds 200 with the health contract', async () => {
    const res = await fetch(`${baseUrl}/health`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('fails with 500 when a response breaks its contract', async () => {
    const res = await fetch(`${baseUrl}/broken-health`);

    expect(res.status).toBe(500);
  });
});
