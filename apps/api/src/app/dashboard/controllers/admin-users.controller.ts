import { Controller, Get } from '@nestjs/common';
import type { UsersPage } from '@ratewatch/contracts';
import { ZodSerializerDto } from 'nestjs-zod';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UsersPageDto } from '../dto/users-page.dto';
import { UsersService } from '../services/users.service';

@Controller('admin/users')
@Roles('admin')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ZodSerializerDto(UsersPageDto)
  list(): Promise<UsersPage> {
    return this.users.list();
  }
}
