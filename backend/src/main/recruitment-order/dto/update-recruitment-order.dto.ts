import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsDateString, IsOptional, IsString } from 'class-validator';

@Expose()
export class UpdateRecruitmentOrderDTO {
  @ApiProperty({ example: 'Backend', required: false, description: 'Team' })
  @IsString()
  @IsOptional()
  team?: string;

  @ApiProperty({
    example: 'Backend Developer',
    required: false,
    description: 'Vị trí tuyển dụng',
  })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiProperty({
    example: 'Junior',
    required: false,
    description: 'HR Level',
  })
  @IsString()
  @IsOptional()
  hrLevel?: string;

  @ApiProperty({ required: false, description: 'Ghi chú' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({ example: '3', required: false, description: 'Số lượng' })
  @IsString()
  @IsOptional()
  quantity?: string;

  @ApiProperty({
    example: '2026-06-30',
    required: false,
    description: 'Ngày hết hạn',
  })
  @IsDateString()
  @IsOptional()
  expiredDate?: string;

  @ApiProperty({
    example: '2026-05-20',
    required: false,
    description: 'Ngày bắt đầu',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    example: 'manager@example.com',
    required: false,
    description: 'Email người tạo',
  })
  @IsString()
  @IsOptional()
  createdBy?: string;

  @ApiProperty({
    example: 'HR01',
    required: false,
    description: 'Người phụ trách',
  })
  @IsString()
  @IsOptional()
  pic?: string;
}