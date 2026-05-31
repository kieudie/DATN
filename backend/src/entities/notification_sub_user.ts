import { Column, Entity } from "typeorm";
import { BaseEntity } from "./base/base.entity";

@Entity("notification_sub_user")
export class NotificationSubUser extends BaseEntity {
  @Column("int", { name: "personnel_code" })
  personnelCode: number;

  @Column("varchar", { name: "end_point" })
  endPoint: string;

  @Column("bigint", { name: "expiration_time" })
  expirationTime: number;

  @Column("varchar", { name: "p256dh" })
  p256dh: string;

  @Column("varchar", { name: "auth" })
  auth: string;

  @Column("datetime", {
    name: "created_at",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date | null;

  @Column("datetime", {
    name: "updated_at",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  updatedAt: Date | null;

  @Column("datetime", { name: "deleted_at", nullable: true })
  deletedAt: Date | null;
}
