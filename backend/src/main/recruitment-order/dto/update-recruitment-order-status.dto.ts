import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RecruitmentOrderStatus } from '../../../entities/recruitment-order';

export class UpdateRecruitmentOrderStatusDTO {
  @ApiProperty({
    example: RecruitmentOrderStatus.INPROGRESS,
    required: true,
    description: 'Trạng thái mới của order',
    enum: RecruitmentOrderStatus,
  })
  @IsNotEmpty()
  @IsEnum(RecruitmentOrderStatus)
  status: RecruitmentOrderStatus;

  @ApiProperty({
    example: 'HR01',
    required: false,
    description: 'Người xử lý order',
  })
  @IsString()
  @IsOptional()
  pic?: string;
}