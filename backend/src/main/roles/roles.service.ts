import {
    BadRequestException,
    HttpStatus,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { DataSource, Like } from 'typeorm';
import { MESSAGE } from '../../common/constants/constants';
import { Role } from '../../entities/role.entity';
import { RequestGetListRole } from './dto/request-get-list-role.dto';
import { RoleDto } from './dto/role.dto';
import { RoleMapper } from './dto/role.mapper';

@Injectable()
export class RolesService {
  constructor(private readonly dataSource: DataSource) {}

  async create(createRoleDto: RoleDto, res: Response) {
    const roleRepository = this.dataSource.getRepository(Role);

    const existedRole = await roleRepository.findOne({
      where: {
        code: createRoleDto.code,
      },
    });

    if (existedRole) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Role đã tồn tại',
      });
    }

    const role = roleRepository.create({
      code: createRoleDto.code,
      name: createRoleDto.name,
    });

    const result = await roleRepository.save(role);

    return res.status(HttpStatus.CREATED).json({
      message: 'Tạo role thành công',
      data: RoleMapper.fromEntityToDTO(result),
    });
  }

  async getListRoles(query: RequestGetListRole) {
    try {
      const roleRepository = this.dataSource.getRepository(Role);

      const where: any = {};

      if (query.code) {
        where.code = Like(`%${query.code}%`);
      }

      if (query.name) {
        where.name = Like(`%${query.name}%`);
      }

      const roles = await roleRepository.find({
        where,
        order: {
          id: 'ASC',
        },
      });

      return {
        data: roles.map((role) => RoleMapper.fromEntityToDTO(role)),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: MESSAGE?.SERVER_ERROR || 'Có lỗi xảy ra',
      });
    }
  }

  async getRoleByCode(code: string) {
    const role = await this.dataSource.getRepository(Role).findOne({
      where: {
        code,
      },
    });

    if (!role) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        message: MESSAGE?.ROLE_NOT_FOUND || 'Role không tồn tại',
      });
    }

    return RoleMapper.fromEntityToDTO(role);
  }

  async getRoleById(id: number) {
    const role = await this.dataSource.getRepository(Role).findOne({
      where: {
        id,
      },
    });

    if (!role) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        message: MESSAGE?.ROLE_NOT_FOUND || 'Role không tồn tại',
      });
    }

    return RoleMapper.fromEntityToDTO(role);
  }

  async updateRole(id: number, body: RoleDto, res: Response) {
    const roleRepository = this.dataSource.getRepository(Role);

    const role = await roleRepository.findOne({
      where: {
        id,
      },
    });

    if (!role) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: MESSAGE?.ROLE_NOT_FOUND || 'Role không tồn tại',
      });
    }

    if (body.code && body.code !== role.code) {
      const existedRole = await roleRepository.findOne({
        where: {
          code: body.code,
        },
      });

      if (existedRole) {
        throw new BadRequestException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Role code đã tồn tại',
        });
      }
    }

    role.code = body.code || role.code;
    role.name = body.name || role.name;

    const updatedRole = await roleRepository.save(role);

    return res.status(HttpStatus.OK).json({
      message: 'Cập nhật role thành công',
      data: RoleMapper.fromEntityToDTO(updatedRole),
    });
  }

  async deleteRole(id: number, res: Response) {
    const roleRepository = this.dataSource.getRepository(Role);

    const role = await roleRepository.findOne({
      where: {
        id,
      },
    });

    if (!role) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: MESSAGE?.ROLE_NOT_FOUND || 'Role không tồn tại',
      });
    }

    await roleRepository.delete(id);

    return res.status(HttpStatus.OK).json({
      message: 'Xóa role thành công',
    });
  }
}