import { Expose } from 'class-transformer';
import { Column, CreateDateColumn, Entity } from 'typeorm';
import { BaseEntity } from './base/base.entity';

@Entity('seedings')
@Expose()
export class Seedings extends BaseEntity {
  @Column('varchar', { name: 'name', length: 255, unique: true })
  @Expose({ name: 'name' })
  name: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}