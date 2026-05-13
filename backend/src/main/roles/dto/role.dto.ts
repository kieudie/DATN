import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

/**
 * A Role DTO object.
 */
@Expose()
export class RoleDto {
  @ApiProperty({ description: 'Role id' })
  @IsNumber()
  id!: number;

  @ApiProperty({ description: 'Role code' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Role name' })
  @IsString()
  name!: string;
}