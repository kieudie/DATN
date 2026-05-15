import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RecruitmentOrder } from "../../entities/recruitment-order";
import { RedisCacheModule } from "../redis/redis.module";
import { RecruitmentOrderController } from "./recruitment-order.controller";
import { RecruitmentOrderService } from "./recruitment-order.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([RecruitmentOrder]),
    RedisCacheModule,
  ],
  controllers: [RecruitmentOrderController],
  providers: [RecruitmentOrderService],
  exports: [RecruitmentOrderService],
})
export class RecruitmentOrderModule {}
