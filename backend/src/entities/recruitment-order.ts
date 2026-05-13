import { Expose } from "class-transformer";
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    Index,
    UpdateDateColumn,
} from "typeorm";
import { BaseEntity } from "./base/base.entity";

export enum RecruitmentOrderStatus {
  INPROGRESS = "inprogress",
  CLOSED = "closed",
  CANCELLED = "cancelled",
  PENDING = "pending",
  EXPIRED = "expired",
}

@Index("idx_order_status", ["status"])
@Index("idx_order_created_by", ["createdBy"])
@Index("idx_order_pic", ["pic"])
@Entity("recruitment_orders")
@Expose()
export class RecruitmentOrder extends BaseEntity {
  @Column("varchar", { name: "team", nullable: true, length: 50 })
  @Expose({ name: "team" })
  team: string | null;

  @Column("varchar", { name: "position", nullable: true, length: 255 })
  @Expose({ name: "position" })
  position: string | null;

  @Column({
    type: "enum",
    enum: RecruitmentOrderStatus,
    name: "status",
    default: RecruitmentOrderStatus.PENDING,
  })
  @Expose({ name: "status" })
  status: RecruitmentOrderStatus;

  @Column("varchar", { name: "hr_level", nullable: true, length: 255 })
  @Expose({ name: "hr_level" })
  hrLevel: string | null;

  @Column("text", { name: "note", nullable: true })
  @Expose({ name: "note" })
  note: string | null;

  @Column("varchar", { name: "quantity", nullable: true, length: 10 })
  @Expose({ name: "quantity" })
  quantity: string | null;

  @Column("date", { name: "expired_date", nullable: true })
  @Expose({ name: "expired_date" })
  expiredDate: Date | null;

  @Column("date", { name: "start_date", nullable: true })
  @Expose({ name: "start_date" })
  startDate: Date | null;

  @Column("varchar", { name: "created_by", nullable: true, length: 50 })
  @Expose({ name: "created_by" })
  createdBy: string | null;

  @Column("varchar", { name: "pic", nullable: true, length: 10 })
  @Expose({ name: "pic" })
  pic: string | null;

  @CreateDateColumn({ name: "created_at", type: "datetime" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime" })
  updatedAt: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "datetime", nullable: true })
  deletedAt: Date | null;
}