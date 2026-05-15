import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { multerConfig } from '../../common/helpers/filename-encoding.helper';
import { AuthGuard, RoleType, Roles, RolesGuard } from '../../security';
import { BaseHeaderDTO } from '../base/base.header';
import { ApplicationResponseDTO } from './dto/application-response.dto';
import { BulkImportResultDTO } from './dto/bulk-import-response.dto';
import { CandidateResponseDTO } from './dto/candidate-response.dto';
import { CheckCandidateResponseDTO } from './dto/check-candidate-response.dto';
import { CheckCandidateDTO } from './dto/check-candidate.dto';
import { CreateCandidateDTO } from './dto/create-candidate.dto';
import { FindAllCandidatesQueryDto } from './dto/find-all-candidates-query.dto';
import { GroupedCandidatesQueryDto } from './dto/grouped-candidates-query.dto';
import { MailRecruitmentDTO } from './dto/mail-recruitment.dto';
import { PipelineStageDTO } from './dto/pipeline-stage.dto';
import { UpdateApplicationDTO } from './dto/update-application.dto';
import { UpdateCandidateStatusDTO } from './dto/update-candidate-status.dto';
import { UpdateCandidateDTO } from './dto/update-candidate.dto';
import { RecruitmentService } from './recruitment.service';

type AuthenticatedRequest = Request & {
  user?: {
    user_id?: number;
    email?: string;
    roles?: string[];
  };
};

type UploadedFileType = {
  originalname: string;
  filename: string;
  path: string;
  mimetype?: string;
  size?: number;
};

@Controller('api/recruitment')
@ApiTags('Recruitment Management')
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Post('/candidate')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: 'Create a new candidate or add application to existing candidate',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Application created successfully',
    type: ApplicationResponseDTO,
  })
  async createCandidate(
    @Body() createCandidateDto: CreateCandidateDTO,
    @Req() request: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    return this.recruitmentService.createCandidate(
      createCandidateDto,
      request.user?.user_id as number,
      res,
    );
  }

  @Post('/candidates/bulk-import')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file containing candidate data',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Bulk import candidates from CSV file',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk import completed',
    type: BulkImportResultDTO,
  })
  async bulkImportCandidates(
    @UploadedFile() file: UploadedFileType,
    @Req() request: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    return this.recruitmentService.bulkImportFromCSV(
      file,
      request.user?.user_id as number,
      res,
    );
  }

  @Get('/candidate/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({ summary: 'Get candidate by ID with all applications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Candidate found successfully',
    type: CandidateResponseDTO,
  })
  async getCandidateById(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    return this.recruitmentService.findCandidateById(id, res);
  }

  @Get('/candidates')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: 'Get all candidates with pagination and filters',
  })
  async getAllCandidates(
    @Headers() header: BaseHeaderDTO,
    @Query() query: FindAllCandidatesQueryDto,
    @Res() res: Response,
  ) {
    return this.recruitmentService.findAllCandidates(header, query, res);
  }

  @Put('/candidate/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: 'Update candidate basic information',
  })
  async updateCandidate(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCandidateDto: UpdateCandidateDTO,
    @Res() res: Response,
  ) {
    return this.recruitmentService.updateCandidate(id, updateCandidateDto, res);
  }

  @Put('/application/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: 'Update application information and status',
  })
  async updateApplication(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateApplicationDto: UpdateApplicationDTO,
    @Res() res: Response,
  ) {
    return this.recruitmentService.updateApplication(
      id,
      updateApplicationDto,
      res,
    );
  }

  @Put('/candidate/:id/status')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: 'Update candidate recruitment status and create pipeline history',
  })
  async updateCandidateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateCandidateStatusDTO,
    @Req() request: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    return this.recruitmentService.updateCandidateStatus(
      id,
      updateStatusDto,
      request.user?.user_id as number,
      res,
    );
  }

  @Get('/pipeline-stages')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: 'Get all recruitment pipeline stages',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pipeline stages retrieved successfully',
    type: [PipelineStageDTO],
  })
  async getAllPipelineStages(@Res() res: Response) {
    const stages = await this.recruitmentService.getAllPipelineStages();

    return res.status(HttpStatus.OK).json({
      message: 'Pipeline stages retrieved successfully',
      data: stages,
    });
  }

  @Get('/candidates/grouped-by-status')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: 'Get all candidates grouped by status',
  })
  async getCandidatesGroupedByStatus(
    @Query() query: GroupedCandidatesQueryDto,
    @Res() res: Response,
  ) {
    const groupedData =
      await this.recruitmentService.getCandidatesGroupedByStatus(
        query.position,
        query.search,
        query.startDate,
        query.endDate,
        query.pic,
      );

    const totalCandidates = groupedData.reduce(
      (sum, group) => sum + group.count,
      0,
    );

    return res.status(HttpStatus.OK).json({
      message: 'Candidates grouped by status retrieved successfully',
      data: groupedData,
      totalCandidates,
    });
  }

  @Post('/candidate/:id/send-email')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @UseInterceptors(FilesInterceptor('attachments', 10, multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Send an email to the candidate',
  })
  async sendTestEmail(
    @Param('id', ParseIntPipe) id: number,
    @Body() mailData: MailRecruitmentDTO,
    @UploadedFiles() files: UploadedFileType[],
    @Res() res: Response,
  ) {
    return this.recruitmentService.sendEmails(id, mailData, files, res);
  }

  @Get('/statistics/positions')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: 'Get statistics of all positions with application count',
  })
  async getPositionStatistics(@Res() res: Response) {
    const result = await this.recruitmentService.getPositionStatistics();

    return res.status(HttpStatus.OK).json({
      message: 'Position statistics retrieved successfully',
      data: result.positions,
      totalApplications: result.totalApplications,
    });
  }

  @Post('/candidate/check')
  @ApiOperation({
    summary: 'Check if candidate exists by email or phone',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Candidate information retrieved successfully',
    type: CheckCandidateResponseDTO,
  })
  async checkCandidate(
    @Body() checkCandidateDto: CheckCandidateDTO,
    @Res() res: Response,
  ) {
    const result = await this.recruitmentService.checkCandidateByEmailOrPhone(
      checkCandidateDto,
    );

    return res.status(HttpStatus.OK).json({
      message: result.exists
        ? 'Candidate found in system'
        : 'Candidate not found',
      data: result,
    });
  }
}