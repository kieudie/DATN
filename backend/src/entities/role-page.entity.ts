import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
} from 'typeorm';
import { AccessLevel } from '../common/constants/constants';
import { Page } from './page.entity';
import { Role } from './role.entity';

@Entity('role_pages')
export class RolePage {
  @PrimaryColumn('int', { name: 'role_id' })
  roleId!: number;

  @PrimaryColumn('int', { name: 'page_id' })
  pageId!: number;

  @Column('enum', {
    name: 'access_level',
    enum: AccessLevel,
    default: AccessLevel.NONE,
  })
  accessLevel!: AccessLevel;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  createdAt!: Date | null;

  @ManyToOne(() => Role, (role) => role.rolePages, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id', referencedColumnName: 'id' })
  role!: Role;

  @ManyToOne(() => Page, (page) => page.rolePages, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'page_id', referencedColumnName: 'id' })
  page!: Page;
}