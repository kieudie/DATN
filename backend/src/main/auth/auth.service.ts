import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { DataSource, In } from 'typeorm';
import { MESSAGE } from '../../common/constants/constants';
import { Role } from '../../entities/role.entity';
import { UserRole } from '../../entities/user-role.entity';
import { User } from '../../entities/user.entity';
import { RoleType } from '../../security';
import { Payload } from '../../security/payload.interface';
import { RedisCacheService } from '../redis/redis.service';
import { AccountDTO } from './dto/account.dto';
import { UserLoginGoogleDTO } from './dto/user-login-google.dto';
import { UserLoginDTO } from './dto/user-login.dto';
import { UserMapper } from './user.mapper';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisCacheService,
  ) {}

  async login(userLogin: UserLoginDTO): Promise<any> {
    const userFind = await this.dataSource.getRepository(User).findOne({
      where: {
        email: userLogin.email,
      },
      relations: {
        userRoles: {
          role: true,
        },
      },
    });

    const validPassword =
      !!userFind &&
      (await bcrypt.compare(userLogin.password, userFind.passwordHash));

    if (!userFind || !validPassword) {
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        message: MESSAGE.INVALID_LOGIN_NAME_OR_PASSWORD,
      });
    }

    if (userFind.isActive !== 1) {
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        message: MESSAGE.ACCOUNT_NOT_ACTIVE,
      });
    }

    const roles = userFind.userRoles.map((item) => item.role);

    const payload = {
      user_id: userFind.id,
      email: userFind.email,
      roles: roles.map((role) => role.code),
    };

    const accessToken = this.jwtService.sign(payload);

    return UserMapper.fromEntityToLoginResponse(userFind, roles, accessToken);
  }

  async loginWithGoogle(userLoginGoogle: UserLoginGoogleDTO): Promise<any> {
    try {
      const { email, idToken } = userLoginGoogle;
      const googleClientId = process.env.GOOGLE_CLIENT_ID;

      if (!googleClientId) {
        throw new BadRequestException({
          status: HttpStatus.BAD_REQUEST,
          message: MESSAGE.TOKEN_ERROR,
        });
      }

      const client = new OAuth2Client(googleClientId);

      const ticket = await client.verifyIdToken({
        idToken,
        audience: googleClientId,
      });

      const payloadGoogle = ticket.getPayload();
      const emailGoogle = payloadGoogle?.email;

      if (!emailGoogle) {
        throw new BadRequestException({
          status: HttpStatus.BAD_REQUEST,
          message: MESSAGE.TOKEN_ERROR,
        });
      }

      if (email && email.localeCompare(emailGoogle) !== 0) {
        throw new BadRequestException({
          status: HttpStatus.BAD_REQUEST,
          message: MESSAGE.EMAIL_NOT_FOUND,
        });
      }

      const userFind = await this.dataSource.getRepository(User).findOne({
        where: {
          email: emailGoogle,
        },
        relations: {
          userRoles: {
            role: true,
          },
        },
      });

      if (!userFind) {
        throw new BadRequestException({
          status: HttpStatus.BAD_REQUEST,
          message: MESSAGE.ACCOUNT_EMAIL_NOT_FOUND,
        });
      }

      if (userFind.isActive !== 1) {
        throw new BadRequestException({
          status: HttpStatus.BAD_REQUEST,
          message: MESSAGE.ACCOUNT_NOT_ACTIVE,
        });
      }

      const roles = userFind.userRoles.map((item) => item.role);

      const jwtPayload = {
        user_id: userFind.id,
        email: userFind.email,
        roles: roles.map((role) => role.code),
      };

      const accessToken = this.jwtService.sign(jwtPayload);

      return UserMapper.fromEntityToLoginResponse(userFind, roles, accessToken);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: MESSAGE.SERVER_ERROR,
      });
    }
  }

  async logout(req: Request, res: Response): Promise<Response> {
    const token = this.extractTokenFromRequest(req);

    if (!token) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        status: HttpStatus.UNAUTHORIZED,
        message: MESSAGE.TOKEN_INVALID,
      });
    }

    const decodedToken = this.jwtService.decode(token);
    const now = Math.floor(Date.now() / 1000);

    let ttlSeconds = 24 * 60 * 60;

    if (decodedToken && typeof decodedToken !== 'string' && decodedToken.exp) {
      ttlSeconds = Math.max(decodedToken.exp - now, 1);
    }

    await this.redisService.setBlacklistedToken(token, ttlSeconds);

    return res.status(HttpStatus.OK).json({
      status: HttpStatus.OK,
      message: MESSAGE.LOGOUT_SUCCESS,
    });
  }

  async registerNewUser(
    newUser: AccountDTO,
    res: Response,
  ): Promise<Response> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existedUser = await queryRunner.manager.findOne(User, {
        where: {
          email: newUser.email,
        },
      });

      if (existedUser) {
        await queryRunner.rollbackTransaction();

        return res.status(HttpStatus.BAD_REQUEST).json({
          status: HttpStatus.BAD_REQUEST,
          message: MESSAGE.EMAIL_ALREADY_USE,
        });
      }

      const roleIds = [...new Set(newUser.roles || [])];

      if (roleIds.length !== 1) {
        await queryRunner.rollbackTransaction();

        return res.status(HttpStatus.BAD_REQUEST).json({
          status: HttpStatus.BAD_REQUEST,
          message: MESSAGE.ROLE_NOT_FOUND,
        });
      }

      const roles = await queryRunner.manager.find(Role, {
        where: {
          id: In(roleIds),
          code: In([RoleType.ADMIN, RoleType.RECRUITMENT_MANAGER]),
        },
      });

      if (roles.length !== roleIds.length) {
        await queryRunner.rollbackTransaction();

        return res.status(HttpStatus.BAD_REQUEST).json({
          status: HttpStatus.BAD_REQUEST,
          message: MESSAGE.ROLE_NOT_FOUND,
        });
      }

      const passwordHash = await bcrypt.hash(newUser.password, 10);

      const user = new User();
      user.fullName = newUser.full_name;
      user.email = newUser.email;
      user.passwordHash = passwordHash;
      user.phone = newUser.phone || null;
      user.isActive = 1;

      const savedUser = await queryRunner.manager.save(User, user);

      for (const role of roles) {
        const userRole = new UserRole();
        userRole.userId = savedUser.id;
        userRole.roleId = role.id;

        await queryRunner.manager.save(UserRole, userRole);
      }

      await queryRunner.commitTransaction();

      const responseUser = new User();
      responseUser.id = savedUser.id;
      responseUser.fullName = savedUser.fullName;
      responseUser.email = savedUser.email;
      responseUser.passwordHash = savedUser.passwordHash;
      responseUser.phone = savedUser.phone;
      responseUser.isActive = savedUser.isActive;
      responseUser.createdAt = savedUser.createdAt;
      responseUser.updatedAt = savedUser.updatedAt;
      responseUser.userRoles = roles.map((role) => {
        const userRole = new UserRole();
        userRole.userId = savedUser.id;
        userRole.roleId = role.id;
        userRole.role = role;
        return userRole;
      });

      return res.status(HttpStatus.CREATED).json({
        status: HttpStatus.CREATED,
        message: MESSAGE.REGISTER_SUCCESS,
        data: UserMapper.fromEntityToDTO(responseUser),
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: MESSAGE.SERVER_ERROR,
      });
    } finally {
      await queryRunner.release();
    }
  }

  async validateUser(payload: Payload): Promise<any> {
    const user = await this.dataSource.getRepository(User).findOne({
      where: {
        id: payload.user_id,
      },
      relations: {
        userRoles: {
          role: true,
        },
      },
    });

    if (!user) {
      return null;
    }

    if (user.isActive !== 1) {
      return null;
    }

    const roles = user.userRoles.map((item) => item.role.code);

    return {
      user_id: user.id,
      email: user.email,
      roles,
    };
  }

  private extractTokenFromRequest(req: Request): string | null {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}