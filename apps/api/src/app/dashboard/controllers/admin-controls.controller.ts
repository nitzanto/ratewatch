import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { type AdminChange } from '@ratewatch/contracts';
import { ZodSerializerDto } from 'nestjs-zod';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminChangeDto } from '../dto/admin-change.dto';
import { CustomLimitDto } from '../dto/custom-limit.dto';
import { ExtraRequestsDto } from '../dto/extra-requests.dto';
import { PauseDto } from '../dto/pause.dto';
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

  @Put(':id/limit')
  @ZodSerializerDto(AdminChangeDto)
  setLimit(
    @Param() { id }: UserParamsDto,
    @Body() { limit }: CustomLimitDto,
  ): Promise<AdminChange> {
    return this.controls.setLimit(id, limit);
  }

  @Put(':id/pause')
  @ZodSerializerDto(AdminChangeDto)
  pause(
    @Param() { id }: UserParamsDto,
    @Body() pause: PauseDto,
  ): Promise<AdminChange> {
    return this.controls.pause(id, pause);
  }

  @Delete(':id/pause')
  @ZodSerializerDto(AdminChangeDto)
  unlock(@Param() { id }: UserParamsDto): Promise<AdminChange> {
    return this.controls.unlock(id);
  }
}
