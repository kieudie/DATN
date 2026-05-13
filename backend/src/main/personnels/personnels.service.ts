import {
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Response } from 'express';
import { MESSAGE } from '../../common/constants/constants';
import { RolePageService } from '../role-page/role-page.service';

@Injectable()
export class PersonnelsService {
  constructor(private readonly rolePageService: RolePageService) {}

  async getCurrentMenus(userLogin: any, res: Response) {
    try {
      const roleCodes = this.getRoleCodesFromUserLogin(userLogin);

      const menus = await this.rolePageService.getMenusByRoleCodes(roleCodes);

      return res.status(HttpStatus.OK).json(menus);
    } catch (error) {
      throw new InternalServerErrorException({
        status: error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error?.response?.message || MESSAGE.SERVER_ERROR,
      });
    }
  }

  private getRoleCodesFromUserLogin(userLogin: any): string[] {
    if (!userLogin || !userLogin.roles) {
      return [];
    }

    if (typeof userLogin.roles[0] === 'string') {
      return userLogin.roles;
    }

    return userLogin.roles
      .map((item) => item.code || item.roleCode || item.rolename)
      .filter(Boolean);
  }
}