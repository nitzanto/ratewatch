import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  providers: [
    // Validates every body, query and param against its Zod DTO.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // Validates responses of routes marked with @ZodSerializerDto.
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
