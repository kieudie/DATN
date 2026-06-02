import { Module } from "@nestjs/common";
import { RedisCacheModule } from "../redis/redis.module";
import { RolesModule } from "../roles/roles.module";
import { RecruitmentCalendarController } from "./recruitment-calendar.controller";
import { RecruitmentCalendarService } from "./recruitment-calendar.service";

@Module({
  imports: [RolesModule, RedisCacheModule],
  controllers: [RecruitmentCalendarController],
  providers: [RecruitmentCalendarService],
  exports: [RecruitmentCalendarService],
})
export class RecruitmentCalendarModule {}
