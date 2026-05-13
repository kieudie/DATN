import { Injectable } from '@nestjs/common';
import { DataSource, Like } from 'typeorm';
import { User } from '../../entities/user';
import { UserMapper } from '../auth/user.mapper';
import { RequestGetListUserDTO } from './dto/request-get-list-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(query: RequestGetListUserDTO) {
    const where: any = {};

    if (query.email) {
      where.email = Like(`%${query.email}%`);
    }

    const users = await this.dataSource.getRepository(User).find({
      where,
      relations: {
        userRoles: {
          role: true,
        },
      },
      order: {
        id: 'ASC',
      },
    });

    return users.map((user) => UserMapper.fromEntityToDTO(user));
  }
}