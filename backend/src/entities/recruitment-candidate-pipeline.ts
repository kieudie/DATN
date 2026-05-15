import { Expose } from "class-transformer";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from "typeorm";
import { BaseEntity } from "./base/base.entity";
import { RecruitmentApplications } from "./recruitment-applications";
import { RecruitmentCandidates } from "./recruitment-candidates";
import { User } from "./user";

export type CandidatePipelineResult = "pass" | "fail" | "pending";

@Index("idx_recruitment_candidate_pipeline_candidate_id", ["candidateId"], {})
@Index("idx_pipeline_application_id", ["applicationId"], {})
@Index("recruitment_pipeline_code", ["recruitmentPipelineCode"], {})
@Entity("candidate_pipeline")
@Expose()
export class RecruitmentCandidatePipeline extends BaseEntity {
  @Column("int", { name: "candidate_id" })
  @Expose({ name: "candidate_id" })
  candidateId: number;

  @Column("int", { name: "application_id" })
  @Expose({ name: "application_id" })
  applicationId: number;

  @Column("varchar", { name: "recruitment_pipeline_code", length: 50 })
  @Expose({ name: "recruitment_pipeline_code" })
  recruitmentPipelineCode: string;

  @Column("datetime", { name: "start_time" })
  @Expose({ name: "start_time" })
  startTime: Date;

  @Column("datetime", { name: "end_time", nullable: true })
  @Expose({ name: "end_time" })
  endTime: Date | null;

  @Column("enum", {
    name: "result",
    enum: ["pass", "fail", "pending"],
    default: "pending",
  })
  @Expose({ name: "result" })
  result: CandidatePipelineResult;

  @Column("text", { name: "note", nullable: true })
  @Expose({ name: "note" })
  note: string | null;

  @Column("int", { name: "created_by", nullable: true })
  @Expose({ name: "created_by" })
  createdBy: number | null;

  @ManyToOne(() => User, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: "created_by", referencedColumnName: "id" })
  creator?: User | null;

  @CreateDateColumn({ name: "created_at", type: "datetime" })
  createdAt: Date;

  @ManyToOne(() => RecruitmentCandidates, (candidate) => candidate.pipelines, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "candidate_id" })
  candidate: RecruitmentCandidates;

  @ManyToOne(
    () => RecruitmentApplications,
    (application) => application.pipelineHistory,
    {
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  )
  @JoinColumn({ name: "application_id" })
  application: RecruitmentApplications;
}