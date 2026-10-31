import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import type { UserDetail, UserHistory, UsersPage } from '@ratewatch/contracts';
import { ZodSerializerDto } from 'nestjs-zod';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserDetailDto } from '../dto/user-detail.dto';
import { UserHistoryDto } from '../dto/user-history.dto';
import { UserHistoryQueryDto } from '../dto/user-history-query.dto';
import { UserParamsDto } from '../dto/user-params.dto';
import { UsersPageDto } from '../dto/users-page.dto';
import { UsersQueryDto } from '../dto/users-query.dto';
import { UsersService } from '../services/users.service';

@Controller('admin/users')
@Roles('admin')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ZodSerializerDto(UsersPageDto)
  list(@Query() query: UsersQueryDto): Promise<UsersPage> {
    return this.users.list(query);
  }

  @Get(':id')
  @ZodSerializerDto(UserDetailDto)
  async detail(@Param() { id }: UserParamsDto): Promise<UserDetail> {
    const detail = await this.users.detail(id);
    if (!detail)
      throw new NotFoundException(`No request from ${id} in the past 24 hours`);
    return detail;
  }

  @Get(':id/history')
  @ZodSerializerDto(UserHistoryDto)
  history(
    @Param() { id }: UserParamsDto,
    @Query() { range }: UserHistoryQueryDto,
  ): Promise<UserHistory> {
    return this.users.history(id, range);
  }
}
