import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from '../controllers/auth.controller';
import { SessionGuard } from '../guards/session.guard';
import { AuthService } from '../services/auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: SessionGuard }],
  // The realtime gateway reads the session from the Socket.IO handshake.
  exports: [AuthService],
})
export class AuthModule {}
