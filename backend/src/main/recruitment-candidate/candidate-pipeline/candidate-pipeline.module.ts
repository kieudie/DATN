import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RecruitmentCandidatePipeline } from "../../../entities/recruitment-candidate-pipeline";
import { CandidatePipelineService } from "./candidate-pipeline.service";

@Module({
  imports: [TypeOrmModule.forFeature([RecruitmentCandidatePipeline])],
  providers: [CandidatePipelineService],
  exports: [CandidatePipelineService],
})
export class CandidatePipelineModule {}
