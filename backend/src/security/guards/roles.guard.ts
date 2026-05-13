import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MESSAGE } from '../../common/constants/constants';
import { RoleType } from '../role-type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<RoleType[]>(
      'roles',
      context.getHandler(),
    );

    if (!roles || roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles) {
      throw new ForbiddenException({
        status: 403,
        message: MESSAGE.PERMISSION_DENIED,
      });
    }

    const isValid = user.roles.some((role: string) =>
      roles.includes(role as RoleType),
    );

    if (!isValid) {
      throw new ForbiddenException({
        status: 403,
        message: MESSAGE.PERMISSION_DENIED,
      });
    }

    return true;
  }
}