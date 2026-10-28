import { Controller, Get } from '@nestjs/common';
import {
  type HealthResponse,
  healthResponseSchema,
} from '@ratewatch/contracts';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';

class HealthResponseDto extends createZodDto(healthResponseSchema) {}

@Controller('health')
export class HealthController {
  @Get()
  @ZodSerializerDto(HealthResponseDto)
  check(): HealthResponse {
    return { status: 'ok' };
  }
}
