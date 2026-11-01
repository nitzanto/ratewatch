import { Controller, HttpCode, Post, UseInterceptors } from '@nestjs/common';
import type { ClickResponse } from '@ratewatch/contracts';
import { ZodSerializerDto } from 'nestjs-zod';
import { RateLimitInterceptor } from '../../rate-limit/interceptors/rate-limit.interceptor';
import { ClickResponseDto } from '../dto/click-response.dto';

/** The cookie clicker's endpoint: each click is one request, and the only route the rate limit counts. */
@Controller('clicks')
@UseInterceptors(RateLimitInterceptor)
export class ClicksController {
  @Post()
  @HttpCode(200)
  @ZodSerializerDto(ClickResponseDto)
  click(): ClickResponse {
    return { clickedAt: new Date().toISOString() };
  }
}
