import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RateLimitInterceptor } from '../interceptors/rate-limit.interceptor';

@Module({
  providers: [{ provide: APP_INTERCEPTOR, useClass: RateLimitInterceptor }],
})
export class RateLimitModule {}
