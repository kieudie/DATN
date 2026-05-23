import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RecruitmentPipeline } from "src/entities/recruitment-pipeline";
import { MailRecruitmentModule } from "../mail-recruitment/mail-recruitment.module";
import { RedisCacheModule } from "../redis/redis.module";
import { ScheduledJobModule } from "../scheduled-job/scheduled-job.module";
import { ApplicationModule } from "./application/application.module";
import { CandidateCvModule } from "./candidate-cv/candidate-cv.module";
import { CandidatePipelineModule } from "./candidate-pipeline/candidate-pipeline.module";
import { CandidateModule } from "./candidate/candidate.module";
import { PipelineModule } from "./pipeline/pipeline.module";
import { RecruitmentController } from "./recruitment.controller";
import { RecruitmentService } from "./recruitment.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([RecruitmentPipeline]),
    CandidateModule,
    ApplicationModule,
    CandidateCvModule,
    CandidatePipelineModule,
    PipelineModule,
    RedisCacheModule,
    MailRecruitmentModule,
    ScheduledJobModule,
  ],
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
