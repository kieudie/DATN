import {
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Response } from 'express';
import { DataSource } from 'typeorm';
import {
    RecruitmentOrder,
    RecruitmentOrderStatus,
} from '../../entities/recruitment-order';
import { CreateRecruitmentOrderDTO } from './dto/create-recruitment-order.dto';
import {
    FindAllOrdersByRecruiterQueryDTO,
    FindAllOrdersQueryDTO,
} from './dto/find-all-orders-query.dto';
import { UpdateRecruitmentOrderStatusDTO } from './dto/update-recruitment-order-status.dto';
import { UpdateRecruitmentOrderDTO } from './dto/update-recruitment-order.dto';

@Injectable()
export class RecruitmentOrderService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createOrder(
    dto: CreateRecruitmentOrderDTO,
    res: Response,
  ): Promise<Response> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = queryRunner.manager.create(RecruitmentOrder, {
        team: dto.team || null,
        position: dto.position || null,
        status: RecruitmentOrderStatus.PENDING,
        hrLevel: dto.hrLevel || null,
        note: dto.note || null,
        quantity: dto.quantity || null,
        expiredDate: dto.expiredDate ? new Date(dto.expiredDate) : null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        createdBy: dto.createdBy || null,
        pic: dto.pic || null,
      });

      const saved = await queryRunner.manager.save(order);
      await queryRunner.commitTransaction();

      return res.status(201).json({
        message: 'Recruitment order created successfully',
        data: saved,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();

      throw new InternalServerErrorException(
        `Failed to create recruitment order: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async updateOrder(
    id: number,
    dto: UpdateRecruitmentOrderDTO,
    res: Response,
  ): Promise<Response> {
    try {
      const repo = this.dataSource.getRepository(RecruitmentOrder);
      const order = await repo.findOne({ where: { id } });

      if (!order) {
        throw new NotFoundException(
          `Recruitment order with ID ${id} not found`,
        );
      }

      if (dto.team !== undefined) order.team = dto.team;
      if (dto.position !== undefined) order.position = dto.position;
      if (dto.hrLevel !== undefined) order.hrLevel = dto.hrLevel;
      if (dto.note !== undefined) order.note = dto.note;
      if (dto.quantity !== undefined) order.quantity = dto.quantity;
      if (dto.expiredDate !== undefined) {
        order.expiredDate = dto.expiredDate ? new Date(dto.expiredDate) : null;
      }
      if (dto.startDate !== undefined) {
        order.startDate = dto.startDate ? new Date(dto.startDate) : null;
      }
      if (dto.createdBy !== undefined) order.createdBy = dto.createdBy;
      if (dto.pic !== undefined) order.pic = dto.pic;

      const updated = await repo.save(order);

      return res.status(200).json({
        message: 'Recruitment order updated successfully',
        data: updated,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to update recruitment order: ${error.message}`,
      );
    }
  }

  async updateOrderStatus(
    id: number,
    dto: UpdateRecruitmentOrderStatusDTO,
    res: Response,
  ): Promise<Response> {
    try {
      const repo = this.dataSource.getRepository(RecruitmentOrder);
      const order = await repo.findOne({ where: { id } });

      if (!order) {
        throw new NotFoundException(
          `Recruitment order with ID ${id} not found`,
        );
      }

      order.status = dto.status;
      if (dto.pic !== undefined) order.pic = dto.pic;

      const updated = await repo.save(order);

      return res.status(200).json({
        message: 'Recruitment order status updated successfully',
        data: updated,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to update recruitment order status: ${error.message}`,
      );
    }
  }

  async getAllOrdersByManager(
    headers: any,
    query: FindAllOrdersQueryDTO,
    res: Response,
  ): Promise<Response> {
    try {
      const page = Number(headers.page || 0);
      const size = Number(headers.size || 10);
      const active = headers.active || 'updatedAt';
      const direction =
        String(headers.direction || 'DESC').toUpperCase() === 'ASC'
          ? 'ASC'
          : 'DESC';

      const queryBuilder = this.dataSource
        .getRepository(RecruitmentOrder)
        .createQueryBuilder('o')
        .where('o.deletedAt IS NULL');

      if (query.email) {
        queryBuilder.andWhere('o.created_by = :email', {
          email: query.email,
        });
      }

      if (query.team) {
        queryBuilder.andWhere('o.team LIKE :team', {
          team: `%${query.team}%`,
        });
      }

      if (query.status) {
        queryBuilder.andWhere('o.status = :status', {
          status: query.status,
        });
      }

      if (query.search) {
        queryBuilder.andWhere(
          '(o.position LIKE :search OR o.hr_level LIKE :search OR o.created_by LIKE :search)',
          { search: `%${query.search}%` },
        );
      }

      const allowSort = [
        'id',
        'team',
        'position',
        'status',
        'hrLevel',
        'quantity',
        'expiredDate',
        'startDate',
        'createdAt',
        'updatedAt',
      ];

      const sortColumn = allowSort.includes(active) ? active : 'updatedAt';

      queryBuilder.orderBy(`o.${sortColumn}`, direction as 'ASC' | 'DESC');

      const [orders, total] = await queryBuilder
        .take(size)
        .skip(page * size)
        .getManyAndCount();

      return res.status(200).json({
        data: orders,
        page,
        size,
        total,
        totalPages: Math.ceil(total / size),
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve recruitment orders: ${error.message}`,
      );
    }
  }

  async getAllOrdersByRecruiter(
    query: FindAllOrdersByRecruiterQueryDTO,
    res: Response,
  ): Promise<Response> {
    try {
      const queryBuilder = this.dataSource
        .getRepository(RecruitmentOrder)
        .createQueryBuilder('o')
        .where('o.deletedAt IS NULL');

      if (query.team) {
        queryBuilder.andWhere('o.team LIKE :team', {
          team: `%${query.team}%`,
        });
      }

      if (query.position) {
        queryBuilder.andWhere('o.position LIKE :position', {
          position: `%${query.position}%`,
        });
      }

      queryBuilder.orderBy('o.updatedAt', 'DESC');

      const orders = await queryBuilder.getMany();

      const statuses = Object.values(RecruitmentOrderStatus);

      const grouped = statuses.map((status) => {
        const items = orders.filter((order) => order.status === status);

        return {
          status,
          count: items.length,
          orders: items.map((order) => ({
            ...order,
            processedCount: 0,
          })),
        };
      });

      return res.status(200).json({
        message: 'Recruitment orders retrieved successfully',
        data: grouped,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve recruitment orders: ${error.message}`,
      );
    }
  }
}