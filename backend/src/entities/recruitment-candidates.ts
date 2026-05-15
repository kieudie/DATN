import { Expose } from "class-transformer";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  UpdateDateColumn,
} from "typeorm";
import { BaseEntity } from "./base/base.entity";
import { RecruitmentApplications } from "./recruitment-applications";
import { RecruitmentCandidatePipeline } from "./recruitment-candidate-pipeline";
import { RecruitmentCandidatesCv } from "./recruitment-candidates-cv";

@Index("ux_recruitment_candidates_email", ["email"], { unique: true })
@Entity("candidates")
@Expose()
export class RecruitmentCandidates extends BaseEntity {
   @Column("varchar", { name: "full_name", nullable: true, length: 255 })
  @Expose({ name: "full_name" })
  fullName: string | null;

  @Column("varchar", { name: "phone", nullable: true, length: 20 })
  @Expose({ name: "phone" })
  phone: string | null;

  @Column("varchar", { name: "email", length: 255, unique: true })
  @Expose({ name: "email" })
  email: string;

  @Column("varchar", { name: "gender", nullable: true, length: 20 })
  @Expose({ name: "gender" })
  gender: string | null;

  @Column("varchar", {
    name: "university_school",
    nullable: true,
    length: 255,
  })
  @Expose({ name: "university_school" })
  universitySchool: string | null;

  @Column("varchar", { name: "birthday", nullable: true, length: 50 })
  @Expose({ name: "birthday" })
  birthday: string | null;

  @CreateDateColumn({ name: "created_at", type: "datetime" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime" })
  updatedAt: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "datetime", nullable: true })
  deletedAt: Date | null;

  @OneToMany(
    () => RecruitmentApplications,
    (application) => application.candidate,
  )
  applications: RecruitmentApplications[];

  @OneToMany(() => RecruitmentCandidatesCv, (cv) => cv.candidate)
  cvs: RecruitmentCandidatesCv[];

  @OneToMany(
    () => RecruitmentCandidatePipeline,
    (pipeline) => pipeline.candidate,
  )
  pipelines: RecruitmentCandidatePipeline[];
}