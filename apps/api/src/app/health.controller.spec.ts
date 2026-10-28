import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { healthResponseSchema } from '@ratewatch/contracts';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { AppModule } from './app.module';

// Returns a body that breaks the health contract, to prove responses are validated.
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
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [BrokenHealthController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0);
    baseUrl = `${await app.getUrl()}/api`;
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
