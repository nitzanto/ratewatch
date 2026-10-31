import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/modules/auth.module';
import { AdminUsersController } from '../controllers/admin-users.controller';
import { RealtimeGateway } from '../gateways/realtime.gateway';
import { DashboardPublisher } from '../services/dashboard-publisher.service';
import { UsersService } from '../services/users.service';

/** What admins see: the users' records in Redis, the users table, and its live updates. */
@Module({
  imports: [AuthModule],
  controllers: [AdminUsersController],
  providers: [UsersService, DashboardPublisher, RealtimeGateway],
  exports: [DashboardPublisher],
})
export class DashboardModule {}
