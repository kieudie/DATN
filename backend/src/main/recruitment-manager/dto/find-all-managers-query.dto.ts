import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsOptional, IsString } from "class-validator";

@Expose()
export class FindAllManagersQueryDto {
  @ApiProperty({
    example: "Nguyễn",
    required: false,
    description: "Tìm kiếm theo tên hoặc email",
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    example: 1,
    required: false,
    description: "Lọc theo is_cc (0 hoặc 1)",
    type: Number,
  })
  @IsOptional()
  isCc?: number;

  @ApiProperty({
    example: "Engineering",
    required: false,
    description: "Lọc theo phòng ban",
  })
  @IsString()
  @IsOptional()
  departmentName?: string;

  @ApiProperty({
    example: "Backend Development",
    required: false,
    description: "Lọc theo chuyên môn",
  })
  @IsString()
  @IsOptional()
  specialization?: string;
}
