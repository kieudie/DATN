import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RecruitmentPipeline } from "../../entities/recruitment-pipeline";
import { ScheduledJob } from "../../entities/scheduled-job";
import { RedisCacheModule } from "../redis/redis.module";
import { ApplicationModule } from "./application/application.module";
import { CandidateCvModule } from "./candidate-cv/candidate-cv.module";
import { CandidatePipelineModule } from "./candidate-pipeline/candidate-pipeline.module";
import { CandidateModule } from "./candidate/candidate.module";
import { PipelineModule } from "./pipeline/pipeline.module";
import { RecruitmentController } from "./recruitment.controller";
import { RecruitmentService } from "./recruitment.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([RecruitmentPipeline, ScheduledJob]),
    CandidateModule,
    ApplicationModule,
    CandidateCvModule,
    CandidatePipelineModule,
    PipelineModule,   
    RedisCacheModule,
  ],
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
