import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import type { AdminChange } from '@ratewatch/contracts';
import { ZodSerializerDto } from 'nestjs-zod';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminChangeDto } from '../dto/admin-change.dto';
import { ExtraRequestsDto } from '../dto/extra-requests.dto';
import { ResetUsersDto } from '../dto/reset-users.dto';
import { UserParamsDto } from '../dto/user-params.dto';
import { AdminControlsService } from '../services/admin-controls.service';

/** An admin's changes to users' limits, each answered with the changed rows. */
@Controller('admin/users')
@Roles('admin')
export class AdminControlsController {
  constructor(private readonly controls: AdminControlsService) {}

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(AdminChangeDto)
  resetMany(@Body() { userIds }: ResetUsersDto): Promise<AdminChange> {
    return this.controls.reset(userIds);
  }

  @Post(':id/reset')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(AdminChangeDto)
  reset(@Param() { id }: UserParamsDto): Promise<AdminChange> {
    return this.controls.reset([id]);
  }

  @Post(':id/extra-requests')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(AdminChangeDto)
  addExtraRequests(
    @Param() { id }: UserParamsDto,
    @Body() { amount }: ExtraRequestsDto,
  ): Promise<AdminChange> {
    return this.controls.addExtraRequests(id, amount);
  }
}
