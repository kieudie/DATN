import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { FindAllRoleAccountDTO } from './dto/find-all-role.dto';
import { RequestGetListRole } from './dto/request-get-list-role.dto';
import { RoleDto } from './dto/role.dto';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@Controller('api/role')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @ApiBody({
    type: RoleDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
  })
  create(@Body() createRoleDto: RoleDto, @Res() res: Response) {
    return this.rolesService.create(createRoleDto, res);
  }

  @Get()
  @ApiOperation({ summary: 'Find all role' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: FindAllRoleAccountDTO,
  })
  getListRoles(@Query() query: RequestGetListRole) {
    return this.rolesService.getListRoles(query);
  }

  @Get('/code/:code')
  @ApiOperation({ summary: 'Find role by code' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: RoleDto,
  })
  getRoleByCode(@Param('code') code: string) {
    return this.rolesService.getRoleByCode(code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find role by id' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: RoleDto,
  })
  getRoleById(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.getRoleById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update role' })
  @ApiBody({
    type: RoleDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RoleDto,
    @Res() res: Response,
  ) {
    return this.rolesService.updateRole(id, body, res);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  deleteRole(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    return this.rolesService.deleteRole(id, res);
  }
}