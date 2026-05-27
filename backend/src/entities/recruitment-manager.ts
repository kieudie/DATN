import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { RecruitmentCandidateManagerReview } from "./recruitment-candidate-manager-review";
import { RecruitmentManagerPermission } from "./recruitment-manager-permission";

@Entity("recruitment_manager")
export class RecruitmentManager {
  @PrimaryGeneratedColumn({ type: "int", unsigned: true })
  id: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  name: string;

  @Column({ type: "varchar", length: 255, nullable: false, unique: true })
  email: string;

  @Column({ type: "tinyint", width: 1, default: 0 })
  is_cc: number;

  @Column({ type: "varchar", length: 50, nullable: true })
  department_name: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  specialization: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  is_techlead: string;

  // Relations
  @OneToMany(
    () => RecruitmentCandidateManagerReview,
    (review) => review.reviewer,
  )
  reviews: RecruitmentCandidateManagerReview[];

  @OneToMany(() => RecruitmentManagerPermission, (mp) => mp.manager)
  managerPermissions: RecruitmentManagerPermission[];
}
