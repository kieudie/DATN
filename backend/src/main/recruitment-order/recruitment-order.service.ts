import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { Response } from "express";
import { DataSource } from "typeorm";
import { SORT } from "../../common/constants/constants";
import {
  RECRUITMENT_PIPELINE_CODES,
  RecruitmentOrderStatus,
} from "../../common/constants/recruitment.constants";
import { handleResPagination } from "../../common/functions/paginate";
import { LoggerService } from "../../common/logger/logger.service";
import { PageRequest } from "../../entities/base/pagination.entity";
import { RecruitmentApplications } from "../../entities/recruitment-applications";
import { RecruitmentOrder } from "../../entities/recruitment-order";
import { BaseHeaderDTO } from "../base/base.header";
import { CreateRecruitmentOrderDTO } from "./dto/create-recruitment-order.dto";
import {
  FindAllOrdersByRecruiterQueryDTO,
  FindAllOrdersQueryDTO,
} from "./dto/find-all-orders-query.dto";
import { UpdateRecruitmentOrderStatusDTO } from "./dto/update-recruitment-order-status.dto";
import { UpdateRecruitmentOrderDTO } from "./dto/update-recruitment-order.dto";

@Injectable()
export class RecruitmentOrderService {
  private readonly logger = new LoggerService("RecruitmentOrderService");

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  /**
   * Create a new recruitment order
   */
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

      this.logger.log(`Created recruitment order with ID: ${saved.id}`);

      return res.status(201).json({
        message: "Recruitment order created successfully",
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

  /**
   * Update a recruitment order (excluding status)
   */
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
        message: "Recruitment order updated successfully",
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

  /**
   * Update recruitment order status only
   */
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

      if (dto.pic !== undefined) {
        order.pic = dto.pic;
      }

      const updated = await repo.save(order);

      return res.status(200).json({
        message: "Recruitment order status updated successfully",
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

  /**
   * Get all orders for manager view (paginated with filters)
   */
  async getAllOrdersByManager(
    header: BaseHeaderDTO,
    query: FindAllOrdersQueryDTO,
    res: Response,
  ): Promise<Response> {
    try {
      const { page, size, active, direction } = header;
      const paginate = new PageRequest(page, size, `${active},${direction}`);

      const queryBuilder = this.dataSource
        .getRepository(RecruitmentOrder)
        .createQueryBuilder("o")
        .where("o.deletedAt IS NULL");

      if (query.email) {
        queryBuilder.andWhere("o.createdBy = :email", {
          email: query.email,
        });
      }

      if (query.team) {
        queryBuilder.andWhere("o.team LIKE :team", {
          team: `%${query.team}%`,
        });
      }

      if (query.status) {
        queryBuilder.andWhere("o.status = :status", {
          status: query.status,
        });
      }

      if (query.search) {
        queryBuilder.andWhere(
          "(o.position LIKE :search OR o.hrLevel LIKE :search OR o.createdBy LIKE :search)",
          { search: `%${query.search}%` },
        );
      }

      if (active && direction) {
        queryBuilder.orderBy(
          `o.${paginate.sort.property}`,
          paginate.sort.direction.toLocaleUpperCase() === SORT.DESC
            ? SORT.DESC
            : SORT.ASC,
        );
      } else {
        queryBuilder.orderBy("o.updatedAt", "DESC");
      }

      const [orders, total] = await queryBuilder
        .take(paginate.size)
        .skip(paginate.skip)
        .getManyAndCount();

      const result = handleResPagination(
        orders,
        total,
        paginate.page,
        paginate.size,
      );

      return res.status(200).json(result);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve recruitment orders: ${error.message}`,
      );
    }
  }

  /**
   * Get all orders for recruiter view, grouped by status.
   * Each order includes processedCount:
   * number of applications that matched the order id and have status = onboarding.
   */
  async getAllOrdersByRecruiter(
    query: FindAllOrdersByRecruiterQueryDTO,
    res: Response,
  ): Promise<Response> {
    try {
      const queryBuilder = this.dataSource
        .getRepository(RecruitmentOrder)
        .createQueryBuilder("o")
        .where("o.deletedAt IS NULL");

      if (query.team) {
        queryBuilder.andWhere("o.team LIKE :team", {
          team: `%${query.team}%`,
        });
      }

      if (query.position) {
        queryBuilder.andWhere("o.position LIKE :position", {
          position: `%${query.position}%`,
        });
      }

      queryBuilder.orderBy("o.updatedAt", "DESC");

      const orders = await queryBuilder.getMany();

      const ordersWithCount = await Promise.all(
        orders.map(async (order) => {
          let processedCount = 0;

          if (order.id) {
            processedCount = await this.dataSource
              .getRepository(RecruitmentApplications)
              .createQueryBuilder("app")
              .where("app.position = :position", {
                position: String(order.id),
              })
              .andWhere("app.status = :status", {
                status: RECRUITMENT_PIPELINE_CODES.ONBOARDING,
              })
              .andWhere("app.deletedAt IS NULL")
              .getCount();
          }

          return {
            ...order,
            processedCount,
          };
        }),
      );

      const statuses = Object.values(RecruitmentOrderStatus);

      const grouped = statuses.map((status) => {
        const items = ordersWithCount.filter((order) => order.status === status);

        return {
          status,
          count: items.length,
          orders: items,
        };
      });

      return res.status(200).json({
        message: "Recruitment orders retrieved successfully",
        data: grouped,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve recruitment orders: ${error.message}`,
      );
    }
  }
}