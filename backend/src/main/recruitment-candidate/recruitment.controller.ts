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
  UploadedFiles,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { Response } from "express";
import {
  multerConfig,
} from "../../common/helpers/filename-encoding.helper";
import { AuthGuard, Roles, RolesGuard, RoleType } from "../../security";
import { BaseHeaderDTO } from "../base/base.header";
import { ApplicationResponseDTO } from "./dto/application-response.dto";
import { CandidateResponseDTO } from "./dto/candidate-response.dto";
import { CheckCandidateResponseDTO } from "./dto/check-candidate-response.dto";
import { CheckCandidateDTO } from "./dto/check-candidate.dto";
import { CreateCandidateDTO } from "./dto/create-candidate.dto";
import { FindAllCandidatesQueryDto } from "./dto/find-all-candidates-query.dto";
import { GetCandidatesPagedQueryDto } from "./dto/get-candidates-paged-query.dto";
import { GroupedCandidatesQueryDto } from "./dto/grouped-candidates-query.dto";
import { MailRecruitmentDTO } from "./dto/mail-recruitment.dto";
import { PipelineStageDTO } from "./dto/pipeline-stage.dto";
import { UpdateApplicationDTO } from "./dto/update-application.dto";
import { UpdateCandidateStatusDTO } from "./dto/update-candidate-status.dto";
import { UpdateCandidateDTO } from "./dto/update-candidate.dto";
import { RecruitmentService } from "./recruitment.service";

@Controller("api/recruitment")
@ApiTags("Recruitment Management")
export class RecruitmentController {
  constructor(
    private readonly recruitmentService: RecruitmentService,
  ) {}

