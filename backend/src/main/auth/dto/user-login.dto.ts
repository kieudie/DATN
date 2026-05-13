import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

/**
 * A DTO representing a login user.
 */
export class UserLoginDTO {
  @ApiProperty({ description: 'User password', example: '123456' })
  @IsString()
  readonly password!: string;

  @ApiProperty({ description: 'User login name', example: 'hr@admin.com' })
  @IsEmail()
  readonly email!: string;
}