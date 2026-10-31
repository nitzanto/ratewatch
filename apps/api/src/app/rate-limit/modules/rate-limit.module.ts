import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DashboardModule } from '../../dashboard/modules/dashboard.module';
import { RateLimitInterceptor } from '../interceptors/rate-limit.interceptor';

@Module({
  imports: [DashboardModule],
  providers: [{ provide: APP_INTERCEPTOR, useClass: RateLimitInterceptor }],
})
export class RateLimitModule {}
