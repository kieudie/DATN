import { Expose } from "class-transformer";
import { TestOnlineStatus } from "src/common/constants/recruitment.constants";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  UpdateDateColumn,
} from "typeorm";
import { BaseEntity } from "./base/base.entity";
import { RecruitmentCandidatePipeline } from "./recruitment-candidate-pipeline";
import { RecruitmentCandidates } from "./recruitment-candidates";
import { RecruitmentCandidatesCv } from "./recruitment-candidates-cv";

@Index("idx_application_candidate_id", ["candidateId"], {})
@Index("idx_application_status", ["status"], {})
@Entity("applications")
@Expose()
export class RecruitmentApplications extends BaseEntity {
   @Column("int", { name: "candidate_id" })
  @Expose({ name: "candidate_id" })
  candidateId: number;

  @Column("varchar", { name: "position", nullable: true, length: 255 })
  @Expose({ name: "position" })
  position: string | null;

  @Column("varchar", { name: "level", nullable: true, length: 50 })
  @Expose({ name: "level" })
  level: string | null;

  @Column("varchar", { name: "department", nullable: true, length: 100 })
  @Expose({ name: "department" })
  department: string | null;

  @Column("varchar", { name: "source", nullable: true, length: 100 })
  @Expose({ name: "source" })
  source: string | null;

  @Column("date", { name: "applied_date", nullable: true })
  @Expose({ name: "applied_date" })
  appliedDate: Date | null;

  @Column("varchar", {
    name: "status",
    length: 50,
    default: "received_cv",
  })
  @Expose({ name: "status" })
  status: string;

  @Column("varchar", { name: "iq_test", nullable: true, length: 50 })
  @Expose({ name: "iq_test" })
  iqTest: string | null;

  @Column("varchar", { name: "tech_test", nullable: true, length: 50 })
  @Expose({ name: "tech_test" })
  techTest: string | null;

  @Column("varchar", { name: "thinking_test", nullable: true, length: 50 })
  @Expose({ name: "thinking_test" })
  thinkingTest: string | null;

  @Column("date", { name: "onboarding_date", nullable: true })
  @Expose({ name: "onboarding_date" })
  onboardingDate: Date | null;

  @Column("text", { name: "note", nullable: true })
  @Expose({ name: "note" })
  note: string | null;

  @Column("int", { name: "created_by", nullable: true, width: 11 })
  @Expose({ name: "created_by" })
  createdBy: number | null;

  @Column({
    type: "enum",
    enum: TestOnlineStatus,
    name: "test_online_status",
    nullable: true,
  })
  @Expose({ name: "test_online_status" })
  testOnlineStatus: TestOnlineStatus | null;

  @Column("varchar", { name: "gpa", nullable: true, length: 50 })
  @Expose({ name: "gpa" })
  gpa: string | null;
  @CreateDateColumn({ name: "created_at", type: "datetime" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime" })
  updatedAt: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "datetime", nullable: true })
  deletedAt: Date | null;

  // Relations
  @ManyToOne(
    () => RecruitmentCandidates,
    (candidate) => candidate.applications,
    {
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  )
  @JoinColumn({ name: "candidate_id" })
  candidate: RecruitmentCandidates;

  @OneToMany(() => RecruitmentCandidatesCv, (cv) => cv.application)
  cvs: RecruitmentCandidatesCv[];

  @OneToMany(
    () => RecruitmentCandidatePipeline,
    (pipeline) => pipeline.application,
  )
  pipelineHistory: RecruitmentCandidatePipeline[];

  // @OneToMany(
  //   () => RecruitmentCandidateManagerReview,
  //   (managerReview) => managerReview.application,
  // )
  // managerReviews: RecruitmentCandidateManagerReview[];
}