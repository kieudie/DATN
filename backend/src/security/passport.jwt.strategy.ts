import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { MESSAGE } from '../common/constants/constants';
import { AuthService } from '../main/auth/auth.service';
import { RedisCacheService } from '../main/redis/redis.service';
import { Payload } from './payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly redisService: RedisCacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      passReqToCallback: true,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'datn_access_secret',
    });
  }

  async validate(req: Request, payload: Payload): Promise<any> {
    const token = this.extractTokenFromRequest(req);

    if (!token) {
      throw new UnauthorizedException({
        status: 401,
        message: MESSAGE.TOKEN_INVALID,
      });
    }

    const isBlacklisted = await this.redisService.isBlacklistedToken(token);

    if (isBlacklisted) {
      throw new UnauthorizedException({
        status: 401,
        message: MESSAGE.TOKEN_LOGGED_OUT,
      });
    }

    const user = await this.authService.validateUser(payload);

    if (!user) {
      throw new UnauthorizedException({
        status: 401,
        message: MESSAGE.USER_NOT_FOUND,
      });
    }

    return user;
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