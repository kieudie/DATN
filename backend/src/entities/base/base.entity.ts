import { Expose } from "class-transformer";
import { PrimaryGeneratedColumn } from "typeorm";

export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  @Expose()
  id?: number;
}