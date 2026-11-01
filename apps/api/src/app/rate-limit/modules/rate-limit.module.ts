import { Module } from '@nestjs/common';
import { DashboardModule } from '../../dashboard/modules/dashboard.module';
import { RateLimitInterceptor } from '../interceptors/rate-limit.interceptor';

/** Exports the interceptor for the routes the limit applies to, which use it with `@UseInterceptors`. */
@Module({
  imports: [DashboardModule],
  providers: [RateLimitInterceptor],
  exports: [RateLimitInterceptor],
})
export class RateLimitModule {}
