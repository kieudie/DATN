import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecruitmentPipeline } from '../../../entities/recruitment-pipeline';
import { PipelineService } from './pipeline.service';

@Module({
  imports: [TypeOrmModule.forFeature([RecruitmentPipeline])],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}