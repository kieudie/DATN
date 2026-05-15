import { Expose } from "class-transformer";
import { PrimaryGeneratedColumn } from "typeorm";

export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  @Expose()
  id?: number;

  // @Column({ nullable: true })
  // created_by?: string;
  // @CreateDateColumn({ nullable: true })
  // created_date?: Date;
  // @Column({ nullable: true })
  // last_modified_by?: string;
  // @UpdateDateColumn({ nullable: true })
  // last_modified_date?: Date;
}
