import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, Roles, RolesGuard, RoleType } from '../../security';
import { RolePageService } from './role-page.service';

@Controller('api/role-page')
@ApiTags('Role Page Management')
export class RolePageController {
  constructor(private readonly rolePageService: RolePageService) {}

  @Get('/role/:roleCode')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    RoleType.ADMIN,
    RoleType.RECRUITMENT_MANAGEMENT,
    RoleType.RECRUITMENT_MANAGER,
    RoleType.MANAGER,
    RoleType.REPORTER,
    RoleType.VIEW_STATISTIC,
  )
  @ApiOperation({ summary: 'Get pages by role' })
  @ApiParam({
    name: 'roleCode',
    example: 'recruitment_management',
  })
  @ApiResponse({
    status: 200,
    description: 'Get pages by role successfully',
  })
  async getPagesByRole(@Param('roleCode') roleCode: string) {
    return await this.rolePageService.getPagesByRole(roleCode);
  }
}