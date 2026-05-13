import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthGuard, Roles, RolesGuard, RoleType } from '../../security';
import { AuthService } from './auth.service';
import { AccountDTO } from './dto/account.dto';
import { UserLoginResponse } from './dto/user-login-response.dto';
import { UserLoginDTO } from './dto/user-login.dto';

@Controller('api/auth')
@ApiTags('Login')
export class UserLoginController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  @ApiOperation({ summary: 'Authorization api retrieving token' })
  @ApiResponse({
    status: 201,
    description: 'Authorized',
    type: UserLoginResponse,
  })
  async authorize(
    @Req() req: Request,
    @Body() user: UserLoginDTO,
    @Res() res: Response,
  ): Promise<any> {
    const jwt = await this.authService.login(user);
    return res.json(jwt);
  }


  @Post('/logout')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Logout' })
  @ApiResponse({
    status: 200,
    description: 'Logout successfully',
  })
  async logout(@Req() req: Request, @Res() res: Response): Promise<any> {
    return await this.authService.logout(req, res);
  }

  @Post('/register')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  @ApiOperation({ summary: 'Create internal account' })
  @ApiBody({
    type: AccountDTO,
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully!',
  })
  async register(@Body() user: AccountDTO, @Res() res: Response): Promise<any> {
    return await this.authService.registerNewUser(user, res);
  }
}