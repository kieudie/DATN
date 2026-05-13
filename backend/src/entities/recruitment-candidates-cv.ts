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

@Index("idx_recruitment_candidates_cv_candidate_id", ["candidateId"], {})
@Index("idx_cv_application_id", ["applicationId"], {})
@Entity("candidate_cvs")
@Expose()
export class RecruitmentCandidatesCv extends BaseEntity {
  @Column("int", { name: "candidate_id" })
  @Expose({ name: "candidate_id" })
  candidateId: number;

  @Column("int", { name: "application_id" })
  @Expose({ name: "application_id" })
  applicationId: number;

  @Column("text", { name: "file_path" })
  @Expose({ name: "file_path" })
  filePath: string;

  @Column("text", { name: "product_links", nullable: true })
  @Expose({ name: "product_links" })
  productLinks: string | null;

  @CreateDateColumn({ name: "created_at", type: "datetime" })
  createdAt: Date;

  @ManyToOne(() => RecruitmentCandidates, (candidate) => candidate.cvs, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "candidate_id" })
  candidate: RecruitmentCandidates;

  @ManyToOne(
    () => RecruitmentApplications,
    (application) => application.cvs,
    {
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  )
  @JoinColumn({ name: "application_id" })
  application: RecruitmentApplications;
}