import { Module } from '@nestjs/common';
import { DashboardModule } from '../../dashboard/modules/dashboard.module';
import {
  burstLimit,
  defaultBurstLimit,
} from '../constants/rate-limit.constants';
import { RateLimitInterceptor } from '../interceptors/rate-limit.interceptor';

/**
 * Exports the interceptor for the routes the limit applies to, which use it with `@UseInterceptors`. Nest builds
 * such an interceptor in the controller's module, so its burst limit is exported too.
 */
@Module({
  imports: [DashboardModule],
  providers: [
    RateLimitInterceptor,
    { provide: burstLimit, useValue: defaultBurstLimit },
  ],
  exports: [RateLimitInterceptor, burstLimit],
})
export class RateLimitModule {}
