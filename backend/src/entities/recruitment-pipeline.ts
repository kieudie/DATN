import { Expose } from "class-transformer";
import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "./base/base.entity";

@Entity("recruitment_pipeline")
@Expose()
export class RecruitmentPipeline extends BaseEntity {
  @Column("varchar", { name: "name", length: 255 })
  @Expose({ name: "name" })
  name: string;

  @Column("int", { name: "order", width: 2 })
  @Expose({ name: "order" })
  order: number;

  @Column("varchar", { name: "code", length: 50 })
  @Expose({ name: "code" })
  code: string;

  @Column("tinyint", { name: "is_active", width: 1, default: () => "'1'" })
  @Expose({ name: "is_active" })
  isActive: number;

  @OneToMany("EmailTemplate", "recruitmentPipeline")
  emailTemplates: any[];
}
