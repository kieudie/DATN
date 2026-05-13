import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class PipelineStageDTO {
  @ApiProperty({ example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ example: 'Tiếp nhận hồ sơ' })
  @Expose()
  name: string;

  @ApiProperty({ example: 'received_cv' })
  @Expose()
  code: string;

  @ApiProperty({ example: 1 })
  @Expose()
  order: number;

  @ApiProperty({ example: 1 })
  @Expose()
  isActive: number;
}