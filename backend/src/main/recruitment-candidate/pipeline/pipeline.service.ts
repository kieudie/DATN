import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecruitmentPipeline } from '../../../entities/recruitment-pipeline';

@Injectable()
export class PipelineService {
  constructor(
    @InjectRepository(RecruitmentPipeline)
    private readonly pipelineRepository: Repository<RecruitmentPipeline>,
  ) {}

  async findAll(): Promise<RecruitmentPipeline[]> {
    return await this.pipelineRepository.find({
      where: { isActive: 1 },
      order: { order: 'ASC' },
    });
  }

  async findAllIncludingInactive(): Promise<RecruitmentPipeline[]> {
    return await this.pipelineRepository.find({
      order: { order: 'ASC' },
    });
  }

  async findByCode(code: string): Promise<RecruitmentPipeline | null> {
    return await this.pipelineRepository.findOne({
      where: { code, isActive: 1 },
    });
  }

  async findById(id: number): Promise<RecruitmentPipeline | null> {
    return await this.pipelineRepository.findOne({
      where: { id },
    });
  }
}