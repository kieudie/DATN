import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsOptional, IsString } from "class-validator";

@Expose()
export class GroupedCandidatesQueryDto {
  @ApiProperty({
    required: false,
    description: "Filter by position (vị trí tuyển dụng)",
    example: "Backend Developer",
  })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiProperty({
    required: false,
    description: "Search by candidate name or email",
    example: "john@example.com",
  })
  @IsString()
  @IsOptional()
  search?: string;

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

  @ApiProperty({
    required: false,
    description: "Lọc theo tên nhân sự phụ trách (creatorInfo.personnelName)",
    example: "Nguyễn Văn A",
  })
  @IsString()
  @IsOptional()
  pic?: string;
}
