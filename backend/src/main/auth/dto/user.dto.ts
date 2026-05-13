import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import {
    IsArray,
    IsEmail,
    IsNumber,
    IsOptional,
    IsString,
} from 'class-validator';
import { RoleDto } from '../../roles/dto/role.dto';

/**
 * An User DTO object.
 */
@Expose()
export class UserDTO {
  @ApiProperty({
    description: 'User id',
    required: true,
  })
  @IsNumber()
  @Expose({ name: 'user_id' })
  user_id!: number;

  @ApiProperty({
    description: 'User full name',
    required: true,
  })
  @IsString()
  @Expose({ name: 'full_name' })
  full_name!: string;

  @ApiProperty({
    description: 'User email',
    required: true,
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'User phone',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone!: string | null;

  @ApiProperty({
    description: 'User activation',
    required: true,
  })
  @IsNumber()
  @Expose({ name: 'is_active' })
  is_active!: number;

  @Exclude()
  password_hash!: string;

  @ApiProperty({
    isArray: true,
    description: 'Array of role codes',
    required: true,
  })
  @IsArray()
  roles!: string[];

  @ApiProperty({
    isArray: true,
    description: 'Role detail',
    required: true,
  })
  @IsArray()
  role!: RoleDto[];
}