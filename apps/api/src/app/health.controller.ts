import { Controller, Get } from '@nestjs/common';
import {
  type HealthResponse,
  healthResponseSchema,
} from '@ratewatch/contracts';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { Public } from './auth/decorators/public.decorator';

class HealthResponseDto extends createZodDto(healthResponseSchema) {}

@Public()
@Controller('health')
export class HealthController {
  @Get()
  @ZodSerializerDto(HealthResponseDto)
  check(): HealthResponse {
    return { status: 'ok' };
  }
}
