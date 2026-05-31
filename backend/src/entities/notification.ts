import { Column, Entity } from "typeorm";
import { BaseEntity } from "./base/base.entity";

@Entity("notification")
export class Notification extends BaseEntity {
  @Column("int", { name: "main_noti_id", nullable: true })
  mainNotiId: number | null;

  @Column("int", { name: "personnel_code" })
  personnelCode: number;

  @Column("varchar", { name: "title" })
  title: string;

  @Column("varchar", { name: "body" })
  body: string;

  @Column("tinyint", {
    name: "is_send",
    nullable: true,
    default: () => "'0'",
  })
  isSend: number | null;

  @Column("tinyint", {
    name: "is_read",
    nullable: true,
    default: () => "'0'",
  })
  isRead: number | null;

  @Column("datetime", {
    name: "date",
    nullable: false,
  })
  date: string | null;

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
