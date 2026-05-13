import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional } from 'class-validator';

/**
 * Request get list user DTO.
 */
export class RequestGetListUserDTO {
  @ApiProperty({
    example: 'hr@admin.com',
    description: 'Filter by email',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}