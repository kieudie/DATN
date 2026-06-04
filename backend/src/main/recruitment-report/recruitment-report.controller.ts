import {
  Controller,
  Get,
  HttpStatus,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Response } from "express";
import { AuthGuard, Roles, RolesGuard, RoleType } from "../../security";
import { QueryReportByPositionDTO } from "./dto/query-report-by-position.dto";
import { QueryReportOverviewDTO } from "./dto/query-report-overview.dto";
import { RecruitmentReportService } from "./recruitment-report.service";

@Controller("api/recruitment/report")
@ApiTags("Recruitment Report")
export class RecruitmentReportController {
  constructor(
    private readonly recruitmentReportService: RecruitmentReportService,
  ) {}

  @Get("overview")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({ summary: "Báo cáo tổng quan: số hồ sơ theo từng pipeline" })
  @ApiResponse({ status: HttpStatus.OK })
  async getOverview(
    @Query() query: QueryReportOverviewDTO,
    @Res() res: Response,
  ) {
    return this.recruitmentReportService.getOverview(query, res);
  }

  /*@Get("overview-realtime")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: "Báo cáo tổng quan realtime: số hồ sơ theo từng pipeline",
  })
  @ApiResponse({ status: HttpStatus.OK })
  async getOverviewRealtime(
    @Query() query: QueryReportOverviewDTO,
    @Res() res: Response,
  ) {
    return this.recruitmentReportService.getOverviewRealtime(query, res);
  }
*/
  @Get("by-position")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary:
      "Báo cáo hiệu quả tuyển dụng theo vị trí: thống kê số ứng viên qua từng bước pipeline",
  })
  @ApiResponse({ status: HttpStatus.OK })
  async getByPosition(
    @Query() query: QueryReportByPositionDTO,
    @Res() res: Response,
  ) {
    return this.recruitmentReportService.getByPosition(query, res);
  }

  @Get("by-level")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary:
      "Báo cáo hiệu quả tuyển dụng theo level: thống kê số ứng viên qua từng bước pipeline",
  })
  @ApiResponse({ status: HttpStatus.OK })
  async getByLevel(
    @Query() query: QueryReportByPositionDTO,
    @Res() res: Response,
  ) {
    return this.recruitmentReportService.getByLevel(query, res);
  }

  @Get("by-department")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary:
      "Báo cáo hiệu quả tuyển dụng theo phòng ban: thống kê số ứng viên qua từng bước pipeline",
  })
  @ApiResponse({ status: HttpStatus.OK })
  async getByDepartment(
    @Query() query: QueryReportByPositionDTO,
    @Res() res: Response,
  ) {
    return this.recruitmentReportService.getByDepartment(query, res);
  }

  @Get("by-source")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary:
      "Báo cáo hiệu quả tuyển dụng theo nguồn tuyển dụng: thống kê số ứng viên qua từng bước pipeline",
  })
  @ApiResponse({ status: HttpStatus.OK })
  async getBySource(
    @Query() query: QueryReportByPositionDTO,
    @Res() res: Response,
  ) {
    return this.recruitmentReportService.getBySource(query, res);
  }

  /*@Get("by-university-school")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary:
      "Báo cáo hiệu quả tuyển dụng theo trường đại học: thống kê số ứng viên qua từng bước pipeline",
  })
  @ApiResponse({ status: HttpStatus.OK })
  async getByUniversitySchool(
    @Query() query: QueryReportByPositionDTO,
    @Res() res: Response,
  ) {
    return this.recruitmentReportService.getByUniversitySchool(query, res);
  }
*/
  @Get("by-recruiter")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary:
      "Báo cáo hiệu quả tuyển dụng theo nhân viên tuyển dụng: thống kê số ứng viên qua từng bước pipeline",
  })
  @ApiResponse({ status: HttpStatus.OK })
  async getByRecruiter(
    @Query() query: QueryReportByPositionDTO,
    @Res() res: Response,
  ) {
    return this.recruitmentReportService.getByRecruiter(query, res);
  }

  @Get("time-to-hire")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary:
      "Thời gian trung bình từ ứng tuyển đến nhận việc (theo vị trí, phòng ban)",
  })
  @ApiResponse({ status: HttpStatus.OK })
  async getTimeToHire(
    @Query() query: QueryReportByPositionDTO,
    @Res() res: Response,
  ) {
    return this.recruitmentReportService.getTimeToHire(query, res);
  }

  @Get("time-to-fill")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary:
      "Thời gian trung bình từ tạo order đến có ứng viên nhận việc (theo phòng ban, theo tháng)",
  })
  @ApiResponse({ status: HttpStatus.OK })
  async getTimeToFill(
    @Query() query: QueryReportByPositionDTO,
    @Res() res: Response,
  ) {
    return this.recruitmentReportService.getTimeToFill(query, res);
  }

  @Get("time-in-stage")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT)
  @ApiOperation({
    summary: "Thời gian trung bình lưu hồ sơ tại mỗi bước pipeline",
  })
  @ApiResponse({ status: HttpStatus.OK })
  async getTimeInStage(
    @Query() query: QueryReportByPositionDTO,
    @Res() res: Response,
  ) {
    return this.recruitmentReportService.getTimeInStage(query, res);
  }
}
