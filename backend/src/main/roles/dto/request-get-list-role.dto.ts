import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RequestGetListRole {
  @ApiProperty({
    example: 'HR',
    description: 'Role code',
    required: false,
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({
    example: 'HR',
    description: 'Role name',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;
}