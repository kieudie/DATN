import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduledJob } from "../../entities/scheduled-job";
import { MailRecruitmentModule } from "../mail-recruitment/mail-recruitment.module";
import { ApplicationModule } from "../recruitment-candidate/application/application.module";
import { ScheduledJobService } from "./scheduled-job.service";
import { ScheduledJobWorker } from "./scheduled-job.worker";

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledJob]),
    MailRecruitmentModule,
    ApplicationModule,
  ],
  providers: [ScheduledJobService, ScheduledJobWorker],
  exports: [ScheduledJobService],
})
export class ScheduledJobModule {}
