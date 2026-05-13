import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { RolePage } from './role-page.entity';

@Entity('pages')
@Index('uniq_pages_code', ['code'], { unique: true })
@Index('uniq_pages_path', ['path'], { unique: true })
export class Page {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id!: number;

  @Column('int', {
    name: 'parent_id',
    nullable: true,
  })
  parentId!: number | null;

  @ManyToOne(() => Page, (page) => page.children, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id', referencedColumnName: 'id' })
  parent!: Page | null;

  @OneToMany(() => Page, (page) => page.parent)
  children!: Page[];

  @Column('varchar', {
    name: 'code',
    length: 50,
    unique: true,
  })
  code!: string;

  @Column('varchar', {
    name: 'name',
    length: 100,
  })
  name!: string;

  @Column('varchar', {
    name: 'path',
    length: 255,
    unique: true,
  })
  path!: string;

  @Column('text', {
    name: 'description',
    nullable: true,
  })
  description!: string | null;

  @Column('tinyint', {
    name: 'has_children',
    width: 1,
    default: () => "'0'",
  })
  hasChildren!: number;

  @Column('tinyint', {
    name: 'is_group',
    width: 1,
    default: () => "'0'",
  })
  isGroup!: number;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  createdAt!: Date | null;

  @UpdateDateColumn({
    type: 'timestamp',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  updatedAt!: Date | null;

  @DeleteDateColumn({
    type: 'timestamp',
    name: 'deleted_at',
    nullable: true,
  })
  deletedAt!: Date | null;

  @Column('int', {
    name: 'priority',
    default: () => "'0'",
  })
  priority!: number;

  @OneToMany(() => RolePage, (rolePage) => rolePage.page)
  rolePages!: RolePage[];
}