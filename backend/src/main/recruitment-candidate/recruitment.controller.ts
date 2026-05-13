import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PipelineStageDTO } from './dto/pipeline-stage.dto';
import { RecruitmentService } from './recruitment.service';

@Controller('api/recruitment')
@ApiTags('Recruitment Management')
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Get('/pipeline-stages')
  @ApiOperation({
    summary: 'Get all recruitment pipeline stages',
    description: 'Returns all active pipeline stages ordered by order field',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pipeline stages retrieved successfully',
    type: [PipelineStageDTO],
  })
  async getAllPipelineStages(@Res() res: Response) {
    return await this.recruitmentService.getAllPipelineStages(res);
  }
}