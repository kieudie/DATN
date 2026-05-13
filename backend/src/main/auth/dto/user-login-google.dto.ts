import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

/**
 * A DTO representing a google login user.
 */
export class UserLoginGoogleDTO {
  @ApiProperty({
    description: 'Google email',
    example: 'hr@admin.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  readonly email?: string;

  @ApiProperty({
    description: 'Google id token',
    example: 'google_id_token',
  })
  @IsString()
  readonly idToken!: string;
}