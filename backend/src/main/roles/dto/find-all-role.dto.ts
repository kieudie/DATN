import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { RoleDto } from './role.dto';

export class FindAllRoleAccountDTO {
  @ApiProperty({
    description: 'data',
    required: false,
    isArray: true,
    type: [RoleDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => RoleDto)
  data!: RoleDto[];
}