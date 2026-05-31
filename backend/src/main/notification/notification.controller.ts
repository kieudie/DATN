import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthGuard } from "../../security";
import { SaveSubDto } from "./dto/notification.dto";
import { NotificationService } from "./notification.service";

@Controller("api/notification")
@ApiTags("Notification")
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post("sub")
  @ApiOperation({ summary: "Subscribe to push notifications" })
  @ApiResponse({ status: HttpStatus.OK })
  async subscribe(@Body() dto: SaveSubDto, @Req() request: any) {
    const personnelCode: number = request.user?.personnelCode;
    return this.notificationService.saveSubscription(personnelCode, dto);
  }

  @Get(":personnelCode")
  @ApiOperation({ summary: "Get notifications for a personnel" })
  @ApiResponse({ status: HttpStatus.OK })
  async findAll(@Param("personnelCode") personnelCode: string) {
    return this.notificationService.findByPersonnelCode(+personnelCode);
  }

  @Patch(":id/read/:personnelCode")
  @ApiOperation({ summary: "Mark a notification as read" })
  async markAsRead(
    @Param("id") id: string,
    @Param("personnelCode") personnelCode: string,
  ) {
    return this.notificationService.markAsRead(+id, +personnelCode);
  }

  @Patch("read-all/:personnelCode")
  @ApiOperation({ summary: "Mark all notifications as read for a personnel" })
  async markAllAsRead(@Param("personnelCode") personnelCode: string) {
    return this.notificationService.markAllAsRead(+personnelCode);
  }
}
