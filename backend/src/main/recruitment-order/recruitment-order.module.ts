import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecruitmentOrder } from '../../entities/recruitment-order';
import { RecruitmentOrderController } from './recruitment-order.controller';
import { RecruitmentOrderService } from './recruitment-order.service';

@Module({
  imports: [TypeOrmModule.forFeature([RecruitmentOrder])],
  controllers: [RecruitmentOrderController],
  providers: [RecruitmentOrderService],
  exports: [RecruitmentOrderService],
})
export class RecruitmentOrderModule {}