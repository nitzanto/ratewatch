import { Controller, Get } from '@nestjs/common';
import type { AdminSummary } from '@ratewatch/contracts';
import { ZodSerializerDto } from 'nestjs-zod';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminSummaryDto } from '../dto/admin-summary.dto';
import { UsersService } from '../services/users.service';

/** The dashboard's summary cards and top users; `rate:summary` sends the same every second. */
@Controller('admin/summary')
@Roles('admin')
export class AdminSummaryController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ZodSerializerDto(AdminSummaryDto)
  summary(): Promise<AdminSummary> {
    return this.users.summary();
  }
}
