import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsISO8601, IsOptional, IsString } from "class-validator";

export class CreateCalendarEventDto {
  @ApiProperty({
    example: "Interview - Backend Developer",
    description: "Tiêu đề sự kiện",
  })
  @IsString()
  summary: string;

  @ApiProperty({
    example: "2026-03-01T09:30:00+07:00",
    description: "Thời gian bắt đầu (ISO 8601)",
  })
  @IsISO8601()
  startDateTime: string;

  @ApiProperty({
    example: "2026-03-01T10:30:00+07:00",
    description: "Thời gian kết thúc (ISO 8601)",
  })
  @IsISO8601()
  endDateTime: string;

  @ApiProperty({
    example: ["candidate@gmail.com", "interviewer@company.com"],
    description: "Danh sách email người tham dự",
    isArray: true,
  })
  @IsEmail({}, { each: true })
  attendees: string[];

  @ApiProperty({ example: "Phòng họp A, Tầng 3", required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    example: "Vui lòng chuẩn bị portfolio trước buổi phỏng vấn.",
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
