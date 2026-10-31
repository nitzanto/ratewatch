import { Controller, Get } from '@nestjs/common';
import {
  type HealthResponse,
  healthResponseSchema,
} from '@ratewatch/contracts';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { Public } from './auth/decorators/public.decorator';

class HealthResponseDto extends createZodDto(healthResponseSchema) {}

// Liveness and readiness both: never checks Redis. The API serves without it (fail open), so a Redis
// outage must not take every instance out of service at once.
@Public()
@Controller('health')
export class HealthController {
  @Get()
  @ZodSerializerDto(HealthResponseDto)
  check(): HealthResponse {
    return { status: 'ok' };
  }
}
