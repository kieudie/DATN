import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RecruitmentCandidates } from "../../../entities/recruitment-candidates";
import { CandidateService } from "./candidate.service";

@Module({
  imports: [TypeOrmModule.forFeature([RecruitmentCandidates])],
  providers: [CandidateService],
  exports: [CandidateService],
})
export class CandidateModule {}
