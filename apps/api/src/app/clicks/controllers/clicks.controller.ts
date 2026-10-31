import { Controller, HttpCode, Post } from '@nestjs/common';
import type { ClickResponse } from '@ratewatch/contracts';
import { ZodSerializerDto } from 'nestjs-zod';
import { ClickResponseDto } from '../dto/click-response.dto';

/** The cookie clicker's endpoint: each click is one request, counted by the rate limit like any other. */
@Controller('clicks')
export class ClicksController {
  @Post()
  @HttpCode(200)
  @ZodSerializerDto(ClickResponseDto)
  click(): ClickResponse {
    return { clickedAt: new Date().toISOString() };
  }
}
