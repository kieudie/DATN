import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "./base/base.entity";

@Index("id_UNIQUE", ["id"], { unique: true })
@Entity("main_notification")
export class MainNotification extends BaseEntity {
  @Column("int", { name: "subject" })
  subject: string;

  @Column("varchar", { name: "type", length: 256 })
  type: string | null;

  @Column("longtext", { name: "title" })
  title: string;

  @Column("longtext", { name: "body" })
  body: string;

  @Column("tinyint", { name: "is_create_noti", width: 1, default: () => "'0'" })
  isCreateNoti: boolean;

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

  @Column("datetime", { name: "updated_at", nullable: true })
  updatedAt: Date | null;

  @Column("datetime", { name: "deleted_at", nullable: true })
  deletedAt: Date | null;
}
