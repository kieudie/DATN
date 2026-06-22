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
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Response } from "express";
import { AuthGuard, Roles, RolesGuard, RoleType } from "../../security";
import { BaseHeaderDTO } from "../base/base.header";
import { CreateCandidateReviewDTO } from "./dto/create-candidate-review.dto";
import { CreateManagerDTO } from "./dto/create-manager.dto";
import { FindAllCandidatesByManagerQueryDTO } from "./dto/find-all-candidates-by-manager-query.dto";
import { FindAllManagersQueryDto } from "./dto/find-all-managers-query.dto";
import { GetMyCandidatesQueryDto } from "./dto/get-my-candidates-query.dto";
import { ManagerResponseDTO } from "./dto/manager-response.dto";
import { UpdateCandidateReviewStatusDTO } from "./dto/update-candaidate-review-status.dto";
import { RecruitmentManagerService } from "./recruitment-manager.service";

@Controller("api/recruitment-manager")
@ApiTags("Recruitment Manager Management")
export class RecruitmentManagerController {
  constructor(
    private readonly recruitmentManagerService: RecruitmentManagerService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: "Upsert a recruitment manager (create or update by email)",
    description:
      "Create a new manager or update existing manager based on email. If email exists, update name, is_cc, and department_name.",
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Manager created/updated successfully",
    type: ManagerResponseDTO,
  })
  async upsertManager(
    @Body() createManagerDto: CreateManagerDTO,
    @Res() res: Response,
  ) {
    return await this.recruitmentManagerService.upsertManager(
      createManagerDto,
      res,
    );
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT, RoleType.RECRUITMENT_MANAGER)
  @ApiOperation({
    summary: "Get all recruitment managers with filters and pagination",
    description:
      "Retrieve all managers with optional filters: search (name or email), is_cc, department_name. Supports pagination and sorting.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Managers retrieved successfully",
    schema: {
      type: "object",
      properties: {
        message: { type: "string" },
        data: {
          type: "array",
          items: { $ref: "#/components/schemas/ManagerResponseDTO" },
        },
        total: { type: "number" },
        page: { type: "number" },
        size: { type: "number" },
      },
    },
  })
  async getAllManagers(
    @Headers() header: BaseHeaderDTO,
    @Query() query: FindAllManagersQueryDto,
    @Res() res: Response,
  ) {
    return await this.recruitmentManagerService.getAllManagers(
      header,
      query,
      res,
    );
  }

@Get("/candidate")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(RoleType.RECRUITMENT_MANAGER, RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: "Get all candidates associated with managers",
  })
  async getCandidatesByManagersGroupedByStatus(
    @Query() query: FindAllCandidatesByManagerQueryDTO,
    @Res() res: Response,
  ) {
    return await this.recruitmentManagerService.getCandidatesByManagersGroupedByStatus(
      query,
      res,
    );
  }

  @Get("/my-candidate")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGER)
  @ApiOperation({
    summary: "Get candidates belonging to the current manager",
    description:
      "Retrieve candidates associated with the logged-in manager based on department and specialization. If manager has is_techlead, they can see all candidates matching that position regardless of department.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Candidates retrieved successfully",
  })
  async getMyCandidates(
    @Headers() header: BaseHeaderDTO,
    @Query() query: GetMyCandidatesQueryDto,
    @Req() request: any,
    @Res() res: Response,
  ) {
    return await this.recruitmentManagerService.getMyCandidates(
      request.user.email,
      header,
      query,
      res,
    );
  }

  @Get(":id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: "Get recruitment manager by ID",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Manager retrieved successfully",
    type: ManagerResponseDTO,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Manager not found",
  })
  async getManagerById(
    @Param("id", ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    return await this.recruitmentManagerService.getManagerById(id, res);
  }

  @Post("/candidate/review")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGER)
  @ApiOperation({
    summary: "Create a candidate review by manager",
    description:
      "Create a review record for a candidate application. If status is APPROVE, the candidate will be automatically moved to DEPARTMENT_REVIEW status.",
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Candidate review created successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Application not found",
  })
  async createCandidateReview(
    @Body() createReviewDto: CreateCandidateReviewDTO,
    @Req() request: any,
  ) {
    return await this.recruitmentManagerService.createCandidateReview(
      createReviewDto,
      request.user.email,
    );
  }

  @Put("/candidate/review/status")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGER)
  @ApiOperation({
    summary: "Update status of the latest candidate review by application ID",
    description:
      "Update the status (and optionally note) of the latest review record for a candidate application.",
  })
  @ApiBody({
    type: UpdateCandidateReviewStatusDTO,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Candidate review status updated successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "No review found for the given application ID",
  })
  async updateStatusLatestCandidateReview(
    @Query("application_id", ParseIntPipe) applicationId: number,
    @Body() body: UpdateCandidateReviewStatusDTO,
    @Req() request: any,
  ) {
    return await this.recruitmentManagerService.updateStatusLatestCandidateReview(
      applicationId,
      body,
      request.user.email,
    );
  }
}
