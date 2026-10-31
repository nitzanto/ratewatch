import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/modules/auth.module';
import { AdminControlsController } from '../controllers/admin-controls.controller';
import { AdminUsersController } from '../controllers/admin-users.controller';
import { RealtimeGateway } from '../gateways/realtime.gateway';
import { AdminControlsService } from '../services/admin-controls.service';
import { DashboardPublisher } from '../services/dashboard-publisher.service';
import { UsersService } from '../services/users.service';

/** What admins see and do: the users' records in Redis, the users table, its live updates, and the admin controls. */
@Module({
  imports: [AuthModule],
  controllers: [AdminUsersController, AdminControlsController],
  providers: [
    UsersService,
    DashboardPublisher,
    RealtimeGateway,
    AdminControlsService,
  ],
  exports: [DashboardPublisher],
})
export class DashboardModule {}
