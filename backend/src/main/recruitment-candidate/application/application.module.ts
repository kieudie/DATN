import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RecruitmentApplications } from "../../../entities/recruitment-applications";
import { ApplicationService } from "./application.service";

@Module({
  imports: [TypeOrmModule.forFeature([RecruitmentApplications])],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
