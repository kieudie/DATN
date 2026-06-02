import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
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
import { CreateCalendarEventDto } from "./dto/create-calendar-event.dto";
import { RecruitmentCalendarService } from "./recruitment-calendar.service";

@Controller("api/recruitment/calendar")
@ApiTags("Recruitment Calendar")
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class RecruitmentCalendarController {
  constructor(
    private readonly recruitmentCalendarService: RecruitmentCalendarService,
  ) {}

  @Post("events")
  @HttpCode(HttpStatus.OK)
  @Roles(RoleType.RECRUITMENT_MANAGEMENT, RoleType.RECRUITMENT_MANAGER)
  @ApiOperation({ summary: "Create interview schedule on Google Calendar" })
  @ApiResponse({ status: 200, description: "Event created successfully" })
  async createEvent(@Body() dto: CreateCalendarEventDto, @Res() res: Response) {
    return await this.recruitmentCalendarService.createEvent(dto, res);
  }
}
