import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { RoleDto } from '../../roles/dto/role.dto';

/**
 * A DTO representing a login user.
 */
@Expose()
export class UserLoginResponse {
  @ApiProperty({ description: 'User id' })
  @IsNumber()
  @Expose({ name: 'user_id' })
  user_id!: number;

  @ApiProperty({ description: 'User full name' })
  @IsString()
  @Expose({ name: 'full_name' })
  full_name!: string;

  @ApiProperty({ description: 'User login name' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'User phone' })
  @IsOptional()
  @IsString()
  phone!: string | null;

  @ApiProperty({ description: 'User access token' })
  @IsString()
  @Expose({ name: 'access_token' })
  access_token!: string;

  @ApiProperty({ description: 'User roles' })
  @IsArray()
  roles!: string[];

  @ApiProperty({ description: 'Role' })
  @IsArray()
  role!: RoleDto[];
}