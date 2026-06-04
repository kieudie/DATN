import { Module } from "@nestjs/common";
import { RecruitmentReportController } from "./recruitment-report.controller";
import { RecruitmentReportService } from "./recruitment-report.service";
import { RedisCacheModule } from "../redis/redis.module";
import { RolesModule } from "../roles/roles.module";

@Module({
    imports: [    
        RolesModule,
        RedisCacheModule,
    ],
  controllers: [RecruitmentReportController],
  providers: [RecruitmentReportService],
})
export class RecruitmentReportModule {}
