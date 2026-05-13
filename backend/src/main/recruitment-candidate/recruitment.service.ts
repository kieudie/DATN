import {
    HttpStatus,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import type { Response } from 'express';
import { PipelineService } from './pipeline/pipeline.service';

@Injectable()
export class RecruitmentService {
  constructor(private readonly pipelineService: PipelineService) {}

  async getAllPipelineStages(res: Response) {
    try {
      const pipelines = await this.pipelineService.findAll();

      const stages = pipelines.map((pipeline) => ({
        id: pipeline.id as number,
        name: pipeline.name,
        code: pipeline.code,
        order: pipeline.order,
        isActive: pipeline.isActive,
      }));

      return res.status(HttpStatus.OK).json({
        message: 'Pipeline stages retrieved successfully',
        data: stages,
      });
    } catch (error) {
      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch pipeline stages',
      });
    }
  }
}