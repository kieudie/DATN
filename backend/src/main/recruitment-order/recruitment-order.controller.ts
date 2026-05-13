import {
    Body,
    Controller,
    Get,
    Headers,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query,
    Req,
    Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CreateRecruitmentOrderDTO } from './dto/create-recruitment-order.dto';
import {
    FindAllOrdersByRecruiterQueryDTO,
    FindAllOrdersQueryDTO,
} from './dto/find-all-orders-query.dto';
import { UpdateRecruitmentOrderStatusDTO } from './dto/update-recruitment-order-status.dto';
import { UpdateRecruitmentOrderDTO } from './dto/update-recruitment-order.dto';
import { RecruitmentOrderService } from './recruitment-order.service';

@Controller('api/recruitment-order')
@ApiTags('Recruitment Order')
export class RecruitmentOrderController {
  constructor(
    private readonly recruitmentOrderService: RecruitmentOrderService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new recruitment order',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Recruitment order created successfully',
  })
  async createOrder(
    @Body() dto: CreateRecruitmentOrderDTO,
    @Res() res: Response,
  ) {
    return await this.recruitmentOrderService.createOrder(dto, res);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a recruitment order excluding status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recruitment order updated successfully',
  })
  async updateOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecruitmentOrderDTO,
    @Res() res: Response,
  ) {
    return await this.recruitmentOrderService.updateOrder(id, dto, res);
  }

  @Put(':id/status')
  @ApiOperation({
    summary: 'Update recruitment order status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recruitment order status updated successfully',
  })
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecruitmentOrderStatusDTO,
    @Req() req: any,
    @Res() res: Response,
  ) {
    dto.pic = req.user?.personnelCode ?? req.user?.email ?? dto.pic ?? null;
    return await this.recruitmentOrderService.updateOrderStatus(id, dto, res);
  }

  @Get('manager/all')
  @ApiOperation({
    summary: 'Get all recruitment orders for manager view',
    description:
      'Lọc theo email created_by, team, status. Search theo position, hr_level hoặc created_by.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recruitment orders retrieved successfully',
  })
  async getAllOrdersByManager(
    @Headers() headers: any,
    @Query() query: FindAllOrdersQueryDTO,
    @Res() res: Response,
  ) {
    return await this.recruitmentOrderService.getAllOrdersByManager(
      headers,
      query,
      res,
    );
  }

  @Get('recruiter/all')
  @ApiOperation({
    summary: 'Get all recruitment orders for recruiter view',
    description: 'Data trả về group theo status.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recruitment orders grouped by status',
  })
  async getAllOrdersByRecruiter(
    @Query() query: FindAllOrdersByRecruiterQueryDTO,
    @Res() res: Response,
  ) {
    return await this.recruitmentOrderService.getAllOrdersByRecruiter(
      query,
      res,
    );
  }
}