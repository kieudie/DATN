import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from "typeorm";
import { RecruitmentApplications } from "./recruitment-applications";
import { RecruitmentManager } from "./recruitment-manager";

export enum ReviewStatus {
  PENDING = "PENDING",
  APPROVE = "APPROVE",
  REJECT = "REJECT",
}

@Entity("recruitment_candidate_manager_review")
@Index(["application_id", "pipeline_code", "reviewer_id"], { unique: true })
export class RecruitmentCandidateManagerReview {
  @PrimaryGeneratedColumn({ type: "int", unsigned: true })
  id: number;

  @Column({ type: "int", nullable: false })
  application_id: number;

  @Column({ type: "varchar", length: 50, nullable: true })
  pipeline_code: string;

  @Column({ type: "int", nullable: false })
  reviewer_id: number;

  @Column({
    type: "enum",
    enum: ReviewStatus,
    nullable: false,
  })
  status: ReviewStatus;

  @Column({ type: "text", nullable: true })
  note: string;

  @Column({ type: "date", nullable: true })
  reviewed_at: Date;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  // Relations
  @ManyToOne(
    () => RecruitmentApplications,
    (application) => application.managerReviews,
    {
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  )
  @JoinColumn({ name: "application_id" })
  application: RecruitmentApplications;

  @ManyToOne(() => RecruitmentManager, (manager) => manager.reviews, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "reviewer_id" })
  reviewer: RecruitmentManager;
}
