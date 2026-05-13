import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, Roles, RolesGuard, RoleType } from '../../security';
import { RequestGetListUserDTO } from './dto/request-get-list-user.dto';
import { UsersService } from './users.service';

@Controller('api/users')
@ApiTags('Users Management')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({ summary: 'Get list users' })
  @ApiResponse({
    status: 200,
    description: 'Get list users successfully',
  })
  async findAll(@Query() query: RequestGetListUserDTO) {
    return await this.usersService.findAll(query);
  }
}