import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class GetMyCandidatesQueryDto {
  @ApiProperty({
    required: false,
    description: "Lọc theo tên ứng viên",
    example: "Nguyen Van A",
  })
  @IsString()
  @IsOptional()
  fullname?: string;

  @ApiProperty({
    required: false,
    description: "Ngày bắt đầu lọc theo applied_date (YYYY-MM-DD)",
    example: "2024-01-01",
  })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    required: false,
    description: "Ngày kết thúc lọc theo applied_date (YYYY-MM-DD)",
    example: "2024-12-31",
  })
  @IsString()
  @IsOptional()
  endDate?: string;
}
