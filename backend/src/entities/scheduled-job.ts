import { Expose } from "class-transformer";
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    UpdateDateColumn,
} from "typeorm";
import { BaseEntity } from "./base/base.entity";

export type ScheduledJobStatus =
  | "pending"
  | "processing"
  | "done"
  | "failed";

@Index("idx_job_pending_execute", ["status", "executeAt"], {})
@Entity("scheduled_job")
@Expose()
export class ScheduledJob extends BaseEntity {
  @Column("varchar", { name: "job_type", length: 50 })
  @Expose({ name: "job_type" })
  jobType: string;

  @Column("varchar", { name: "ref_type", length: 50 })
  @Expose({ name: "ref_type" })
  refType: string;

  @Column("int", { name: "ref_id" })
  @Expose({ name: "ref_id" })
  refId: number;

  @Column("datetime", { name: "execute_at" })
  @Expose({ name: "execute_at" })
  executeAt: Date;

  @Column("json", { name: "payload" })
  @Expose({ name: "payload" })
  payload: any;

  @Column("enum", {
    name: "status",
    enum: ["pending", "processing", "done", "failed"],
    default: "pending",
  })
  @Expose({ name: "status" })
  status: ScheduledJobStatus;

  @CreateDateColumn({ name: "created_at", type: "datetime" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime" })
  updatedAt: Date;
}