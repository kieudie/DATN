import { Expose } from 'class-transformer';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base/base.entity';
import { RecruitmentPipeline } from './recruitment-pipeline';

export type EmailTemplateType = 'invite' | 'pass' | 'fail';

@Index(
  'idx_email_template_recruitment_pipeline_id',
  ['recruitmentPipelineId'],
  {},
)
@Entity('email_template')
@Expose()
export class EmailTemplate extends BaseEntity {
  @Column('int', { name: 'recruitment_pipeline_id' })
  @Expose({ name: 'recruitment_pipeline_id' })
  recruitmentPipelineId: number;

  @Column('enum', {
    name: 'type',
    enum: ['invite', 'pass', 'fail'],
  })
  @Expose({ name: 'type' })
  type: EmailTemplateType;

  @Column('varchar', { name: 'subject', length: 255 })
  @Expose({ name: 'subject' })
  subject: string;

  @Column('text', { name: 'content_html' })
  @Expose({ name: 'content_html' })
  contentHtml: string;

  @Column('json', { name: 'data', nullable: true })
  @Expose({ name: 'data' })
  data: Record<string, any> | null;

  @Column('tinyint', { name: 'is_active', width: 1, default: () => "'1'" })
  @Expose({ name: 'is_active' })
  isActive: number;

  @ManyToOne(() => RecruitmentPipeline, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'recruitment_pipeline_id' })
  recruitmentPipeline: RecruitmentPipeline;
}