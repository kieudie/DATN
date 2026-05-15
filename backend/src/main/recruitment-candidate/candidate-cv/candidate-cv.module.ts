import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RecruitmentCandidatesCv } from "../../../entities/recruitment-candidates-cv";
import { CandidateCvService } from "./candidate-cv.service";

@Module({
  imports: [TypeOrmModule.forFeature([RecruitmentCandidatesCv])],
  providers: [CandidateCvService],
  exports: [CandidateCvService],
})
export class CandidateCvModule {}
