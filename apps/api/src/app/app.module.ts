import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AuthModule } from './auth/modules/auth.module';
import { ClicksController } from './clicks/controllers/clicks.controller';
import { envSchema } from './env';
import { HealthController } from './health.controller';
import { RateLimitModule } from './rate-limit/modules/rate-limit.module';
import { RedisModule } from './redis/modules/redis.module';

@Module({
  imports: [
    // Fails startup naming any missing or invalid variable. Nx loads the .env files in dev, so the app
    // never reads one itself (a production image has none).
    ConfigModule.forRoot({
      validationSchema: envSchema,
      ignoreEnvFile: true,
      isGlobal: true,
    }),
    AuthModule,
    RedisModule,
    RateLimitModule,
  ],
  controllers: [HealthController, ClicksController],
  providers: [
    // Validates every body, query and param against its Zod DTO.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // Validates responses of routes marked with @ZodSerializerDto.
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