  @Post("/candidate")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: "Create a new candidate or add application to existing candidate",
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Application created successfully",
    type: ApplicationResponseDTO,
  })
  async createCandidate(
    @Body() createCandidateDto: CreateCandidateDTO,
    @Req() request: any,
    @Res() res: Response,
  ) {
    return await this.recruitmentService.createCandidate(
      createCandidateDto,
      request.user.personnelCode,
      res,
    );
  }


  @Get("/candidate/:id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({ summary: "Get candidate by ID with all applications" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Candidate found successfully",
    type: CandidateResponseDTO,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Candidate not found",
  })
  async getCandidateById(
    @Param("id", ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    return await this.recruitmentService.findCandidateById(id, res);
  }

  @Get("/candidates")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: "Get all candidates with pagination and filters",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Candidates retrieved successfully with pagination",
  })
  async getAllCandidates(
    @Headers() header: BaseHeaderDTO,
    @Query() query: FindAllCandidatesQueryDto,
    @Res() res: Response,
  ) {
    return await this.recruitmentService.findAllCandidates(header, query, res);
  }

  @Put("/candidate/:id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: "Update candidate basic information",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Candidate updated successfully",
    type: CandidateResponseDTO,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Candidate not found",
  })
  async updateCandidate(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateCandidateDto: UpdateCandidateDTO,
    @Res() res: Response,
  ) {
    return await this.recruitmentService.updateCandidate(
      id,
      updateCandidateDto,
      res,
    );
  }

  @Put("/application/:id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: "Update application information and status",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Application updated successfully",
    type: ApplicationResponseDTO,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Application not found",
  })
  async updateApplication(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateApplicationDto: UpdateApplicationDTO,
    @Res() res: Response,
  ) {
    return await this.recruitmentService.updateApplication(
      id,
      updateApplicationDto,
      res,
    );
  }

  @Put("/candidate/:id/status")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: "Update candidate recruitment status and create pipeline history",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Candidate status updated successfully",
    type: CandidateResponseDTO,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Candidate or application not found",
  })
  async updateCandidateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateCandidateStatusDTO,
    @Req() request: any,
    @Res() res: Response,
  ) {
    return await this.recruitmentService.updateCandidateStatus(
      id,
      updateStatusDto,
      request.user.personnelCode,
      res,
    );
  }

  @Get("/pipeline-stages")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: "Get all recruitment pipeline stages (no pagination)",
    description: "Returns all active pipeline stages ordered by display order",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Pipeline stages retrieved successfully",
    type: [PipelineStageDTO],
  })
  async getAllPipelineStages(@Res() res: Response) {
    const stages = await this.recruitmentService.getAllPipelineStages();
    return res.status(HttpStatus.OK).json({
      message: "Pipeline stages retrieved successfully",
      data: stages,
    });
  }

  @Get("/candidates/grouped-by-status")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: "Get all candidates grouped by status (no pagination)",
    description:
      "Returns all candidates grouped by their recruitment pipeline status. Supports filtering by position and searching by name or email.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Candidates grouped by status retrieved successfully",
    schema: {
      type: "object",
      properties: {
        message: { type: "string" },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              status: { type: "string", example: "received_cv" },
              statusName: { type: "string", example: "CV Đã Nhận" },
              displayOrder: { type: "number", example: 1 },
              count: { type: "number", example: 15 },
              candidates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                    candidateId: { type: "number" },
                    fullName: { type: "string" },
                    phone: { type: "string" },
                    email: { type: "string" },
                    gender: { type: "string" },
                    universitySchool: { type: "string" },
                    position: { type: "string" },
                    level: { type: "string" },
                    department: { type: "string" },
                    source: { type: "string" },
                    appliedDate: { type: "string" },
                    note: { type: "string" },
                    createdAt: { type: "string" },
                    updatedAt: { type: "string" },
                  },
                },
              },
            },
          },
        },
        totalCandidates: { type: "number", example: 45 },
      },
    },
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
      message: "Candidates grouped by status retrieved successfully",
      data: groupedData,
      totalCandidates,
    });
  }

  @Get("/candidates/status-summary")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: "Get candidate count per pipeline status",
    description:
      "Returns a list of all active pipeline stages with the number of candidates in each stage. Supports the same filters as the grouped-by-status endpoint.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Status summary retrieved successfully",
    schema: {
      type: "object",
      properties: {
        message: { type: "string" },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              status: { type: "string", example: "received_cv" },
              statusName: { type: "string", example: "CV Đã Nhận" },
              displayOrder: { type: "number", example: 1 },
              count: { type: "number", example: 15 },
            },
          },
        },
      },
    },
  })
  async getStatusSummary(
    @Query() query: GroupedCandidatesQueryDto,
    @Res() res: Response,
  ) {
    const data = await this.recruitmentService.getStatusSummary(query);
    return res.status(HttpStatus.OK).json({
      message: "Status summary retrieved successfully",
      data,
    });
  }

  @Get("/candidates/paged")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: "Get paginated candidate list with optional status filter",
    description:
      "Returns a paginated list of candidates. Supports filtering by status, position, search, date range, and PIC. Pagination uses page/size/active/direction headers.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Paged candidates retrieved successfully",
  })
  async getCandidatesPaged(
    @Headers() header: BaseHeaderDTO,
    @Query() query: GetCandidatesPagedQueryDto,
    @Res() res: Response,
  ) {
    return await this.recruitmentService.getCandidatesPaged(header, query, res);
  }

  @Post("/candidate/:id/send-email")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @UseInterceptors(FilesInterceptor("attachments", 10, multerConfig)) // Max 10 files with UTF-8 encoding
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Send an email to the candidate",
    description: "Send email with optional file attachments (max 10 files)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Email sent successfully",
  })
  async sendTestEmail(
    @Param("id", ParseIntPipe) id: number,
    @Body() mailData: MailRecruitmentDTO,
    @UploadedFiles() files: any[],
    @Res() res: Response,
  ) {
    return await this.recruitmentService.sendEmails(id, mailData, files, res);
  }

  @Get("/statistics/positions")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: "Get statistics of all positions with application count",
    description:
      "Returns a list of distinct positions and the number of CVs/applications for each position. Results are ordered by count (descending) and then by position name.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Position statistics retrieved successfully",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Position statistics retrieved successfully",
        },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              position: { type: "string", example: "Backend Developer" },
              count: { type: "number", example: 25 },
            },
          },
        },
        totalApplications: { type: "number", example: 150 },
      },
    },
  })
  async getPositionStatistics(@Res() res: Response) {
    const result = await this.recruitmentService.getPositionStatistics();

    return res.status(HttpStatus.OK).json({
      message: "Position statistics retrieved successfully",
      data: result.positions,
      totalApplications: result.totalApplications,
    });
  }

  @Post("/candidate/check")
  @ApiOperation({
    summary: "Check if candidate exists by email or phone",
    description:
      "Check if a candidate exists in the system by email or phone number. Returns candidate information and all positions they have applied for.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Candidate information retrieved successfully",
    type: CheckCandidateResponseDTO,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Either email or phone must be provided",
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
        ? "Candidate found in system"
        : "Candidate not found",
      data: result,
    });
  }
}
