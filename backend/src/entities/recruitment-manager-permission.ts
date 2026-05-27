import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ManagerPermissionScope } from "../common/constants/recruitment.constants";
import { RecruitmentManager } from './recruitment-manager';
@Entity("recruitment_manager_permissions")
export class RecruitmentManagerPermission {
  @PrimaryGeneratedColumn({ type: "int" })
  id: number;

  @Column({ name: "manager_id", type: "int", nullable: false })
  managerId: number;

  @Column({
    type: "enum",
    enum: ManagerPermissionScope,
    nullable: false,
  })
  scope: ManagerPermissionScope;

  @Column({ type: "varchar", length: 255, nullable: false })
  specialization: string;

  @Column({ name: "is_active", type: "tinyint", width: 1, default: 1 })
  isActive: number;

  @Column({
    name: "created_at",
    type: "datetime",
    nullable: false,
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date;

  @ManyToOne(() => RecruitmentManager, (m) => m.managerPermissions)
  @JoinColumn({ name: "manager_id" })
  manager: RecruitmentManager;
}
