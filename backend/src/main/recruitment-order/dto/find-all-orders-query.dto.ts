import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RecruitmentOrderStatus } from '../../../entities/recruitment-order';

export class FindAllOrdersQueryDTO {
  @ApiProperty({
    example: 'manager@example.com',
    required: false,
    description: 'Lọc theo email người tạo',
  })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: 'Backend',
    required: false,
    description: 'Lọc theo team',
  })
  @IsString()
  @IsOptional()
  team?: string;

  @ApiProperty({
    example: RecruitmentOrderStatus.PENDING,
    required: false,
    description: 'Lọc theo status',
    enum: RecruitmentOrderStatus,
  })
  @IsEnum(RecruitmentOrderStatus)
  @IsOptional()
  status?: RecruitmentOrderStatus;

  @ApiProperty({
    example: 'Backend',
    required: false,
    description: 'Tìm kiếm theo position, hr_level hoặc created_by',
  })
  @IsString()
  @IsOptional()
  search?: string;
}

export class FindAllOrdersByRecruiterQueryDTO {
  @ApiProperty({
    example: 'Backend',
    required: false,
    description: 'Lọc theo team',
  })
  @IsString()
  @IsOptional()
  team?: string;

  @ApiProperty({
    example: 'Backend Developer',
    required: false,
    description: 'Lọc theo vị trí',
  })
  @IsString()
  @IsOptional()
  position?: string;
}