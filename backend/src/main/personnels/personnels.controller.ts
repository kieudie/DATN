import {
  Controller,
  Get,
  HttpStatus,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { Request } from '../../common/request';
import { AuthGuard, Roles, RolesGuard, RoleType } from '../../security';
import { PersonnelsService } from './personnels.service';

@Controller('api/personnel')
@ApiTags('Personnel')
export class PersonnelsController {
  constructor(private readonly personnelsService: PersonnelsService) {}

  @Get('me/menus')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    RoleType.ADMIN,
    RoleType.MANAGER,
    RoleType.USER,
    RoleType.REPORTER,
    RoleType.VIEW_PERSONNEL_INFO,
    RoleType.RECRUITMENT_MANAGEMENT,
    RoleType.RECRUITMENT_MANAGER,
    RoleType.VIEW_STATISTIC,
  )
  @ApiOperation({
    summary: 'Get menus for current user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  async getCurrentMenus(@Req() req: Request, @Res() res: Response) {
    return await this.personnelsService.getCurrentMenus(req.user, res);
  }
}